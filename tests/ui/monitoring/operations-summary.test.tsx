import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OperationsSummary } from '@/app/(admin)/monitoring/_components/operations-summary';
import { DataHealthBanner } from '@/app/(admin)/monitoring/_components/data-health-banner';
import { MonitoringFilters } from '@/app/(admin)/monitoring/_components/monitoring-filters';
import type { MonitoringKpis, MonitoringUiHealth } from '@/lib/monitoring/types';

afterEach(cleanup);

const kpis: MonitoringKpis = {
  openOrders: 12,
  unassigned: 3,
  onTheWay: 5,
  atRisk: 2,
  ridersOnline: 9,
  available: 4,
  occupied: 5,
  noSignal: 1,
};

describe('OperationsSummary', () => {
  it('renders all KPI labels and values in a responsive eight-card grid', () => {
    render(<OperationsSummary kpis={kpis} selectedKpi="all" onSelectKpi={vi.fn()} />);

    [
      ['Pedidos abiertos', '12'], ['Sin asignar', '3'], ['En camino', '5'], ['En riesgo', '2'],
      ['Riders en línea', '9'], ['Disponibles', '4'], ['Ocupados', '5'], ['Sin señal', '1'],
    ].forEach(([label, value]) => {
      expect(screen.getByRole('button', { name: new RegExp(`${label}.*${value}`) })).toBeInTheDocument();
    });
    expect(screen.getByTestId('monitoring-kpi-grid')).toHaveClass('grid-cols-2', 'md:grid-cols-4', 'xl:grid-cols-8');
  });

  it('selects the matching controller KPI and exposes selected state', () => {
    const selectKpi = vi.fn();
    render(<OperationsSummary kpis={kpis} selectedKpi="unassigned" onSelectKpi={selectKpi} />);

    const card = screen.getByRole('button', { name: /Sin asignar.*3/ });
    fireEvent.click(card);
    expect(selectKpi).toHaveBeenCalledWith('unassigned');
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /En riesgo.*2/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not expose duplicate selected states when the controller filter is all', () => {
    render(<OperationsSummary kpis={kpis} selectedKpi="all" onSelectKpi={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Pedidos abiertos.*12/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Riders en línea.*9/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('maps every card to a controller selection and applies only approved tones', () => {
    const selectKpi = vi.fn();
    render(<OperationsSummary kpis={kpis} selectedKpi="all" onSelectKpi={selectKpi} />);
    const mappings: Array<[RegExp, string]> = [
      [/Pedidos abiertos/, 'all'], [/Sin asignar/, 'unassigned'], [/En camino/, 'onTheWay'], [/En riesgo/, 'atRisk'],
      [/Riders en línea/, 'all'], [/Disponibles/, 'available'], [/Ocupados/, 'occupied'], [/Sin señal/, 'noSignal'],
    ];
    mappings.forEach(([name, selection]) => fireEvent.click(screen.getByRole('button', { name })));
    expect(selectKpi.mock.calls.map(([value]) => value)).toEqual(mappings.map(([, value]) => value));
    expect(screen.getByRole('button', { name: /Sin asignar/ })).toHaveAttribute('data-tone', 'critical');
    expect(screen.getByRole('button', { name: /En riesgo/ })).toHaveAttribute('data-tone', 'critical');
    expect(screen.getByRole('button', { name: /Sin señal/ })).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByRole('button', { name: /Pedidos abiertos/ })).toHaveAttribute('data-tone', 'neutral');
  });

  it('keeps KPI cards keyboard accessible and truncates long labels safely', () => {
    render(<OperationsSummary kpis={kpis} selectedKpi="all" onSelectKpi={vi.fn()} />);
    const card = screen.getByRole('button', { name: /Sin asignar/ });
    expect(card).toHaveAttribute('type', 'button');
    expect(card).toHaveAttribute('title', 'Filtrar por Sin asignar');
    expect(card.querySelector('[data-kpi-label]')).toHaveClass('truncate');
  });
});

describe('DataHealthBanner', () => {
  const fresh: MonitoringUiHealth = { realtime: 'connected', snapshot: 'fresh', disabledRules: [] };

  it('shows fresh, degraded realtime, and stale query states without hiding old data', () => {
    const timestamp = new Date(Date.now() - 2 * 60_000).toISOString();
    const { rerender } = render(<DataHealthBanner health={fresh} serverTimestamp={timestamp} />);
    expect(screen.getByText('Datos al día')).toBeInTheDocument();
    expect(screen.getByText('Actualizado hace 2 min')).toBeInTheDocument();
    rerender(<DataHealthBanner health={{ ...fresh, realtime: 'degraded' }} serverTimestamp={timestamp} />);
    expect(screen.getByText('Datos degradados')).toBeInTheDocument();
    rerender(<DataHealthBanner health={{ ...fresh, snapshot: 'stale' }} serverTimestamp={timestamp} />);
    expect(screen.getByText('Datos desactualizados')).toBeInTheDocument();
    expect(screen.getByText('Actualizado hace 2 min')).toBeInTheDocument();
  });

  it('keeps snapshot KPI values visible beside a stale or degraded banner', () => {
    const timestamp = new Date(Date.now() - 2 * 60_000).toISOString();
    render(
      <>
        <DataHealthBanner health={{ ...fresh, realtime: 'degraded', snapshot: 'stale' }} serverTimestamp={timestamp} />
        <OperationsSummary kpis={kpis} selectedKpi="all" onSelectKpi={vi.fn()} />
      </>,
    );
    expect(screen.getByText('Datos degradados')).toBeInTheDocument();
    expect(screen.getByText('Datos desactualizados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pedidos abiertos.*12/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sin señal.*1/ })).toBeInTheDocument();
  });

  it('does not show a negative age for invalid or future timestamps', () => {
    const { rerender } = render(<DataHealthBanner health={fresh} serverTimestamp={new Date(Date.now() + 60_000).toISOString()} />);
    expect(screen.getByText('Actualizado hace <1 min')).toBeInTheDocument();
    rerender(<DataHealthBanner health={fresh} serverTimestamp="not-a-date" />);
    expect(screen.getByText('Actualización no disponible')).toBeInTheDocument();
  });
});

describe('MonitoringFilters', () => {
  it('renders accessible controlled filters and emits values without filtering', () => {
    const callbacks = { priority: vi.fn(), zone: vi.fn(), status: vi.fn(), search: vi.fn() };
    render(<MonitoringFilters priority="all" zone="all" orderStatus="all" search="" zones={[{ id: 'z1', name: 'Centro' }]} onPriorityChange={callbacks.priority} onZoneChange={callbacks.zone} onOrderStatusChange={callbacks.status} onSearchChange={callbacks.search} />);
    expect(screen.getByLabelText('Prioridad')).toBeInTheDocument();
    expect(screen.getByLabelText('Zona')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado del pedido')).toBeInTheDocument();
    const search = screen.getByLabelText('Buscar');
    expect(search).toHaveAttribute('maxLength', '120');
    fireEvent.change(search, { target: { value: '  rider  ' } });
    expect(callbacks.search).toHaveBeenCalledWith('rider');
  });
});
