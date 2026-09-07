'use client';

import Image from 'next/image';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerClustererF, MarkerF, OverlayViewF, PolylineF, useLoadScript } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import type { MonitoringIncident, MonitoringOrder } from '@/lib/monitoring/types';
import type { MonitoringSelection, MonitoringRiderWithLocation } from '../_hooks/use-monitoring-controller';
import { riderVisualState } from './fleet-list';

export const GOOGLE_MAPS_LOADER_ID = 'hi-delivery-monitoring-google-maps';
const libraries: ('places')[] = ['places'];
const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 19.4326, lng: -99.1332 };

export type OperationsPlaybackPoint = { latitude: number; longitude: number; recordedAt: string; speed?: number | null; course?: number | null };
export type OperationsMapProps = {
  riders: readonly MonitoringRiderWithLocation[];
  orders: readonly MonitoringOrder[];
  incidents?: readonly (MonitoringIncident & { latitude?: number; longitude?: number })[];
  selectedEntity: MonitoringSelection | null;
  selectedOrderId?: string | null;
  selectedRiderId?: string | null;
  onSelectEntity: (selection: MonitoringSelection | null) => void;
  historyPath?: readonly { latitude: number; longitude: number }[];
  playbackPoint?: OperationsPlaybackPoint | null;
  historyMode?: boolean;
  staleMinutes?: number;
  resetCameraToken?: number;
  focusSelectionToken?: number;
};

export function isValidCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
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

export function OperationsMap({ riders, orders, incidents = [], selectedEntity, selectedOrderId = null, selectedRiderId = null, onSelectEntity, historyPath = [], playbackPoint = null, historyMode = false, staleMinutes = 10, resetCameraToken = 0, focusSelectionToken = 0 }: OperationsMapProps) {
  const { isLoaded, loadError } = useLoadScript({ id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', libraries });
  const mapRef = useRef<google.maps.Map | null>(null);
  const previousRidersRef = useRef<readonly MonitoringRiderWithLocation[]>(riders);
  const animationFrameRef = useRef<number | null>(null);
  const lastFleetSignatureRef = useRef('');
  const lastResetRef = useRef(resetCameraToken);
  const [animatedRiders, setAnimatedRiders] = useState<readonly MonitoringRiderWithLocation[]>(riders);
  const effectiveSelectedRiderId = selectedRiderId ?? (selectedEntity?.kind === 'rider' ? selectedEntity.id : null);
  const effectiveSelectedOrderId = selectedOrderId ?? (selectedEntity?.kind === 'order' ? selectedEntity.id : null);
  const fleetSignature = useMemo(() => riders.map((rider) => rider.id).sort().join('|'), [riders]);
  const options = useMemo(() => ({ disableDefaultUI: true, zoomControl: true, clickableIcons: false }), []);
  const clusterOptions = useMemo(() => ({ gridSize: 56, maxZoom: 16, minimumClusterSize: 2 }), []);

  const fitFleet = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    const points = historyMode ? (historyPath.length ? historyPath : riders.filter((rider) => rider.id === effectiveSelectedRiderId)) : riders;
    const valid = points.filter((point) => isValidCoordinate(point.latitude, point.longitude));
    if (!valid.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    valid.forEach((point) => bounds.extend({ lat: point.latitude as number, lng: point.longitude as number }));
    map.fitBounds(bounds, 64);
    if (valid.length === 1) map.setZoom(18);
    window.setTimeout(() => { if (mapRef.current && (mapRef.current.getZoom() ?? 0) > 18) mapRef.current.setZoom(18); }, 0);
  }, [effectiveSelectedRiderId, historyMode, historyPath, riders]);

  const focusRider = useCallback((riderId: string | null) => {
    if (!riderId || !mapRef.current) return;
    const rider = riders.find((item) => item.id === riderId);
    if (!rider || !isValidCoordinate(rider.latitude, rider.longitude)) return;
    mapRef.current.panTo({ lat: rider.latitude, lng: rider.longitude as number });
    if ((mapRef.current.getZoom() ?? 0) < 15) mapRef.current.setZoom(15);
  }, [riders]);

  useEffect(() => {
    const from = previousRidersRef.current;
    const changed = riders.some((rider) => { const old = from.find((item) => item.id === rider.id); return old?.latitude !== rider.latitude || old?.longitude !== rider.longitude; });
    if (!changed || riders.length > 300) { setAnimatedRiders(riders); previousRidersRef.current = riders; return; }
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 900);
      setAnimatedRiders(interpolateMonitoringRiders(from, riders, 1 - Math.pow(1 - progress, 3)));
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(tick);
      else previousRidersRef.current = riders;
    };
    animationFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current); };
  }, [riders]);

  useEffect(() => { focusRider(effectiveSelectedRiderId); }, [effectiveSelectedRiderId, focusRider]);
  useEffect(() => { if (focusSelectionToken > 0) focusRider(effectiveSelectedRiderId); }, [effectiveSelectedRiderId, focusRider, focusSelectionToken]);
  useEffect(() => {
    if (!mapRef.current) return;
    if (lastFleetSignatureRef.current !== fleetSignature || lastResetRef.current !== resetCameraToken || historyMode) {
      lastFleetSignatureRef.current = fleetSignature;
      lastResetRef.current = resetCameraToken;
      fitFleet();
    }
  }, [fitFleet, fleetSignature, historyMode, resetCameraToken]);

  if (loadError) return <div role="alert" className="grid h-full place-items-center text-sm text-red-700">Error al cargar el mapa.</div>;
  if (!isLoaded) return <Skeleton className="h-full w-full" />;

  const visibleRiders = historyMode && effectiveSelectedRiderId ? animatedRiders.filter((rider) => rider.id === effectiveSelectedRiderId) : animatedRiders;
  const orderByRider = new Map(orders.flatMap((order) => order.riderId ? [[order.riderId, order] as const] : []));
  const visibleOrders = effectiveSelectedOrderId ? orders.filter((order) => order.id === effectiveSelectedOrderId) : [];

  return <div data-testid="operations-map" className="h-full w-full"><GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={12} options={options} onLoad={(map) => { mapRef.current = map; lastFleetSignatureRef.current = fleetSignature; fitFleet(); }} onUnmount={() => { mapRef.current = null; }} onClick={() => onSelectEntity(null)}>
    <MarkerClustererF options={clusterOptions}>{(clusterer) => <>{visibleRiders.filter((rider) => isValidCoordinate(rider.latitude, rider.longitude)).map((rider) => {
      const order = orderByRider.get(rider.id); const visual = riderVisualState(rider, Boolean(order), staleMinutes); const selected = rider.id === effectiveSelectedRiderId;
      const latitude = selected && playbackPoint ? playbackPoint.latitude : rider.latitude as number; const longitude = selected && playbackPoint ? playbackPoint.longitude : rider.longitude as number; const course = selected && typeof playbackPoint?.course === 'number' ? playbackPoint.course : rider.course ?? 0;
      return <Fragment key={rider.id}><MarkerF clusterer={clusterer} position={{ lat: latitude, lng: longitude }} title={`${rider.firstName} ${rider.lastName}`} onClick={() => onSelectEntity({ kind: 'rider', id: rider.id })} icon={{ url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', scaledSize: new window.google.maps.Size(1, 1) }} /><OverlayViewF position={{ lat: latitude, lng: longitude }} mapPaneName="overlayMouseTarget" getPixelPositionOffset={() => ({ x: selected ? -24 : -20, y: selected ? -24 : -20 })}><button type="button" className="pointer-events-auto" aria-label={`Seleccionar ${rider.firstName} ${rider.lastName}`} onClick={() => onSelectEntity({ kind: 'rider', id: rider.id })}><Image src="/repartidor.png" alt="" width={48} height={48} unoptimized className="object-contain drop-shadow-md" style={{ width: selected ? 48 : 40, height: selected ? 48 : 40, transform: `rotate(${course}deg)`, opacity: rider.activeForOrders || order ? 1 : 0.6 }} /></button></OverlayViewF><OverlayViewF position={{ lat: latitude, lng: longitude }} mapPaneName="overlayMouseTarget" getPixelPositionOffset={(width, height) => ({ x: -(width / 2), y: -(height + 42) })}><button type="button" className="pointer-events-auto flex items-stretch overflow-hidden rounded-md border bg-white text-xs font-bold text-slate-900 shadow-md" onClick={() => onSelectEntity({ kind: 'rider', id: rider.id })}><span className={`w-[10px] ${visual.dot}`} /><span className="whitespace-nowrap px-2 py-1">{rider.firstName} {rider.lastName}</span></button></OverlayViewF></Fragment>;
    })}</>}</MarkerClustererF>
    {visibleOrders.map((order) => <Fragment key={order.id}>{order.pickup && isValidCoordinate(order.pickup.latitude, order.pickup.longitude) ? <MarkerF position={{ lat: order.pickup.latitude, lng: order.pickup.longitude }} title={`Negocio ${order.businessName || order.id}`} /> : null}{order.delivery && isValidCoordinate(order.delivery.latitude, order.delivery.longitude) ? <MarkerF position={{ lat: order.delivery.latitude, lng: order.delivery.longitude }} title={`Cliente ${order.customerName || order.id}`} /> : null}{order.path && order.path.length > 1 ? <PolylineF path={order.path.map((point) => ({ lat: point.latitude, lng: point.longitude }))} options={{ strokeColor: '#f59e0b', strokeOpacity: 0.85, strokeWeight: 4 }} /> : null}</Fragment>)}
    {historyPath.length > 1 ? <PolylineF path={historyPath.filter((point) => isValidCoordinate(point.latitude, point.longitude)).map((point) => ({ lat: point.latitude, lng: point.longitude }))} options={{ strokeColor: '#2563eb', strokeOpacity: 0.9, strokeWeight: 5 }} /> : null}
    {incidents.filter((incident) => isValidCoordinate(incident.latitude, incident.longitude)).map((incident) => <MarkerF key={`incident-${incident.id}`} position={{ lat: incident.latitude as number, lng: incident.longitude as number }} title={`Incidente ${incident.id}`} onClick={() => onSelectEntity({ kind: 'incident', id: String(incident.id) })} />)}
  </GoogleMap></div>;
}
