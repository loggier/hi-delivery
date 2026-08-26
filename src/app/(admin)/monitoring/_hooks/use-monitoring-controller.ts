'use client';

import { useState } from 'react';
import type { MonitoringFilter, MonitoringKpis, MonitoringRider } from '@/lib/monitoring/types';
import { useMonitoringRealtime, type MonitoringLocationPatch } from './use-monitoring-realtime';
import { useMonitoringSnapshot } from './use-monitoring-snapshot';

export type MonitoringSelection = { kind: 'incident' | 'order' | 'rider'; id: string };
export type MonitoringKpi = keyof Pick<MonitoringKpis, 'unassigned' | 'atRisk' | 'noSignal'> | 'all';
export type MonitoringRiderWithLocation = MonitoringRider & { latitude?: number; longitude?: number; speed?: number; course?: number };

export function monitoringFilterForKpi(kpi: MonitoringKpi): MonitoringFilter {
  return kpi === 'all' ? {} : { risk: kpi };
}

export function mergeMonitoringLocationPatches(
  riders: readonly MonitoringRider[],
  patches: ReadonlyMap<string, MonitoringLocationPatch>,
): MonitoringRiderWithLocation[] {
  return riders.map((rider) => {
    const patch = patches.get(rider.id);
    if (!patch || !Number.isFinite(patch.latitude) || !Number.isFinite(patch.longitude)) return rider;
    return { ...rider, latitude: patch.latitude, longitude: patch.longitude, ...(patch.speed === undefined ? {} : { speed: patch.speed }), ...(patch.course === undefined ? {} : { course: patch.course }), lastLocationReceivedAt: patch.receivedAt, lastLocationUpdate: patch.receivedAt };
  });
}

export function useMonitoringController(initialFilter: MonitoringFilter = {}) {
  const [filter, setFilterState] = useState<MonitoringFilter>(initialFilter);
  const [selection, setSelection] = useState<MonitoringSelection | null>(null);
  const snapshot = useMonitoringSnapshot(filter);
  const realtime = useMonitoringRealtime();

  function selectKpi(kpi: MonitoringKpi) { setFilterState((current) => ({ ...current, ...monitoringFilterForKpi(kpi) })); }
  function setFilter(next: MonitoringFilter) { setFilterState({ ...next }); }
  function clearKpiRisk() { setFilterState(({ risk: _risk, ...rest }) => rest); }
  function selectIncident(id: string) { setSelection({ kind: 'incident', id }); }
  function selectOrder(id: string) { setSelection({ kind: 'order', id }); }
  function selectRider(id: string) { setSelection({ kind: 'rider', id }); }
  function clearSelection() { setSelection(null); }

  return {
    filter, setFilter, selectKpi: (kpi: MonitoringKpi) => kpi === 'all' ? clearKpiRisk() : selectKpi(kpi),
    selection, selectIncident, selectOrder, selectRider, clearSelection,
    ...snapshot, ...realtime,
    riders: snapshot.snapshot ? mergeMonitoringLocationPatches(snapshot.snapshot.riders, realtime.locationPatches) : [],
    health: { ...snapshot.health, realtime: realtime.realtimeStatus === 'connected' ? 'connected' as const : 'degraded' as const },
  };
}

export type { MonitoringLocationPatch };
