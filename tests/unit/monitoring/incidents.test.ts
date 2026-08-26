import { describe, expect, it } from 'vitest';

import {
  reconcileMonitoringIncidents,
  type IncidentStore,
} from '@/lib/monitoring/incident-repository';
import type {
  DetectedCondition,
  MonitoringConditionType,
  MonitoringIncident,
} from '@/lib/monitoring/types';

const now = '2026-08-25T12:00:00.000Z';
const nowDate = new Date(now);

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
    firstDetectedAt: now,
    lastDetectedAt: now,
    attendingAt: null,
    resolvedAt: null,
    metadata: {},
    ...overrides,
  };
}

type BatchCall = {
  conditions: readonly DetectedCondition[];
  evaluatedTypes: readonly MonitoringConditionType[];
  now: string;
};

class RecordingIncidentStore implements IncidentStore {
  calls: BatchCall[] = [];

  constructor(private readonly result: MonitoringIncident[] = []) {}

  async reconcileBatch(
    conditions: readonly DetectedCondition[],
    evaluatedTypes: readonly MonitoringConditionType[],
    timestamp: string,
  ): Promise<MonitoringIncident[]> {
    this.calls.push({ conditions, evaluatedTypes, now: timestamp });
    return this.result;
  }
}

class LifecycleBatchIncidentStore implements IncidentStore {
  rows: MonitoringIncident[];
  calls = 0;
  private nextId: number;

  constructor(rows: MonitoringIncident[] = []) {
    this.rows = rows.map((row) => ({ ...row, metadata: { ...row.metadata } }));
    this.nextId = Math.max(0, ...rows.map((row) => row.id)) + 1;
  }

  async reconcileBatch(
    conditions: readonly DetectedCondition[],
    evaluatedTypes: readonly MonitoringConditionType[],
    timestamp: string,
  ): Promise<MonitoringIncident[]> {
    this.calls += 1;
    const conditionsByKey = new Map(conditions.map((item) => [item.key, item]));

    for (const condition of conditions) {
      const existing = this.rows.find(
        (row) => row.conditionKey === condition.key && row.status !== 'resolved',
      );
      if (existing !== undefined) {
        existing.lastDetectedAt = timestamp;
        existing.priority = condition.priority;
        existing.metadata = { ...condition.metadata };
      } else {
        this.rows.push(
          incident({
            id: this.nextId++,
            conditionKey: condition.key,
            type: condition.type,
            priority: condition.priority,
            orderId: condition.orderId,
            riderId: condition.riderId,
            firstDetectedAt: timestamp,
            lastDetectedAt: timestamp,
            metadata: { ...condition.metadata },
          }),
        );
      }
    }

    for (const row of this.rows) {
      if (
        row.status !== 'resolved' &&
        evaluatedTypes.includes(row.type) &&
        !conditionsByKey.has(row.conditionKey) &&
        row.lastDetectedAt <= timestamp
      ) {
        row.status = 'resolved';
        row.resolvedAt = timestamp;
      }
    }

    return this.rows.filter((row) => row.status !== 'resolved');
  }
}

describe('reconcileMonitoringIncidents', () => {
  it('uses one batch call for 500 conditions', async () => {
    const store = new RecordingIncidentStore();
    const conditions = Array.from({ length: 500 }, (_, index) =>
      condition({ key: `unassigned:order-${index}`, orderId: `order-${index}` }),
    );

    await reconcileMonitoringIncidents(store, conditions, ['unassigned'], nowDate);

    expect(store.calls).toHaveLength(1);
    expect(store.calls[0].conditions).toHaveLength(500);
    expect(store.calls[0].now).toBe(now);
  });

  it('passes only the explicitly evaluated incident types to the batch store', async () => {
    const store = new RecordingIncidentStore();

    await reconcileMonitoringIncidents(
      store,
      [condition()],
      ['unassigned', 'gps-stale'],
      nowDate,
    );

    expect(store.calls[0].evaluatedTypes).toEqual(['unassigned', 'gps-stale']);
  });

  it('models insert, attending touch, and evaluated-only resolution in one batch fake call', async () => {
    const attending = incident({
      id: 1,
      conditionKey: 'gps-stale:order-1:rider-1',
      type: 'gps-stale',
      status: 'attending',
      attendingAt: '2026-08-25T11:30:00.000Z',
      firstDetectedAt: '2026-08-25T10:00:00.000Z',
    });
    const cleared = incident({ id: 2, conditionKey: 'unassigned:cleared' });
    const disabled = incident({
      id: 3,
      conditionKey: 'irregular-reporting:rider-2',
      type: 'irregular-reporting',
      orderId: null,
      riderId: 'rider-2',
    });
    const store = new LifecycleBatchIncidentStore([attending, cleared, disabled]);

    const result = await reconcileMonitoringIncidents(
      store,
      [
        condition({
          key: attending.conditionKey,
          type: 'gps-stale',
          riderId: 'rider-1',
          priority: 'P2',
        }),
        condition({ key: 'unassigned:new', orderId: 'new' }),
      ],
      ['unassigned', 'gps-stale'],
      nowDate,
    );

    expect(store.calls).toBe(1);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conditionKey: attending.conditionKey,
          status: 'attending',
          firstDetectedAt: '2026-08-25T10:00:00.000Z',
          priority: 'P2',
        }),
        expect.objectContaining({ conditionKey: 'unassigned:new', status: 'open' }),
        expect.objectContaining({
          conditionKey: disabled.conditionKey,
          status: 'open',
        }),
      ]),
    );
    expect(store.rows.find((row) => row.id === cleared.id)?.status).toBe('resolved');
  });

  it.each([
    ['P1 then P2', ['P1', 'P2']],
    ['P2 then P1', ['P2', 'P1']],
  ] as const)('keeps P1 for compatible duplicates in order %s', async (_, priorities) => {
    const store = new RecordingIncidentStore();

    await reconcileMonitoringIncidents(
      store,
      priorities.map((priority) => condition({ priority })),
      ['unassigned'],
      nowDate,
    );

    expect(store.calls[0].conditions).toHaveLength(1);
    expect(store.calls[0].conditions[0].priority).toBe('P1');
  });

  it('rejects duplicate keys with incompatible incident identity before the store call', async () => {
    const store = new RecordingIncidentStore();

    await expect(
      reconcileMonitoringIncidents(
        store,
        [condition(), condition({ type: 'gps-stale', riderId: 'rider-1' })],
        ['unassigned', 'gps-stale'],
        nowDate,
      ),
    ).rejects.toThrow('Incompatible duplicate monitoring condition');
    expect(store.calls).toEqual([]);
  });

  it('sanitizes metadata without mutating the detected condition', async () => {
    const store = new RecordingIncidentStore();
    const detected = condition({
      metadata: {
        attempts: 2,
        coordinates: '19.4326,-99.1332',
        accessToken: 'secret',
        preciseHistory: 'sensitive',
      },
    });
    const originalMetadata = detected.metadata;

    await reconcileMonitoringIncidents(store, [detected], ['unassigned'], nowDate);

    expect(store.calls[0].conditions[0].metadata).toEqual({ attempts: 2 });
    expect(detected.metadata).toBe(originalMetadata);
  });

  it('returns active incidents in priority and oldest-first order', async () => {
    const store = new RecordingIncidentStore([
      incident({ id: 1, conditionKey: 'p3', priority: 'P3' }),
      incident({ id: 2, conditionKey: 'p1-new', firstDetectedAt: '2026-08-25T11:30:00.000Z' }),
      incident({ id: 3, conditionKey: 'p2', priority: 'P2' }),
      incident({ id: 4, conditionKey: 'p1-old', firstDetectedAt: '2026-08-25T10:30:00.000Z' }),
    ]);

    const result = await reconcileMonitoringIncidents(store, [], [], nowDate);

    expect(result.map((row) => row.conditionKey)).toEqual(['p1-old', 'p1-new', 'p2', 'p3']);
  });

  it('rejects invalid evaluated types before calling the store', async () => {
    const store = new RecordingIncidentStore();
    const invalidTypes = ['unassigned', 'not-a-rule'] as readonly MonitoringConditionType[];

    await expect(
      reconcileMonitoringIncidents(store, [], invalidTypes, nowDate),
    ).rejects.toThrow('Invalid evaluated monitoring incident type');
    expect(store.calls).toEqual([]);
  });

  it('rejects an invalid Date before calling the store', async () => {
    const store = new RecordingIncidentStore();

    await expect(
      reconcileMonitoringIncidents(store, [], [], new Date(Number.NaN)),
    ).rejects.toThrow('Invalid monitoring reconciliation timestamp');
    expect(store.calls).toEqual([]);
  });
});
