'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type MonitoringLocationPatch = {
  riderId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  course?: number;
  receivedAt: string;
};
export type RealtimeStatus = 'connecting' | 'connected' | 'degraded';

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' ? value as Record<string, unknown> : null; }

function parsePatch(payload: unknown): MonitoringLocationPatch | null {
  const root = record(payload);
  const row = record(root?.new);
  if (!row) return null;
  const riderId = typeof row?.id === 'string' ? row.id : null;
  const latitude = row?.last_latitude;
  const longitude = row?.last_longitude;
  if (!riderId || !finite(latitude) || !finite(longitude)) return null;
  const patch: MonitoringLocationPatch = { riderId, latitude, longitude, receivedAt: new Date().toISOString() };
  if (finite(row.last_speed)) patch.speed = row.last_speed;
  if (finite(row.last_course)) patch.course = row.last_course;
  return patch;
}

export function useMonitoringRealtime() {
  const [locationPatches, setLocationPatches] = useState<Map<string, MonitoringLocationPatch>>(() => new Map());
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';
    const channel = supabase.channel('monitoring-riders-realtime-control')
      .on('postgres_changes', { event: '*', schema, table: 'riders' }, (payload: unknown) => {
        const patch = parsePatch(payload);
        if (!patch) return;
        setLocationPatches((current) => {
          const next = new Map(current);
          next.set(patch.riderId, patch);
          return next;
        });
        setLastRealtimeEventAt(patch.receivedAt);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRealtimeStatus('degraded');
      });
    return () => { void supabase.removeChannel(channel); };
  }, []);

  return { locationPatches, realtimeStatus, lastRealtimeEventAt };
}
