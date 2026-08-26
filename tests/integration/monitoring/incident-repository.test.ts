import { describe, expect, it } from 'vitest';

import {
  createSupabaseIncidentStore,
  reconcileMonitoringIncidents,
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
});
