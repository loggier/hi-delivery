'use client';

import { useEffect, useRef, useState } from 'react';
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
  if (root?.eventType !== 'UPDATE') return null;
  const row = record(root?.new);
  if (!row) return null;
  const riderId = typeof row.id === 'string' && row.id.trim() ? row.id : null;
  const latitude = row?.last_latitude;
  const longitude = row?.last_longitude;
  if (!riderId || !finite(latitude) || !finite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (finite(row.last_speed) && (row.last_speed < 0 || row.last_speed > 100)) return null;
  if (finite(row.last_course) && (row.last_course < 0 || row.last_course > 360)) return null;
  const receivedAt = typeof row.last_location_received_at === 'string'
    ? new Date(row.last_location_received_at)
    : null;
  // Allow normal device clock skew, but reject timestamps over five minutes ahead.
  if (!receivedAt || Number.isNaN(receivedAt.getTime()) || receivedAt.getTime() > Date.now() + 5 * 60_000) return null;
  const patch: MonitoringLocationPatch = { riderId, latitude, longitude, receivedAt: receivedAt.toISOString() };
  if (finite(row.last_speed)) patch.speed = row.last_speed;
  if (finite(row.last_course)) patch.course = row.last_course;
  return patch;
}

export function useMonitoringRealtime() {
  const [locationPatches, setLocationPatches] = useState<Map<string, MonitoringLocationPatch>>(() => new Map());
  const locationPatchesRef = useRef(new Map<string, MonitoringLocationPatch>());
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState<string | null>(null);
  const lastRealtimeEventAtRef = useRef<string | null>(null);

  // Realtime only moves rider markers; operational refresh belongs to polling/Task 12.
  useEffect(() => {
    const supabase = createClient();
    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';
    const channel = supabase.channel('monitoring-riders-realtime-control')
      .on('postgres_changes', { event: '*', schema, table: 'riders' }, (payload: unknown) => {
        const patch = parsePatch(payload);
        if (!patch) return;
        const previous = locationPatchesRef.current.get(patch.riderId);
        if (previous && patch.receivedAt < previous.receivedAt) return;
        const next = new Map(locationPatchesRef.current);
        next.set(patch.riderId, patch);
        locationPatchesRef.current = next;
        setLocationPatches(next);
        if (!lastRealtimeEventAtRef.current || patch.receivedAt >= lastRealtimeEventAtRef.current) {
          lastRealtimeEventAtRef.current = patch.receivedAt;
          setLastRealtimeEventAt(patch.receivedAt);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRealtimeStatus('degraded');
      });
    return () => { void supabase.removeChannel(channel); };
  }, []);

  return { locationPatches, realtimeStatus, lastRealtimeEventAt };
}
