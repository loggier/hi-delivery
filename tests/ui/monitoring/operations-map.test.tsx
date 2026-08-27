import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiveOrdersTable } from '@/app/(admin)/monitoring/_components/active-orders-table';
import { OperationsMap, applyFreshLocationPatch } from '@/app/(admin)/monitoring/_components/operations-map';
import type { MonitoringOrder, MonitoringRider } from '@/lib/monitoring/types';

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: true, loadError: undefined }),
  GoogleMap: ({ children, onLoad, onDragStart, onZoomChanged, onClick }: { children?: React.ReactNode; onLoad?: (map: object) => void; onUnmount?: () => void; onDragStart?: () => void; onZoomChanged?: () => void; onClick?: () => void }) => {
    const initialized = React.useRef(false);
    React.useEffect(() => { if (!initialized.current) { initialized.current = true; onLoad?.(window.__monitoringMap); } }, [onLoad]);
    return <div data-testid="google-map" onClick={onClick} onMouseDown={onDragStart} onWheel={onZoomChanged}>{children}</div>;
  },
  MarkerClustererF: ({ children }: { children: (clusterer: object) => React.ReactNode }) => <>{children({})}</>,
  MarkerF: ({ title, onClick }: { title?: string; onClick?: () => void }) => <button type="button" aria-label={title} onClick={onClick}>{title}</button>,
  PolylineF: () => <div data-testid="polyline" />,
}));

declare global { interface Window { __monitoringMap: { fitBounds: ReturnType<typeof vi.fn>; panTo: ReturnType<typeof vi.fn>; setZoom: ReturnType<typeof vi.fn>; getZoom: ReturnType<typeof vi.fn> } } }

const rider = { id: 'rider-1', zoneId: null, activeForOrders: true, lastLocationReceivedAt: '2026-08-26T10:00:00.000Z', lastLocationUpdate: '2026-08-26T10:00:00.000Z', latitude: 19.4, longitude: -99.1 } as MonitoringRider & { latitude: number; longitude: number };

beforeEach(() => {
  window.__monitoringMap = { fitBounds: vi.fn(), panTo: vi.fn(), setZoom: vi.fn(), getZoom: vi.fn(() => 12) };
  Reflect.set(window, 'google', { maps: { LatLngBounds: class { extend = vi.fn(); } } });
});

afterEach(cleanup);

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

describe('OperationsMap', () => {
  it('keeps selection controlled, calls the parent from marker clicks, and rejects stale location patches', () => {
    const select = vi.fn();
    render(<OperationsMap riders={[rider]} orders={[]} selectedEntity={{ kind: 'rider', id: 'rider-1' }} onSelectEntity={select} />);
    expect(window.__monitoringMap.panTo).toHaveBeenCalledWith({ lat: 19.4, lng: -99.1 });
    fireEvent.click(screen.getByRole('button', { name: 'Rider rider-1' }));
    expect(select).toHaveBeenCalledWith({ kind: 'rider', id: 'rider-1' });
    const stale = applyFreshLocationPatch(rider, { ...rider, latitude: 20, lastLocationReceivedAt: '2026-08-26T09:00:00.000Z' });
    expect(stale.latitude).toBe(19.4);
  });

  it('blocks automatic fitBounds after camera interaction but resets and refocuses explicitly', () => {
    const map = window.__monitoringMap;
    const { rerender } = render(<OperationsMap riders={[rider]} orders={[]} selectedEntity={null} onSelectEntity={vi.fn()} resetCameraToken={0} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(screen.getByTestId('google-map'));
    fireEvent.click(screen.getByTestId('google-map'));
    rerender(<OperationsMap riders={[{ ...rider, latitude: 19.5 }]} orders={[]} selectedEntity={null} onSelectEntity={vi.fn()} resetCameraToken={0} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    rerender(<OperationsMap riders={[{ ...rider, latitude: 19.5 }]} orders={[]} selectedEntity={{ kind: 'rider', id: 'rider-1' }} onSelectEntity={vi.fn()} resetCameraToken={0} />);
    expect(map.panTo).toHaveBeenCalledWith({ lat: 19.5, lng: -99.1 });
    rerender(<OperationsMap riders={[{ ...rider, latitude: 19.5 }]} orders={[]} selectedEntity={null} onSelectEntity={vi.fn()} resetCameraToken={1} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });
});
