import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IncidentQueue } from '@/app/(admin)/monitoring/_components/incident-queue';
import { ContextPanelContent } from '@/app/(admin)/monitoring/_components/context-panel';
import type { MonitoringIncident } from '@/lib/monitoring/types';
afterEach(cleanup);
const incident = (id: number, priority: MonitoringIncident['priority'], firstDetectedAt: string): MonitoringIncident => ({ id, priority, firstDetectedAt, lastDetectedAt: firstDetectedAt, conditionKey: `condition-${id}`, type: 'gps-stale', status: 'attending', orderId: 'order-1', riderId: 'rider-1', attendingAt: firstDetectedAt, resolvedAt: null, metadata: { attempts: 2, token: 'never show', latitude: 1 } });
describe('monitoring incident controls', () => {
  it('sorts shuffled incidents by priority, age, and id', () => {
    render(<IncidentQueue incidents={[incident(3, 'P3', '2026-08-26T10:00:00.000Z'), incident(2, 'P1', '2026-08-26T11:00:00.000Z'), incident(1, 'P1', '2026-08-26T11:00:00.000Z'), incident(4, 'P2', '2026-08-26T09:00:00.000Z')]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent?.match(/#\d+/)?.[0])).toEqual(['#1', '#2', '#4', '#3']);
  });
  it('shows safe context and routes sensitive action to its parent callback', () => {
    const sensitive = vi.fn();
    render(<ContextPanelContent incident={incident(7, 'P1', '2026-08-26T10:00:00.000Z')} onSensitiveAction={sensitive} riderPhone="+5215555555555" />);
    expect(screen.getByText(/Prioridad: P1/)).toBeInTheDocument();
    expect(screen.getAllByText(/2026-08-26/)).toHaveLength(2);
    expect(screen.queryByText('never show')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar estado' }));
    expect(sensitive).toHaveBeenCalledTimes(1);
  });
});
