'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import type { MonitoringFilter, MonitoringSnapshot, MonitoringUiHealth } from '@/lib/monitoring/types';

export const MONITORING_SNAPSHOT_REFETCH_INTERVAL = 15_000;
export const MONITORING_SNAPSHOT_RETRY = 1;

export class MonitoringSnapshotError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'MonitoringSnapshotError';
    this.status = status;
  }
}

function isSnapshot(value: unknown): value is MonitoringSnapshot {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.serverTimestamp === 'string'
    && typeof item.dataHealth === 'object' && item.dataHealth !== null
    && typeof item.thresholds === 'object' && item.thresholds !== null
    && typeof item.kpis === 'object' && item.kpis !== null
    && Array.isArray(item.incidents) && Array.isArray(item.orders) && Array.isArray(item.riders);
}

export async function fetchMonitoringSnapshot(filter: MonitoringFilter): Promise<MonitoringSnapshot> {
  let response: Response;
  try {
    response = await fetch('/api/monitoring/snapshot', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter),
    });
  } catch (error) {
    throw new MonitoringSnapshotError(error instanceof Error ? error.message : 'No se pudo cargar el monitoreo.');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).message === 'string'
      ? (payload as Record<string, unknown>).message as string
      : 'No se pudo cargar el monitoreo.';
    throw new MonitoringSnapshotError(message, response.status);
  }
  if (!isSnapshot(payload)) throw new MonitoringSnapshotError('La respuesta de monitoreo no es válida.', response.status);
  return payload;
}

export function monitoringSnapshotQueryKey(filter: MonitoringFilter): QueryKey {
  return ['monitoring', 'snapshot', filter];
}

export function useMonitoringSnapshot(filter: MonitoringFilter) {
  const [lastError, setLastError] = useState<Error | null>(null);
  const query = useQuery({
    queryKey: monitoringSnapshotQueryKey(filter),
    queryFn: async () => {
      try {
        const result = await fetchMonitoringSnapshot(filter);
        setLastError(null);
        return result;
      } catch (error) {
        const safeError = error instanceof Error ? error : new MonitoringSnapshotError('No se pudo cargar el monitoreo.');
        setLastError(safeError);
        throw safeError;
      }
    },
    refetchInterval: MONITORING_SNAPSHOT_REFETCH_INTERVAL,
    retry: MONITORING_SNAPSHOT_RETRY,
    placeholderData: (previous) => previous,
  });
  const snapshot = query.data;
  const error = lastError ?? query.error;
  const isError = Boolean(error);
  const health: MonitoringUiHealth = {
    realtime: 'connected',
    snapshot: isError ? 'stale' : 'fresh',
    disabledRules: snapshot?.dataHealth.disabledRules ?? [],
  };

  return {
    snapshot,
    error,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    isError,
    health,
    refetch: query.refetch,
  };
}
