'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Crosshair, Minus, Plus } from 'lucide-react';
import { GoogleMap, MarkerClustererF, MarkerF, PolylineF, useLoadScript } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { MonitoringOrder, MonitoringRider } from '@/lib/monitoring/types';
import { isValidCoordinate, orderIsInTransit, type RiderOperationalState } from '../_lib/view-model';

export { isValidCoordinate };

export const GOOGLE_MAPS_LOADER_ID = 'hi-delivery-monitoring-google-maps';
const libraries: ('places')[] = ['places'];
const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 19.4326, lng: -99.1332 };

const STATE_COLOR: Record<RiderOperationalState, string> = {
  en_ruta: '#2563eb',
  ocupado: '#f59e0b',
  disponible: '#10b981',
  sin_senal: '#ef4444',
  no_disponible: '#94a3b8',
};

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function riderIcon(state: RiderOperationalState, selected: boolean): string {
  const ring = selected ? '#0f172a' : '#ffffff';
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="${STATE_COLOR[state]}" stroke="${ring}" stroke-width="${selected ? 4 : 3}"/><circle cx="16" cy="16" r="4" fill="#ffffff"/></svg>`);
}

const BUSINESS_ICON = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#f97316" stroke="#ffffff" stroke-width="3"/><path d="M9 10h10v2H9zm1 3h8v6h-3v-3h-2v3H10z" fill="#ffffff"/></svg>');
const CUSTOMER_ICON = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 1C7 1 2 6 2 13c0 9 12 21 12 21s12-12 12-21C26 6 21 1 14 1z" fill="#ef4444" stroke="#ffffff" stroke-width="2"/><circle cx="14" cy="13" r="4.5" fill="#ffffff"/></svg>');
const CLUSTER_STYLE = [{ url: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="#16a34a" stroke="#ffffff" stroke-width="3"/></svg>'), height: 44, width: 44, textColor: '#ffffff', textSize: 13 }];

export type OperationsPlaybackPoint = { latitude: number; longitude: number; recordedAt: string; speed?: number | null; course?: number | null };
export type MonitoringRiderWithLocation = MonitoringRider & { latitude?: number; longitude?: number; speed?: number; course?: number };

export interface OperationsMapProps {
  riders: readonly MonitoringRiderWithLocation[];
  orders: readonly MonitoringOrder[];
  riderStates: ReadonlyMap<string, RiderOperationalState>;
  selectedOrder: MonitoringOrder | null;
  selectedRiderId: string | null;
  onSelectRider: (riderId: string) => void;
  onSelectOrder: (orderId: string) => void;
  onClearSelection: () => void;
  resetCameraToken?: number;
  focusSelectionToken?: number;
  historyPath?: readonly { latitude: number; longitude: number; recorded_at?: string }[];
  playbackPoint?: OperationsPlaybackPoint | null;
  historyMode?: boolean;
}

export function applyFreshLocationPatch(rider: MonitoringRiderWithLocation, patch: MonitoringRiderWithLocation): MonitoringRiderWithLocation {
  const incoming = Date.parse(patch.lastLocationReceivedAt ?? patch.lastLocationUpdate ?? '');
  const current = Date.parse(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate ?? '');
  return Number.isFinite(incoming) && (!Number.isFinite(current) || incoming >= current) ? { ...rider, ...patch } : rider;
}

export function interpolateMonitoringRiders(previous: readonly MonitoringRiderWithLocation[], next: readonly MonitoringRiderWithLocation[], progress: number) {
  const before = new Map(previous.map((rider) => [rider.id, rider]));
  return next.map((rider) => {
    const old = before.get(rider.id);
    if (!old || !isValidCoordinate(old.latitude, old.longitude) || !isValidCoordinate(rider.latitude, rider.longitude)) return rider;
    return { ...rider, latitude: old.latitude + (rider.latitude - old.latitude) * progress, longitude: (old.longitude as number) + ((rider.longitude as number) - (old.longitude as number)) * progress };
  });
}

function MapLegend() {
  const [open, setOpen] = useState(true);
  const rows: ReadonlyArray<{ key: string; label: string; swatch: ReactNode }> = [
    { key: 'route', label: 'Ruta del pedido seleccionado', swatch: <span className="h-0.5 w-6 rounded bg-blue-600" /> },
    { key: 'approx', label: 'Trayecto aproximado (sin ruta GPS)', swatch: <span className="w-6 border-t-2 border-dashed border-slate-500" /> },
    { key: 'en_ruta', label: 'Repartidor (en ruta)', swatch: <span className="h-3 w-3 rounded-full" style={{ background: STATE_COLOR.en_ruta }} /> },
    { key: 'disponible', label: 'Repartidor (disponible)', swatch: <span className="h-3 w-3 rounded-full" style={{ background: STATE_COLOR.disponible }} /> },
    { key: 'ocupado', label: 'Repartidor (ocupado)', swatch: <span className="h-3 w-3 rounded-full" style={{ background: STATE_COLOR.ocupado }} /> },
    { key: 'sin_senal', label: 'Repartidor (sin señal)', swatch: <span className="h-3 w-3 rounded-full" style={{ background: STATE_COLOR.sin_senal }} /> },
    { key: 'business', label: 'Negocio', swatch: <span className="h-3 w-3 rounded-full bg-orange-500" /> },
    { key: 'customer', label: 'Cliente', swatch: <span className="h-3 w-3 rounded-full bg-red-500" /> },
    { key: 'cluster', label: 'Repartidores agrupados', swatch: <span className="h-3 w-3 rounded-full bg-green-600" /> },
  ];
  return (
    <div className="w-52 rounded-xl border bg-white/95 text-xs shadow-lg backdrop-blur">
      <button type="button" className="flex w-full items-center justify-between px-3 py-2 font-bold" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Leyenda {open ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronUp className="h-4 w-4" aria-hidden="true" />}
      </button>
      {open ? (
        <ul className="space-y-1.5 px-3 pb-3">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-2 text-slate-700">
              <span className="flex w-6 shrink-0 justify-center">{row.swatch}</span>
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function OperationsMap({
  riders, riderStates, selectedOrder, selectedRiderId, onSelectRider, onSelectOrder, onClearSelection,
  resetCameraToken = 0, focusSelectionToken = 0, historyPath = [], playbackPoint = null, historyMode = false,
}: OperationsMapProps) {
  const { isLoaded, loadError } = useLoadScript({ id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', libraries });
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastFleetSignatureRef = useRef('');
  const lastResetRef = useRef(resetCameraToken);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const fleetSignature = useMemo(() => riders.map((rider) => rider.id).sort().join('|'), [riders]);
  const options = useMemo(() => ({ disableDefaultUI: true, clickableIcons: false, mapTypeId: mapType }), [mapType]);
  const clusterOptions = useMemo(() => ({ gridSize: 56, maxZoom: 16, minimumClusterSize: 2, styles: CLUSTER_STYLE }), []);

  const fitView = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    const points: Array<{ latitude: number; longitude: number }> = historyMode
      ? historyPath.filter((point) => isValidCoordinate(point.latitude, point.longitude))
      : riders.filter((rider) => isValidCoordinate(rider.latitude, rider.longitude)).map((rider) => ({ latitude: rider.latitude as number, longitude: rider.longitude as number }));
    if (!points.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend({ lat: point.latitude, lng: point.longitude }));
    map.fitBounds(bounds, 64);
    window.setTimeout(() => { if (mapRef.current && (mapRef.current.getZoom() ?? 0) > 17) mapRef.current.setZoom(17); }, 0);
  }, [historyMode, historyPath, riders]);

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    if (lastFleetSignatureRef.current !== fleetSignature || lastResetRef.current !== resetCameraToken || historyMode) {
      lastFleetSignatureRef.current = fleetSignature;
      lastResetRef.current = resetCameraToken;
      fitView();
    }
  }, [fitView, fleetSignature, historyMode, isLoaded, resetCameraToken]);

  useEffect(() => {
    if (!selectedRiderId || focusSelectionToken === 0) return;
    const rider = riders.find((item) => item.id === selectedRiderId);
    if (!rider || !isValidCoordinate(rider.latitude, rider.longitude) || !mapRef.current) return;
    mapRef.current.panTo({ lat: rider.latitude, lng: rider.longitude as number });
    if ((mapRef.current.getZoom() ?? 0) < 15) mapRef.current.setZoom(15);
  }, [focusSelectionToken, riders, selectedRiderId]);

  if (loadError) return <div role="alert" className="grid h-full place-items-center p-4 text-center text-sm text-red-700">No se pudo cargar el mapa. Revisa la clave de Google Maps.</div>;
  if (!isLoaded) return <Skeleton className="h-full w-full" />;

  const riderById = new Map(riders.map((rider) => [rider.id, rider]));
  const visibleRiders = historyMode && selectedRiderId ? riders.filter((rider) => rider.id === selectedRiderId) : riders;
  const routeRider = selectedOrder?.riderId ? riderById.get(selectedOrder.riderId) : undefined;
  const solidPath = selectedOrder?.path && selectedOrder.path.length > 1 ? selectedOrder.path : null;
  const approxTarget = selectedOrder ? (orderIsInTransit(selectedOrder) ? selectedOrder.delivery : selectedOrder.pickup) : null;
  const approxStart = routeRider && isValidCoordinate(routeRider.latitude, routeRider.longitude) ? { lat: routeRider.latitude as number, lng: routeRider.longitude as number } : null;
  const approxPath = !solidPath && approxStart && approxTarget && isValidCoordinate(approxTarget.latitude, approxTarget.longitude)
    ? [approxStart, { lat: approxTarget.latitude, lng: approxTarget.longitude }]
    : null;
  const historySegments = historyMode ? historyPath.reduce<Array<Array<{ lat: number; lng: number }>>>((segments, point, pointIndex) => {
    if (!isValidCoordinate(point.latitude, point.longitude)) return segments;
    const previousTime = Date.parse(historyPath[pointIndex - 1]?.recorded_at ?? '');
    const currentTime = Date.parse(point.recorded_at ?? '');
    const gap = Number.isFinite(previousTime) && Number.isFinite(currentTime) && currentTime - previousTime > 15 * 60 * 1000;
    if (!segments.length || gap) segments.push([]);
    segments[segments.length - 1].push({ lat: point.latitude, lng: point.longitude });
    return segments;
  }, []) : [];
  const placed = (lat: unknown, lng: unknown) => isValidCoordinate(lat, lng);

  const zoomBy = (delta: number) => { const map = mapRef.current; if (map) map.setZoom((map.getZoom() ?? 12) + delta); };

  return (
    <div data-testid="operations-map" className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={12}
        options={options}
        onLoad={(map) => { mapRef.current = map; lastFleetSignatureRef.current = fleetSignature; fitView(); }}
        onUnmount={() => { mapRef.current = null; }}
        onClick={() => onClearSelection()}
      >
        <MarkerClustererF options={clusterOptions}>
          {(clusterer) => (
            <>
              {visibleRiders.filter((rider) => placed(rider.latitude, rider.longitude)).map((rider) => {
                const state = riderStates.get(rider.id) ?? 'no_disponible';
                const selected = rider.id === selectedRiderId;
                return (
                  <MarkerF
                    key={rider.id}
                    clusterer={clusterer}
                    position={{ lat: rider.latitude as number, lng: rider.longitude as number }}
                    title={`${rider.firstName ?? 'Repartidor'} ${rider.lastName ?? ''}`.trim()}
                    icon={{ url: riderIcon(state, selected), scaledSize: new window.google.maps.Size(selected ? 38 : 32, selected ? 38 : 32), anchor: new window.google.maps.Point(16, 16) }}
                    zIndex={selected ? 100 : 1}
                    onClick={() => onSelectRider(rider.id)}
                  />
                );
              })}
            </>
          )}
        </MarkerClustererF>

        {selectedOrder ? (
          <Fragment key={`route-${selectedOrder.id}`}>
            {selectedOrder.pickup && placed(selectedOrder.pickup.latitude, selectedOrder.pickup.longitude) ? (
              <MarkerF position={{ lat: selectedOrder.pickup.latitude, lng: selectedOrder.pickup.longitude }} title="Negocio" icon={{ url: BUSINESS_ICON, scaledSize: new window.google.maps.Size(28, 28) }} zIndex={50} onClick={() => onSelectOrder(selectedOrder.id)} />
            ) : null}
            {selectedOrder.delivery && placed(selectedOrder.delivery.latitude, selectedOrder.delivery.longitude) ? (
              <MarkerF position={{ lat: selectedOrder.delivery.latitude, lng: selectedOrder.delivery.longitude }} title="Cliente" icon={{ url: CUSTOMER_ICON, scaledSize: new window.google.maps.Size(28, 36), anchor: new window.google.maps.Point(14, 36) }} zIndex={60} />
            ) : null}
            {solidPath ? (
              <PolylineF path={solidPath.map((point) => ({ lat: point.latitude, lng: point.longitude }))} options={{ strokeColor: '#2563eb', strokeOpacity: 0.9, strokeWeight: 5 }} />
            ) : null}
            {approxPath ? (
              <PolylineF path={approxPath} options={{ strokeOpacity: 0, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeColor: '#475569', scale: 3 }, offset: '0', repeat: '14px' }] }} />
            ) : null}
          </Fragment>
        ) : null}

        {historySegments.filter((segment) => segment.length > 1).map((segment, index) => (
          <PolylineF key={`history-segment-${index}`} path={segment} options={{ strokeColor: '#2563eb', strokeOpacity: 0.9, strokeWeight: 5 }} />
        ))}
        {playbackPoint && placed(playbackPoint.latitude, playbackPoint.longitude) ? (
          <MarkerF position={{ lat: playbackPoint.latitude, lng: playbackPoint.longitude }} title="Punto del recorrido" zIndex={120} />
        ) : null}
      </GoogleMap>

      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
        <Button type="button" size="icon" variant="secondary" className="h-9 w-9 bg-white shadow" aria-label="Acercar" onClick={() => zoomBy(1)}><Plus className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="secondary" className="h-9 w-9 bg-white shadow" aria-label="Alejar" onClick={() => zoomBy(-1)}><Minus className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="secondary" className="h-9 w-9 bg-white shadow" aria-label="Ver toda la flota" onClick={() => fitView()}><Crosshair className="h-4 w-4" /></Button>
      </div>
      <div className="absolute left-3 top-3 z-10 flex overflow-hidden rounded-lg border bg-white text-xs font-semibold shadow">
        <button type="button" aria-pressed={mapType === 'roadmap'} onClick={() => setMapType('roadmap')} className={mapType === 'roadmap' ? 'bg-blue-600 px-3 py-1.5 text-white' : 'px-3 py-1.5 text-slate-700'}>Mapa</button>
        <button type="button" aria-pressed={mapType === 'hybrid'} onClick={() => setMapType('hybrid')} className={mapType === 'hybrid' ? 'bg-blue-600 px-3 py-1.5 text-white' : 'px-3 py-1.5 text-slate-700'}>Satélite</button>
      </div>
      <div className="absolute bottom-3 left-3 z-10">
        <MapLegend />
      </div>
    </div>
  );
}
