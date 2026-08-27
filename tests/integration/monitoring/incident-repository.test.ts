import { describe, expect, it } from 'vitest';

import {
  createSupabaseIncidentStore,
  reconcileMonitoringIncidents,
  requestCloseMonitoringIncident,
} from '@/lib/monitoring/incident-repository';
import type { DetectedCondition } from '@/lib/monitoring/types';

type DbError = { code?: string; message: string };
type DbResult = { data: unknown; error: DbError | null };

class FakeSupabase {
  calls: Array<{ functionName: string; params: Record<string, unknown> }> = [];
  response: DbResult = { data: [], error: null };

  rpc(functionName: string, params: Record<string, unknown>): PromiseLike<DbResult> {
    this.calls.push({ functionName, params });
    return Promise.resolve(this.response);
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
  metadata: { attempts: 2 },
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

describe('Supabase incident store batch reconciliation', () => {
  it('calls the atomic RPC once and maps its active incident rows', async () => {
    const client = new FakeSupabase();
    client.response = { data: [row], error: null };

    const result = await reconcileMonitoringIncidents(
      createSupabaseIncidentStore(client),
      [detected],
      ['gps-stale', 'stopped-in-transit'],
      new Date(now),
    );

    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]).toEqual({
      functionName: 'reconcile_monitoring_incidents',
      params: {
        p_conditions: [
          {
            condition_key: detected.key,
            incident_type: 'gps-stale',
            priority: 'P1',
            status: 'open',
            detected_at: now,
            order_id: 'order-1',
            rider_id: 'rider-1',
            condition_metadata: { attempts: 2 },
          },
        ],
        p_evaluated_types: ['gps-stale', 'stopped-in-transit'],
        p_now: now,
      },
    });
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
  });

  it('still makes only one RPC call for 500 conditions', async () => {
    const client = new FakeSupabase();
    const conditions = Array.from({ length: 500 }, (_, index) => ({
      ...detected,
      key: `gps-stale:order-${index}:rider-1`,
      orderId: `order-${index}`,
    }));

    await reconcileMonitoringIncidents(
      createSupabaseIncidentStore(client),
      conditions,
      ['gps-stale'],
      new Date(now),
    );

    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].params.p_conditions).toHaveLength(500);
  });

  it('does not retry PostgREST 23505 outside the atomic database upsert', async () => {
    const client = new FakeSupabase();
    client.response = { data: null, error: { code: '23505', message: 'duplicate details' } };

    await expect(
      reconcileMonitoringIncidents(
        createSupabaseIncidentStore(client),
        [detected],
        ['gps-stale'],
        new Date(now),
      ),
    ).rejects.toThrow('Failed to reconcile monitoring incidents');
    expect(client.calls).toHaveLength(1);
  });

  it('propagates a safe RPC error without database details', async () => {
    const client = new FakeSupabase();
    client.response = { data: null, error: { code: '42501', message: 'sensitive row details' } };

    const operation = reconcileMonitoringIncidents(
      createSupabaseIncidentStore(client),
      [detected],
      ['gps-stale'],
      new Date(now),
    );

    await expect(operation).rejects.toThrow('Failed to reconcile monitoring incidents');
    await expect(operation).rejects.not.toThrow('sensitive row details');
    expect(client.calls).toHaveLength(1);
  });

  it('allows a legitimate new cycle after a previous resolved cycle', async () => {
    const client = new FakeSupabase();
    client.response = {
      data: [
        {
          ...row,
          id: 8,
          status: 'open',
          first_detected_at: now,
          last_detected_at: now,
          attending_at: null,
        },
      ],
      error: null,
    };

    const result = await reconcileMonitoringIncidents(
      createSupabaseIncidentStore(client),
      [detected],
      ['gps-stale'],
      new Date(now),
    );

    expect(result[0]).toMatchObject({ id: 8, status: 'open', firstDetectedAt: now });
    expect(client.calls).toHaveLength(1);
  });

  it('does not re-open a resolved cycle for an older snapshot', async () => {
    const client = new FakeSupabase();
    client.response = { data: [], error: null };

    const result = await reconcileMonitoringIncidents(
      createSupabaseIncidentStore(client),
      [detected],
      ['gps-stale'],
      new Date('2026-08-25T11:00:00.000Z'),
    );

    expect(result).toEqual([]);
    expect(client.calls[0].params.p_now).toBe('2026-08-25T11:00:00.000Z');
    expect(client.calls).toHaveLength(1);
  });

  it('calls the atomic manual close RPC once and maps an active open response', async () => {
    const client = new FakeSupabase();
    client.response = { data: { status: 'attending', closed: false }, error: null };
    const result = await requestCloseMonitoringIncident({ incident: { ...rowToIncident(), status: 'open' }, reason: 'still active', actorId: 'admin-1', now: '2026-08-26T12:02:00.000Z' }, client);
    expect(result).toEqual({ status: 'attending', closed: false });
    expect(client.calls).toEqual([{ functionName: 'request_close_monitoring_incident', params: { p_incident_id: 7, p_condition_key: detected.key, p_actor_user_id: 'admin-1', p_reason: 'still active', p_expected_status: 'open', p_expected_last_detected_at: row.last_detected_at, p_condition_active: null, p_now: '2026-08-26T12:02:00.000Z' } }]);
  });

  it('maps an atomic zero-row race to a stale incident without resolving it', async () => {
    const client = new FakeSupabase();
    client.response = { data: null, error: null };
    await expect(requestCloseMonitoringIncident({ incident: rowToIncident(), reason: 'condition cleared', actorId: 'admin-1', now: '2026-08-26T12:02:00.000Z' }, client)).rejects.toThrow('stale incident');
  });

  it.each([
    {
      id: 0.5,
      first_detected_at: now,
      last_detected_at: now,
    },
    {
      id: Number.MAX_SAFE_INTEGER + 1,
      first_detected_at: now,
      last_detected_at: now,
    },
    {
      id: 7,
      first_detected_at: 'not-a-date',
      last_detected_at: now,
    },
    {
      id: 7,
      first_detected_at: '2026-08-25T12:00:00.000Z',
      last_detected_at: '2026-08-25T11:00:00.000Z',
    },
  ])('rejects invalid incident response mapping %#', async (invalidRow) => {
    const client = new FakeSupabase();
    client.response = { data: [{ ...row, ...invalidRow }], error: null };

    await expect(
      reconcileMonitoringIncidents(
        createSupabaseIncidentStore(client),
        [],
        [],
        new Date(now),
      ),
    ).rejects.toThrow('Invalid monitoring incident response');
  });
});

function rowToIncident() {
  return { id: row.id, conditionKey: row.condition_key, type: row.incident_type, priority: row.priority, status: row.status as 'open' | 'attending', orderId: row.order_id, riderId: row.rider_id, firstDetectedAt: row.first_detected_at, lastDetectedAt: row.last_detected_at, attendingAt: row.attending_at, resolvedAt: row.resolved_at, metadata: row.condition_metadata };
}
