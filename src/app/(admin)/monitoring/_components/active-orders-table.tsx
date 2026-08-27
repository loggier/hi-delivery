'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MonitoringOrder } from '@/lib/monitoring/types';

type OrderDisplay = MonitoringOrder & { zoneName?: string | null; riderName?: string | null; risk?: string | null };
export type ActiveOrdersTableProps = { orders: readonly OrderDisplay[]; selectedOrderId?: string | null; onSelectOrder: (id: string) => void };

function elapsed(createdAt: string | null): string {
  if (!createdAt) return 'Sin hora';
  const value = Date.parse(createdAt);
  if (!Number.isFinite(value)) return 'Sin hora';
  return `${Math.max(0, Math.floor((Date.now() - value) / 60000))} min`;
}

export function ActiveOrdersTable({ orders, selectedOrderId, onSelectOrder }: ActiveOrdersTableProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => !term || [order.id, order.status, order.zoneName, order.riderName].some((value) => value?.toLowerCase().includes(term)));
  }, [orders, search]);
  return (
    <section aria-labelledby="active-orders-title" className="flex min-h-0 flex-col rounded-lg border bg-card">
      <div className="space-y-2 border-b p-4"><h2 id="active-orders-title" className="text-base font-semibold">Pedidos activos</h2><Input aria-label="Buscar pedidos" placeholder="Buscar por pedido, rider o zona" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Estado</TableHead><TableHead>Rider</TableHead><TableHead>Zona</TableHead><TableHead>Tiempo</TableHead><TableHead>Riesgo</TableHead></TableRow></TableHeader><TableBody>
        {filtered.map((order) => <TableRow key={order.id} role="row" tabIndex={0} aria-selected={selectedOrderId === order.id} className="cursor-pointer" onClick={() => onSelectOrder(order.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectOrder(order.id); } }}>
          <TableCell className="font-medium">{order.id}</TableCell><TableCell><Badge variant="outline">{order.status}</Badge></TableCell><TableCell>{order.riderName ?? order.riderId ?? 'Sin asignar'}</TableCell><TableCell>{order.zoneName ?? order.zoneId ?? 'Sin zona'}</TableCell><TableCell>{elapsed(order.createdAt)}</TableCell><TableCell>{order.risk ?? 'Normal'}</TableCell>
        </TableRow>)}
        {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay pedidos que coincidan.</TableCell></TableRow>}
      </TableBody></Table></div>
    </section>
  );
}
