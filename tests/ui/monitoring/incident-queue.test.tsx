import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IncidentQueue } from '@/app/(admin)/monitoring/_components/incident-queue';
import type { MonitoringIncident } from '@/lib/monitoring/types';

afterEach(cleanup);

// Synthetic fixtures only.
function incident(id: number, priority: MonitoringIncident['priority'], firstDetectedAt: string): MonitoringIncident {
  return { id, priority, firstDetectedAt, lastDetectedAt: firstDetectedAt, conditionKey: `condition-${id}`, type: 'gps-stale', status: 'open', orderId: null, riderId: null, attendingAt: null, resolvedAt: null, metadata: {} };
}

describe('IncidentQueue', () => {
  it('sorts incidents by priority, age, and id', () => {
    render(
      <IncidentQueue
        incidents={[incident(3, 'P3', '2026-08-26T10:00:00.000Z'), incident(2, 'P1', '2026-08-26T11:00:00.000Z'), incident(1, 'P1', '2026-08-26T11:00:00.000Z'), incident(4, 'P2', '2026-08-26T09:00:00.000Z')]}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('listitem').map((item) => item.textContent?.match(/#\d+/)?.[0])).toEqual(['#1', '#2', '#4', '#3']);
  });

  it('shows an explicit error instead of an empty list when alerts are unavailable', () => {
    render(<IncidentQueue incidents={[]} selectedId={null} onSelect={vi.fn()} error="Las alertas no están disponibles." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Las alertas no están disponibles.');
    expect(screen.queryByText('No hay incidentes activos.')).not.toBeInTheDocument();
  });
});
