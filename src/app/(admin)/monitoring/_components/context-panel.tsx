'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonitoringIncident } from '@/lib/monitoring/types';

const sensitiveKey = /(coordinate|latitude|longitude|(^|_)lat($|_)|(^|_)lng($|_)|token|credential|secret|password|history)/i;

function safeMetadata(metadata: MonitoringIncident['metadata']) {
  return Object.entries(metadata).filter(([key]) => !sensitiveKey.test(key));
}

function timestamp(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'No disponible';
  return new Date(value).toISOString();
}

export type ContextPanelContentProps = {
  incident: MonitoringIncident | null;
  onFocusMap?: () => void;
  onRequestLocation?: () => void;
  onSensitiveAction?: () => void;
  riderPhone?: string | null;
  selectedOrderId?: string | null;
  selectedRiderId?: string | null;
  orderZoneName?: string | null;
  riderZoneName?: string | null;
};

export function ContextPanelContent({ incident, onFocusMap, onRequestLocation, onSensitiveAction, riderPhone, selectedOrderId, selectedRiderId, orderZoneName, riderZoneName }: ContextPanelContentProps) {
  if (!incident && !selectedOrderId && !selectedRiderId) return <div className="p-4 text-sm text-muted-foreground">Selecciona una entidad para ver el contexto.</div>;
  return <div className="space-y-4">
    {incident ? <div><p className="text-xs text-muted-foreground">Incidente</p><p className="font-semibold">#{incident.id} · {incident.type}</p><p className="text-sm">Prioridad: {incident.priority} · Estado: {incident.status}</p><p className="text-xs text-muted-foreground">Primera detección: {timestamp(incident.firstDetectedAt)}</p><p className="text-xs text-muted-foreground">Última detección: {timestamp(incident.lastDetectedAt)}</p></div> : <p className="font-semibold">Entidad seleccionada</p>}
    <div className="space-y-1 text-sm"><p className="font-medium">Entidades asociadas</p>{selectedOrderId ? <p className="text-muted-foreground">Pedido: <Link className="underline" href={`/orders/${selectedOrderId}`}>{selectedOrderId}</Link>{orderZoneName ? ` · ${orderZoneName}` : ''}</p> : null}{selectedRiderId ? <p className="text-muted-foreground">Rider: <Link className="underline" href={`/riders/${selectedRiderId}`}>{selectedRiderId}</Link>{riderZoneName ? ` · ${riderZoneName}` : ''}</p> : null}</div>
    {incident ? <div className="space-y-1 text-sm"><p className="font-medium">Contexto seguro</p>{safeMetadata(incident.metadata).map(([key, value]) => <p key={key} className="text-muted-foreground">{key}: {String(value)}</p>)}</div> : null}
    <div className="flex flex-wrap gap-2">{onFocusMap ? <Button size="sm" variant="outline" onClick={onFocusMap}>Enfocar mapa</Button> : null}{onRequestLocation && incident?.riderId ? <Button size="sm" variant="outline" onClick={onRequestLocation}>Solicitar ubicación</Button> : null}{onSensitiveAction ? <Button size="sm" variant="outline" onClick={onSensitiveAction}>Cambiar estado</Button> : null}</div>
    {incident ? <div className="flex flex-wrap gap-3 text-sm">{incident.riderId ? <Link className="underline" href={`/riders/${incident.riderId}`}>Ver rider</Link> : null}{incident.orderId ? <Link className="underline" href={`/orders/${incident.orderId}`}>Ver pedido</Link> : null}{riderPhone ? <><a className="underline" href={`tel:${riderPhone}`}>Llamar</a><a className="underline" href={`https://wa.me/${riderPhone}`}>WhatsApp</a></> : null}</div> : null}
  </div>;
}

export function ContextPanel(props: React.ComponentProps<typeof ContextPanelContent>) { return <Card><CardHeader><CardTitle>Contexto operativo</CardTitle></CardHeader><CardContent><ContextPanelContent {...props} /></CardContent></Card>; }
