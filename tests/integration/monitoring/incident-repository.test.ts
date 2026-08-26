import { describe, expect, it } from 'vitest';

import {
  createSupabaseIncidentStore,
  IncidentConflictError,
  reconcileMonitoringIncidents,
} from '@/lib/monitoring/incident-repository';
import type { DetectedCondition } from '@/lib/monitoring/types';

type DbError = { code?: string; message: string };
type DbResult = { data: unknown; error: DbError | null };

class FakeQuery implements PromiseLike<DbResult> {
  constructor(
    private readonly client: FakeSupabase,
    private readonly table: string,
  ) {}

  select(columns: string): this {
    return this.record('select', columns);
  }

  insert(values: Record<string, unknown>): this {
    return this.record('insert', values);
  }

  update(values: Record<string, unknown>): this {
    return this.record('update', values);
  }

  eq(column: string, value: unknown): this {
    return this.record('eq', [column, value]);
  }

  in(column: string, values: readonly unknown[]): this {
    return this.record('in', [column, values]);
  }

  order(column: string, options: { ascending: boolean }): this {
    return this.record('order', [column, options]);
  }

  limit(value: number): this {
    return this.record('limit', value);
  }

  maybeSingle(): this {
    return this.record('maybeSingle', null);
  }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.client.responses.shift() ?? { data: null, error: null }).then(
      onfulfilled,
      onrejected,
    );
  }

  private record(method: string, value: unknown): this {
    this.client.calls.push({ table: this.table, method, value });
    return this;
  }
}

class FakeSupabase {
  calls: Array<{ table: string; method: string; value: unknown }> = [];
  responses: DbResult[] = [];

  from(table: string): FakeQuery {
    return new FakeQuery(this, table);
  }
}

const now = '2026-08-25T12:00:00.000Z';
const detected: DetectedCondition = {
  key: 'gps-stale:order-1:rider-1',
  type: 'gps-stale',
  priority: 'P1',
  orderId: 'order-1',
  riderId: 'rider-1',
  detectedAt: now,
  metadata: {
    attempts: 2,
    coordinates: '19.4326,-99.1332',
    accessToken: 'secret',
    preciseHistory: 'sensitive',
  },
};

const row = {
  id: 7,
  condition_key: detected.key,
  incident_type: detected.type,
  priority: detected.priority,
  status: 'attending',
  order_id: detected.orderId,
  rider_id: detected.riderId,
  first_detected_at: '2026-08-25T11:00:00.000Z',
  last_detected_at: '2026-08-25T11:30:00.000Z',
  attending_at: '2026-08-25T11:10:00.000Z',
  resolved_at: null,
  condition_metadata: { attempts: 1 },
};

describe('Supabase incident store', () => {
  it('lists and maps active rows in priority and age order', async () => {
    const client = new FakeSupabase();
    client.responses.push({ data: [row], error: null });

    const result = await createSupabaseIncidentStore(client).listActive();

    expect(result).toEqual([
      {
        id: 7,
        conditionKey: detected.key,
        type: 'gps-stale',
        priority: 'P1',
        status: 'attending',
        orderId: 'order-1',
        riderId: 'rider-1',
        firstDetectedAt: '2026-08-25T11:00:00.000Z',
        lastDetectedAt: '2026-08-25T11:30:00.000Z',
        attendingAt: '2026-08-25T11:10:00.000Z',
        resolvedAt: null,
        metadata: { attempts: 1 },
      },
    ]);
    expect(client.calls).toEqual(
      expect.arrayContaining([
        { table: 'monitoring_incidents', method: 'in', value: ['status', ['open', 'attending']] },
        { table: 'monitoring_incidents', method: 'order', value: ['priority', { ascending: true }] },
        {
          table: 'monitoring_incidents',
          method: 'order',
          value: ['first_detected_at', { ascending: true }],
        },
      ]),
    );
  });

  it('inserts open cycles with injected timestamps and sanitized cloned metadata', async () => {
    const client = new FakeSupabase();
    client.responses.push({ data: null, error: null });
    const originalMetadata = detected.metadata;

    await createSupabaseIncidentStore(client).insertCondition(detected, now);

    const insert = client.calls.find((call) => call.method === 'insert');
    expect(insert?.value).toEqual({
      condition_key: detected.key,
      incident_type: 'gps-stale',
      priority: 'P1',
      status: 'open',
      order_id: 'order-1',
      rider_id: 'rider-1',
      first_detected_at: now,
      last_detected_at: now,
      condition_metadata: { attempts: 2 },
      created_at: now,
      updated_at: now,
    });
    expect(detected.metadata).toBe(originalMetadata);
  });

  it('touches only active rows without changing status or first detection', async () => {
    const client = new FakeSupabase();
    client.responses.push({ data: null, error: null });

    await createSupabaseIncidentStore(client).touchCondition(7, detected, now);

    const update = client.calls.find((call) => call.method === 'update');
    expect(update?.value).toEqual({
      last_detected_at: now,
      incident_type: 'gps-stale',
      priority: 'P1',
      condition_metadata: { attempts: 2 },
      updated_at: now,
    });
    expect(client.calls).toEqual(
      expect.arrayContaining([
        { table: 'monitoring_incidents', method: 'eq', value: ['id', 7] },
        { table: 'monitoring_incidents', method: 'in', value: ['status', ['open', 'attending']] },
      ]),
    );
  });

  it('resolves only active rows as condition_cleared', async () => {
    const client = new FakeSupabase();
    client.responses.push({ data: null, error: null });

    await createSupabaseIncidentStore(client).resolveCondition(7, now);

    expect(client.calls.find((call) => call.method === 'update')?.value).toEqual({
      status: 'resolved',
      resolved_at: now,
      resolution_source: 'condition_cleared',
      updated_at: now,
    });
    expect(client.calls).toEqual(
      expect.arrayContaining([
        { table: 'monitoring_incidents', method: 'in', value: ['status', ['open', 'attending']] },
      ]),
    );
  });

  it('finds one active incident by condition key for conflict recovery', async () => {
    const client = new FakeSupabase();
    client.responses.push({ data: row, error: null });

    const result = await createSupabaseIncidentStore(client).findActiveByConditionKey(detected.key);

    expect(result?.id).toBe(7);
    expect(client.calls).toEqual(
      expect.arrayContaining([
        { table: 'monitoring_incidents', method: 'eq', value: ['condition_key', detected.key] },
        { table: 'monitoring_incidents', method: 'limit', value: 1 },
        { table: 'monitoring_incidents', method: 'maybeSingle', value: null },
      ]),
    );
  });

  it('classifies exactly PostgREST 23505 as a recoverable conflict', async () => {
    const conflictClient = new FakeSupabase();
    conflictClient.responses.push({ data: null, error: { code: '23505', message: 'duplicate' } });
    const otherClient = new FakeSupabase();
    otherClient.responses.push({ data: null, error: { code: '42501', message: 'details' } });

    await expect(
      createSupabaseIncidentStore(conflictClient).insertCondition(detected, now),
    ).rejects.toBeInstanceOf(IncidentConflictError);
    await expect(
      createSupabaseIncidentStore(otherClient).insertCondition(detected, now),
    ).rejects.toThrow('Failed to insert monitoring incident');
  });

  it('reloads and touches the active row after a concurrent unique conflict', async () => {
    const client = new FakeSupabase();
    client.responses.push(
      { data: [], error: null },
      { data: null, error: { code: '23505', message: 'duplicate' } },
      { data: row, error: null },
      { data: null, error: null },
      { data: [row], error: null },
    );

    await reconcileMonitoringIncidents(
      createSupabaseIncidentStore(client),
      [detected],
      new Date(now),
    );

    const methods = client.calls.map((call) => call.method);
    expect(methods).toContain('insert');
    expect(client.calls).toEqual(
      expect.arrayContaining([
        { table: 'monitoring_incidents', method: 'eq', value: ['condition_key', detected.key] },
        { table: 'monitoring_incidents', method: 'eq', value: ['id', 7] },
      ]),
    );
    expect(client.calls.filter((call) => call.method === 'update')).toHaveLength(1);
  });

  it('rejects invalid timestamps before issuing a database query', async () => {
    const client = new FakeSupabase();

    await expect(
      createSupabaseIncidentStore(client).resolveCondition(7, 'August 25, 2026'),
    ).rejects.toThrow('Invalid monitoring incident timestamp');
    expect(client.calls).toEqual([]);
  });
});
