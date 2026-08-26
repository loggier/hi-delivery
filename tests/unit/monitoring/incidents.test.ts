import { describe, expect, it } from 'vitest';

import {
  IncidentConflictError,
  reconcileMonitoringIncidents,
  type IncidentStore,
} from '@/lib/monitoring/incident-repository';
import type { DetectedCondition, MonitoringIncident } from '@/lib/monitoring/types';

const now = '2026-08-25T12:00:00.000Z';

function condition(overrides: Partial<DetectedCondition> = {}): DetectedCondition {
  return {
    key: 'unassigned:order-1',
    type: 'unassigned',
    priority: 'P1',
    orderId: 'order-1',
    riderId: null,
    detectedAt: now,
    metadata: { attempts: 2 },
    ...overrides,
  };
}

function incident(overrides: Partial<MonitoringIncident> = {}): MonitoringIncident {
  return {
    id: 1,
    conditionKey: 'unassigned:order-1',
    type: 'unassigned',
    priority: 'P1',
    status: 'open',
    orderId: 'order-1',
    riderId: null,
    firstDetectedAt: '2026-08-25T11:00:00.000Z',
    lastDetectedAt: '2026-08-25T11:00:00.000Z',
    attendingAt: null,
    resolvedAt: null,
    metadata: {},
    ...overrides,
  };
}

class MemoryIncidentStore implements IncidentStore {
  rows: MonitoringIncident[];
  calls: string[] = [];
  conflictKeys = new Set<string>();
  private nextId: number;

  constructor(rows: MonitoringIncident[] = []) {
    this.rows = rows.map((row) => ({ ...row, metadata: { ...row.metadata } }));
    this.nextId = Math.max(0, ...rows.map((row) => row.id)) + 1;
  }

  async listActive(): Promise<MonitoringIncident[]> {
    this.calls.push('list');
    return this.rows.filter((row) => row.status !== 'resolved').map((row) => ({ ...row }));
  }

  async findActiveByConditionKey(key: string): Promise<MonitoringIncident | null> {
    this.calls.push(`find:${key}`);
    return this.rows.find((row) => row.conditionKey === key && row.status !== 'resolved') ?? null;
  }

  async insertCondition(value: DetectedCondition, timestamp: string): Promise<void> {
    this.calls.push(`insert:${value.key}`);
    if (this.conflictKeys.delete(value.key)) {
      this.rows.push(incident({ id: this.nextId++, conditionKey: value.key }));
      throw new IncidentConflictError();
    }
    this.rows.push(
      incident({
        id: this.nextId++,
        conditionKey: value.key,
        type: value.type,
        priority: value.priority,
        orderId: value.orderId,
        riderId: value.riderId,
        firstDetectedAt: timestamp,
        lastDetectedAt: timestamp,
        metadata: { ...value.metadata },
      }),
    );
  }

  async touchCondition(id: number, value: DetectedCondition, timestamp: string): Promise<void> {
    this.calls.push(`touch:${id}`);
    this.rows = this.rows.map((row) =>
      row.id === id
        ? {
            ...row,
            type: value.type,
            priority: value.priority,
            lastDetectedAt: timestamp,
            metadata: { ...value.metadata },
          }
        : row,
    );
  }

  async resolveCondition(id: number, timestamp: string): Promise<void> {
    this.calls.push(`resolve:${id}`);
    this.rows = this.rows.map((row) =>
      row.id === id
        ? { ...row, status: 'resolved', resolvedAt: timestamp }
        : row,
    );
  }
}

describe('reconcileMonitoringIncidents', () => {
  it('inserts a new active incident for a newly detected condition', async () => {
    const store = new MemoryIncidentStore();

    const result = await reconcileMonitoringIncidents(store, [condition()], now);

    expect(result).toMatchObject([
      { conditionKey: 'unassigned:order-1', status: 'open', firstDetectedAt: now },
    ]);
    expect(store.calls).toEqual(['list', 'insert:unassigned:order-1', 'list']);
  });

  it('touches an attending incident without resetting its cycle or status', async () => {
    const attending = incident({
      status: 'attending',
      attendingAt: '2026-08-25T11:30:00.000Z',
      firstDetectedAt: '2026-08-25T10:00:00.000Z',
    });
    const store = new MemoryIncidentStore([attending]);

    const [result] = await reconcileMonitoringIncidents(
      store,
      [condition({ priority: 'P2', metadata: { attempts: 4 } })],
      now,
    );

    expect(result).toMatchObject({
      status: 'attending',
      firstDetectedAt: '2026-08-25T10:00:00.000Z',
      lastDetectedAt: now,
      priority: 'P2',
      metadata: { attempts: 4 },
    });
  });

  it('resolves active incidents whose conditions cleared', async () => {
    const store = new MemoryIncidentStore([incident()]);

    const result = await reconcileMonitoringIncidents(store, [], now);

    expect(result).toEqual([]);
    expect(store.rows[0]).toMatchObject({ status: 'resolved', resolvedAt: now });
    expect(store.calls).toEqual(['list', 'resolve:1', 'list']);
  });

  it('starts a new cycle instead of changing resolved history', async () => {
    const resolved = incident({
      status: 'resolved',
      resolvedAt: '2026-08-25T11:30:00.000Z',
    });
    const store = new MemoryIncidentStore([resolved]);

    await reconcileMonitoringIncidents(store, [condition()], now);

    expect(store.rows).toHaveLength(2);
    expect(store.rows[0]).toEqual(resolved);
    expect(store.rows[1]).toMatchObject({ status: 'open', firstDetectedAt: now });
  });

  it('deduplicates conditions by key before inserts or touches', async () => {
    const insertStore = new MemoryIncidentStore();
    const touchStore = new MemoryIncidentStore([incident()]);
    const duplicates = [condition(), condition({ priority: 'P2' })];

    await reconcileMonitoringIncidents(insertStore, duplicates, now);
    await reconcileMonitoringIncidents(touchStore, duplicates, now);

    expect(insertStore.calls.filter((call) => call.startsWith('insert:'))).toHaveLength(1);
    expect(touchStore.calls.filter((call) => call.startsWith('touch:'))).toHaveLength(1);
    expect(insertStore.rows[0].priority).toBe('P2');
    expect(touchStore.rows[0].priority).toBe('P2');
  });

  it('recovers a unique race by finding and touching the concurrent active row', async () => {
    const store = new MemoryIncidentStore();
    store.conflictKeys.add('unassigned:order-1');

    await reconcileMonitoringIncidents(store, [condition({ priority: 'P2' })], now);

    expect(store.calls).toContain('find:unassigned:order-1');
    expect(store.calls).toContain('touch:1');
    expect(store.rows[0]).toMatchObject({ priority: 'P2', lastDetectedAt: now });
  });

  it('returns P1, P2, P3 incidents and oldest cycles first within priority', async () => {
    const store = new MemoryIncidentStore([
      incident({ id: 1, conditionKey: 'p3', priority: 'P3' }),
      incident({ id: 2, conditionKey: 'p1-new', firstDetectedAt: '2026-08-25T11:30:00.000Z' }),
      incident({ id: 3, conditionKey: 'p2', priority: 'P2' }),
      incident({ id: 4, conditionKey: 'p1-old', firstDetectedAt: '2026-08-25T10:30:00.000Z' }),
    ]);

    const conditions = store.rows.map((row) =>
      condition({ key: row.conditionKey, priority: row.priority }),
    );
    const result = await reconcileMonitoringIncidents(store, conditions, now);

    expect(result.map((row) => row.conditionKey)).toEqual(['p1-old', 'p1-new', 'p2', 'p3']);
  });

  it.each(['invalid', '2026-02-30T12:00:00.000Z'])(
    'rejects invalid injected timestamp %s before reading or mutating the store',
    async (invalidTimestamp) => {
      const store = new MemoryIncidentStore();

      await expect(
        reconcileMonitoringIncidents(store, [condition()], invalidTimestamp),
      ).rejects.toThrow('Invalid monitoring reconciliation timestamp');
      expect(store.calls).toEqual([]);
    },
  );
});
