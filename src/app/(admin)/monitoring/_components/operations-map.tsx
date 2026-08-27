'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerClustererF, MarkerF, OverlayViewF, PolylineF, useLoadScript } from '@react-google-maps/api';
import type { MonitoringIncident, MonitoringOrder, MonitoringRider } from '@/lib/monitoring/types';
import type { MonitoringSelection, MonitoringRiderWithLocation } from '../_hooks/use-monitoring-controller';
import { Skeleton } from '@/components/ui/skeleton';

export const GOOGLE_MAPS_LOADER_ID = 'hi-delivery-monitoring-google-maps';
const libraries: ('places')[] = ['places'];
const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '0.5rem' };
const defaultCenter = { lat: 19.4326, lng: -99.1332 };
type LocatedOrder = MonitoringOrder & { pickup?: { latitude: number; longitude: number }; delivery?: { latitude: number; longitude: number }; path?: readonly { latitude: number; longitude: number }[] };
type LocatedIncident = MonitoringIncident & { latitude?: number; longitude?: number };
export type OperationsPlaybackPoint = { latitude: number; longitude: number; recordedAt: string; speed?: number | null; course?: number | null };
export type OperationsMapProps = { riders: readonly MonitoringRiderWithLocation[]; orders: readonly LocatedOrder[]; incidents?: readonly LocatedIncident[]; selectedEntity: MonitoringSelection | null; selectedOrderId?: string | null; selectedRiderId?: string | null; onSelectEntity: (selection: MonitoringSelection | null) => void; historyPath?: readonly { latitude: number; longitude: number }[]; playbackPoint?: OperationsPlaybackPoint | null; resetCameraToken?: number };

export function isValidCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function applyFreshLocationPatch(rider: MonitoringRiderWithLocation, patch: MonitoringRiderWithLocation): MonitoringRiderWithLocation {
  const incoming = Date.parse(patch.lastLocationReceivedAt ?? patch.lastLocationUpdate ?? '');
  const current = Date.parse(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate ?? '');
  return Number.isFinite(incoming) && (!Number.isFinite(current) || incoming >= current) ? { ...rider, ...patch } : rider;
}

export function OperationsMap({ riders, orders, incidents = [], selectedEntity, selectedOrderId: _selectedOrderId = null, selectedRiderId: _selectedRiderId = null, onSelectEntity, historyPath = [], playbackPoint = null, resetCameraToken = 0 }: OperationsMapProps) {
  const { isLoaded, loadError } = useLoadScript({ id: GOOGLE_MAPS_LOADER_ID, googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', libraries });
  const mapRef = useRef<google.maps.Map | null>(null); const interactedRef = useRef(false); const lastResetRef = useRef(resetCameraToken); const [animatedRiders, setAnimatedRiders] = useState(riders); const previousRidersRef = useRef(riders); const ridersRef = useRef(riders); const ordersRef = useRef(orders); ridersRef.current = riders; ordersRef.current = orders;
  const options = useMemo(() => ({ disableDefaultUI: true, zoomControl: true }), []);
  const clusterOptions = useMemo(() => ({ gridSize: 56, maxZoom: 16, minimumClusterSize: 2 }), []);
  const fitAll = useCallback(() => {
    const map = mapRef.current; if (!map) return;
    const currentRiders = ridersRef.current; const currentOrders = ordersRef.current;
    if (currentRiders.length + currentOrders.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    let points = 0;
    currentRiders.forEach((rider) => { if (isValidCoordinate(rider.latitude, rider.longitude) && typeof rider.longitude === 'number') { bounds.extend({ lat: rider.latitude, lng: rider.longitude }); points += 1; } });
    currentOrders.forEach((order) => { if (order.pickup && isValidCoordinate(order.pickup.latitude, order.pickup.longitude)) { bounds.extend({ lat: order.pickup.latitude, lng: order.pickup.longitude }); points += 1; } });
    if (points > 0) map.fitBounds(bounds);
  }, []);
  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    fitAll();
  }, [fitAll]);
  const refocus = useCallback((selection: MonitoringSelection | null) => {
    const map = mapRef.current; if (!map) return;
    const rider = selection?.kind === 'rider' ? riders.find((item) => item.id === selection.id) : undefined;
    const order = selection?.kind === 'order' ? orders.find((item) => item.id === selection.id) : undefined;
    const incident = selection?.kind === 'incident' ? incidents.find((item) => String(item.id) === selection.id) : undefined;
    const point = rider && isValidCoordinate(rider.latitude, rider.longitude) && typeof rider.longitude === 'number' ? { lat: rider.latitude, lng: rider.longitude } : order?.pickup && isValidCoordinate(order.pickup.latitude, order.pickup.longitude) ? { lat: order.pickup.latitude, lng: order.pickup.longitude } : incident && isValidCoordinate(incident.latitude, incident.longitude) && typeof incident.longitude === 'number' ? { lat: incident.latitude, lng: incident.longitude } : null;
    if (point) { map.panTo(point); if ((map.getZoom() ?? 0) < 14) map.setZoom(14); }
  }, [incidents, orders, riders]);
  useEffect(() => { if (selectedEntity) refocus(selectedEntity); }, [refocus, selectedEntity]);
  useEffect(() => { if (resetCameraToken !== lastResetRef.current) { lastResetRef.current = resetCameraToken; interactedRef.current = false; fitAll(); if (selectedEntity) refocus(selectedEntity); } }, [fitAll, refocus, resetCameraToken, selectedEntity]);
  useEffect(() => { const previous = new Map(previousRidersRef.current.map((rider) => [rider.id, rider])); const changed = riders.some((rider) => { const old = previous.get(rider.id); return old?.latitude !== rider.latitude || old?.longitude !== rider.longitude; }); setAnimatedRiders(riders); if (changed) previousRidersRef.current = riders; }, [riders]);
  if (loadError) return <div role="alert">Error al cargar el mapa</div>;
  if (!isLoaded) return <Skeleton className="h-full w-full rounded-lg" />;
  const visibleOrders = selectedEntity?.kind === 'order' ? orders.filter((order) => order.id === selectedEntity.id) : selectedEntity === null ? orders : [];
  return <div className="h-full w-full"><GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={12} options={options} onLoad={onLoad} onUnmount={() => { mapRef.current = null; }} onDragStart={() => { interactedRef.current = true; }} onZoomChanged={() => { interactedRef.current = true; }} onClick={() => { interactedRef.current = true; onSelectEntity(null); }}>
    <MarkerClustererF options={clusterOptions}>{(clusterer) => <>{animatedRiders.filter((rider) => isValidCoordinate(rider.latitude, rider.longitude)).map((rider) => <MarkerF key={rider.id} clusterer={clusterer} position={{ lat: rider.latitude as number, lng: rider.longitude as number }} title={`Rider ${rider.id}`} icon={{ path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, rotation: rider.course ?? 0 }} onClick={() => onSelectEntity({ kind: 'rider', id: rider.id })} />)}</>}</MarkerClustererF>
    {visibleOrders.map((order) => <Fragment key={order.id}>{order.pickup && isValidCoordinate(order.pickup.latitude, order.pickup.longitude) ? <MarkerF key={`pickup-${order.id}`} position={{ lat: order.pickup.latitude, lng: order.pickup.longitude }} title={`Pickup ${order.id}`} onClick={() => onSelectEntity({ kind: 'order', id: order.id })} /> : null}{order.delivery && isValidCoordinate(order.delivery.latitude, order.delivery.longitude) ? <MarkerF key={`delivery-${order.id}`} position={{ lat: order.delivery.latitude, lng: order.delivery.longitude }} title={`Entrega ${order.id}`} onClick={() => onSelectEntity({ kind: 'order', id: order.id })} /> : null}{order.id === selectedEntity?.id && order.path && order.path.length > 1 ? <PolylineF key={`path-${order.id}`} path={order.path.filter((point) => isValidCoordinate(point.latitude, point.longitude)).map((point) => ({ lat: point.latitude, lng: point.longitude }))} options={{ strokeColor: '#f59e0b', strokeOpacity: 0.7, strokeWeight: 3 }} /> : null}</Fragment>)}
    {historyPath.length > 1 ? <PolylineF path={historyPath.filter((point) => isValidCoordinate(point.latitude, point.longitude)).map((point) => ({ lat: point.latitude, lng: point.longitude }))} options={{ strokeColor: '#2563eb', strokeOpacity: 0.85, strokeWeight: 4 }} /> : null}
    {playbackPoint && isValidCoordinate(playbackPoint.latitude, playbackPoint.longitude) ? <><MarkerF position={{ lat: playbackPoint.latitude, lng: playbackPoint.longitude }} title="Playback position" icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#2563eb', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }} /><OverlayViewF position={{ lat: playbackPoint.latitude, lng: playbackPoint.longitude }} mapPaneName="floatPane"><div className="pointer-events-none rounded-md border border-blue-200 bg-white px-2 py-1 text-xs shadow">Replay {new Date(playbackPoint.recordedAt).toLocaleTimeString()}</div></OverlayViewF></> : null}
    {incidents.filter((incident) => isValidCoordinate(incident.latitude, incident.longitude)).map((incident) => <MarkerF key={`incident-${incident.id}`} position={{ lat: incident.latitude as number, lng: incident.longitude as number }} title={`Incidente ${incident.id}`} onClick={() => onSelectEntity({ kind: 'incident', id: String(incident.id) })} />)}
  </GoogleMap></div>;
}
