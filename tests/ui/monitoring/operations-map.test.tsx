import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveOrdersTable } from '@/app/(admin)/monitoring/_components/active-orders-table';
import type { MonitoringOrder } from '@/lib/monitoring/types';

const orders: MonitoringOrder[] = [
  { id: 'order-1', status: 'on_the_way', riderId: 'rider-1', zoneId: 'zone-a', createdAt: new Date(Date.now() - 10 * 60_000).toISOString(), expectedDeliveryAt: null, assignmentExhaustedAt: null },
  { id: 'order-2', status: 'accepted', riderId: null, zoneId: 'zone-b', createdAt: new Date().toISOString(), expectedDeliveryAt: null, assignmentExhaustedAt: null },
];

describe('ActiveOrdersTable', () => {
  it('filters rows and emits the selected order without duplicating domain rules', () => {
    const select = vi.fn();
    render(<ActiveOrdersTable orders={orders} selectedOrderId="order-1" onSelectOrder={select} />);
    expect(screen.getByRole('row', { name: /order-1/i })).toHaveAttribute('aria-selected', 'true');
    fireEvent.change(screen.getByLabelText('Buscar pedidos'), { target: { value: 'order-2' } });
    expect(screen.queryByRole('row', { name: /order-1/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('row', { name: /order-2/i }));
    expect(select).toHaveBeenCalledWith('order-2');
  });
});
