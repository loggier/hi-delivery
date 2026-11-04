import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OperationsSummary } from '@/app/(admin)/monitoring/_components/operations-summary';
import type { MonitoringKpis } from '@/lib/monitoring/types';

afterEach(cleanup);

const kpis: MonitoringKpis = { openOrders: 186, unassigned: 0, onTheWay: 72, atRisk: 9, ridersOnline: 47, available: 0, occupied: 3, noSignal: 1 };

describe('OperationsSummary', () => {
  it('shows skeletons while loading and never zeros for missing data', () => {
    render(<OperationsSummary tab="orders" kpis={undefined} delayedCount={null} isLoading selectedRisk={undefined} onSelectRisk={vi.fn()} />);
    expect(screen.getByLabelText('Cargando resumen')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not show deliveries of the day and marks unknown delays as not available', () => {
    render(<OperationsSummary tab="orders" kpis={kpis} delayedCount={null} isLoading={false} selectedRisk={undefined} onSelectRisk={vi.fn()} />);
    expect(screen.queryByText('Entregados hoy')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Atrasados: no disponible')).toBeInTheDocument();
    expect(screen.getByLabelText('Sin asignar: 0')).toBeInTheDocument();
  });

  it('toggles the at-risk filter through the callback', () => {
    const onSelectRisk = vi.fn();
    render(<OperationsSummary tab="orders" kpis={kpis} delayedCount={2} isLoading={false} selectedRisk={undefined} onSelectRisk={onSelectRisk} />);
    fireEvent.click(screen.getByRole('button', { name: 'En riesgo: 9' }));
    expect(onSelectRisk).toHaveBeenCalledWith('atRisk');
  });

  it('renders rider totals for the riders tab', () => {
    render(<OperationsSummary tab="riders" kpis={kpis} riderCount={47} enRouteCount={24} isLoading={false} />);
    expect(screen.getByLabelText('Repartidores: 47')).toBeInTheDocument();
    expect(screen.getByLabelText('En ruta: 24')).toBeInTheDocument();
  });
});
