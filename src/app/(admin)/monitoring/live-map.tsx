
"use client";

import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useCallback, useRef } from 'react';
import { GoogleMap, MarkerClustererF, MarkerF, OverlayViewF, PolylineF, useLoadScript } from '@react-google-maps/api';
import { Rider } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, User, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const libraries: ('places')[] = ['places'];

interface LiveMapProps {
  riders: Rider[];
  activeOrderRiderIds: Set<string>;
  activeOrderByRiderId: Map<string, { id: string }>;
  selectedRiderId?: string | null;
  historyPath?: Array<{
    latitude: number;
    longitude: number;
    recorded_at: string;
    speed?: number | null;
    course?: number | null;
  }>;
  playbackPoint?: {
    latitude: number;
    longitude: number;
    recorded_at: string;
    speed?: number | null;
    course?: number | null;
  } | null;
  onSelectRider?: (rider: Rider | null) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: 19.4326, // Mexico City
  lng: -99.1332,
};

export function LiveMap({
  riders,
  activeOrderRiderIds,
  activeOrderByRiderId,
  selectedRiderId,
  historyPath = [],
  playbackPoint = null,
  onSelectRider,
}: LiveMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    id: "hi-delivery-monitoring-google-maps",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [selectedRider, setSelectedRider] = React.useState<Rider | null>(null);
  const [animatedRiders, setAnimatedRiders] = React.useState<Rider[]>(riders);
  const mapRef = useRef<google.maps.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousRidersRef = useRef<Rider[]>(riders);
  const isHistoryMode = Boolean(selectedRiderId && historyPath.length > 0);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!selectedRiderId) {
      setSelectedRider(null);
      return;
    }

    const rider = riders.find((item) => item.id === selectedRiderId) ?? null;
    setSelectedRider(rider);
  }, [selectedRiderId, riders]);

  useEffect(() => {
    const previousById = new Map(previousRidersRef.current.map((rider) => [rider.id, rider]));
    const nextSnapshot = riders;
    const animatedFrom = nextSnapshot.map((rider) => {
      const previous = previousById.get(rider.id);
      if (
        previous &&
        typeof previous.last_latitude === 'number' &&
        typeof previous.last_longitude === 'number' &&
        typeof rider.last_latitude === 'number' &&
        typeof rider.last_longitude === 'number'
      ) {
        return {
          ...rider,
          last_latitude: previous.last_latitude,
          last_longitude: previous.last_longitude,
        };
      }
      return rider;
    });

    setAnimatedRiders(animatedFrom);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const duration = 900;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedRiders(
        nextSnapshot.map((rider) => {
          const previous = previousById.get(rider.id);
          if (
            previous &&
            typeof previous.last_latitude === 'number' &&
            typeof previous.last_longitude === 'number' &&
            typeof rider.last_latitude === 'number' &&
            typeof rider.last_longitude === 'number'
          ) {
            return {
              ...rider,
              last_latitude: previous.last_latitude + (rider.last_latitude - previous.last_latitude) * eased,
              last_longitude: previous.last_longitude + (rider.last_longitude - previous.last_longitude) * eased,
            };
          }
          return rider;
        })
      );

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        previousRidersRef.current = nextSnapshot;
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      previousRidersRef.current = nextSnapshot;
    };
  }, [riders]);

  useEffect(() => {
    if (mapRef.current && selectedRider?.last_latitude && selectedRider?.last_longitude) {
      mapRef.current.panTo({
        lat: selectedRider.last_latitude,
        lng: selectedRider.last_longitude,
      });
      if ((mapRef.current.getZoom() ?? 0) < 14) {
        mapRef.current.setZoom(14);
      }
    }
  }, [selectedRider]);

  useEffect(() => {
    if (
      mapRef.current &&
      selectedRiderId &&
      historyPath.length > 1
    ) {
      const bounds = new window.google.maps.LatLngBounds();
      historyPath.forEach((point) => {
        bounds.extend(
          new window.google.maps.LatLng(point.latitude, point.longitude),
        );
      });
      mapRef.current.fitBounds(bounds);
      const listener = window.google.maps.event.addListener(mapRef.current, 'idle', function () {
        if (mapRef.current) {
          if ((mapRef.current.getZoom() ?? 0) > 18) {
            mapRef.current.setZoom(18);
          }
          window.google.maps.event.removeListener(listener);
        }
      });
      return;
    }

    if (mapRef.current && animatedRiders.length > 0) {
      if (selectedRiderId) {
        return;
      }
      const bounds = new window.google.maps.LatLngBounds();
      let activeRidersFound = 0;
      animatedRiders.forEach(rider => {
        if (rider.last_latitude && rider.last_longitude) {
          bounds.extend(new window.google.maps.LatLng(rider.last_latitude, rider.last_longitude));
          activeRidersFound++;
        }
      });
      if (activeRidersFound > 0) {
        mapRef.current.fitBounds(bounds);
        const listener = window.google.maps.event.addListener(mapRef.current, "idle", function() {
            if (mapRef.current) {
              if ((mapRef.current.getZoom() ?? 0) > 18) {
                mapRef.current.setZoom(18);
              }
              window.google.maps.event.removeListener(listener);
            }
        });
      }
    }
  }, [animatedRiders, historyPath, selectedRiderId]);

  useEffect(() => {
    return undefined;
  }, []);


  if (loadError) return <div>Error al cargar el mapa</div>;
  if (!isLoaded) return <Skeleton className="w-full h-full rounded-lg" />;

  const visibleRiders = isHistoryMode && selectedRiderId
    ? animatedRiders.filter((rider) => rider.id === selectedRiderId)
    : animatedRiders;
  const selectedTimestamp = playbackPoint?.recorded_at ?? selectedRider?.last_location_update ?? null;
  const selectedSpeed = typeof playbackPoint?.speed === 'number'
    ? playbackPoint.speed
    : selectedRider?.last_speed;
  
  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
  };

  const clusterOptions = {
    gridSize: 56,
    maxZoom: 16,
    minimumClusterSize: 2,
    styles: [
      {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="24" fill="#0f172a" fill-opacity="0.88"/>
            <circle cx="26" cy="26" r="17" fill="#ffffff"/>
          </svg>
        `),
        height: 52,
        width: 52,
        textColor: "#0f172a",
        textSize: 14,
        fontWeight: "700",
      },
    ],
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={12}
      options={mapOptions}
      onClick={() => {
        setSelectedRider(null);
        onSelectRider?.(null);
      }}
      onLoad={onMapLoad}
      onUnmount={onUnmount}
    >
      <MarkerClustererF options={clusterOptions}>
        {(clusterer) => (
          <>
            {visibleRiders.map((rider) =>
              rider.last_latitude && rider.last_longitude ? (
                (() => {
                  const hasActiveOrder = activeOrderRiderIds.has(rider.id);
                  const labelText = `${rider.first_name} ${rider.last_name}`;
                  const statusColorClass = hasActiveOrder ? "bg-amber-500" : "bg-green-600";
                  const isSelected = selectedRider?.id === rider.id;
                  const effectiveLatitude =
                    isSelected && playbackPoint ? playbackPoint.latitude : rider.last_latitude;
                  const effectiveLongitude =
                    isSelected && playbackPoint ? playbackPoint.longitude : rider.last_longitude;
                  const effectiveCourse =
                    isSelected && typeof playbackPoint?.course === 'number'
                      ? playbackPoint.course
                      : typeof rider.last_course === 'number'
                        ? rider.last_course
                        : 0;

                  return (
                    <React.Fragment key={rider.id}>
                      <MarkerF
                        clusterer={clusterer}
                        position={{ lat: effectiveLatitude, lng: effectiveLongitude }}
                        title={labelText}
                        onClick={() => {
                          setSelectedRider(rider);
                          onSelectRider?.(rider);
                        }}
                        icon={{
                          url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
                          scaledSize: new window.google.maps.Size(1, 1),
                        }}
                        opacity={rider.is_active_for_orders ? 1 : 0.5}
                        zIndex={isSelected ? 1000 : undefined}
                      />
                      <OverlayViewF
                        position={{ lat: effectiveLatitude, lng: effectiveLongitude }}
                        mapPaneName="overlayMouseTarget"
                        getPixelPositionOffset={() => ({
                          x: isSelected ? -24 : -20,
                          y: isSelected ? -24 : -20,
                        })}
                      >
                        <button
                          type="button"
                          className="pointer-events-auto"
                          onClick={() => {
                            setSelectedRider(rider);
                            onSelectRider?.(rider);
                          }}
                        >
                          <Image
                            src="/repartidor.png"
                            alt={labelText}
                            width={48}
                            height={48}
                            unoptimized
                            className="block object-contain drop-shadow-sm"
                            style={{
                              width: isSelected ? 48 : 40,
                              height: isSelected ? 48 : 40,
                              transform: `rotate(${effectiveCourse}deg)`,
                              transformOrigin: 'center center',
                              opacity: rider.is_active_for_orders ? 1 : 0.5,
                            }}
                          />
                        </button>
                      </OverlayViewF>
                      <OverlayViewF
                        position={{ lat: effectiveLatitude, lng: effectiveLongitude }}
                        mapPaneName="overlayMouseTarget"
                        getPixelPositionOffset={(width, height) => ({
                          x: -(width / 2),
                          y: -(height + 44),
                        })}
                      >
                        <button
                          type="button"
                          className="pointer-events-auto"
                          onClick={() => {
                            setSelectedRider(rider);
                            onSelectRider?.(rider);
                          }}
                        >
                          <div className="flex items-stretch overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                            <div className={`w-[10px] ${statusColorClass}`} />
                            <div className={`px-2 py-1 text-xs font-bold text-slate-900 whitespace-nowrap ${isSelected ? "bg-slate-50" : ""}`}>
                              {labelText}
                            </div>
                          </div>
                        </button>
                      </OverlayViewF>
                    </React.Fragment>
                  );
                })()
              ) : null
            )}
          </>
        )}
      </MarkerClustererF>

      {historyPath.length > 1 ? (
        <PolylineF
          path={historyPath.map((point) => ({
            lat: point.latitude,
            lng: point.longitude,
          }))}
          options={{
            strokeColor: '#2563eb',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            zIndex: 50,
          }}
        />
      ) : null}

      {playbackPoint ? (
        <>
          <MarkerF
            position={{ lat: playbackPoint.latitude, lng: playbackPoint.longitude }}
            zIndex={1200}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeOpacity: 1,
              strokeWeight: 3,
            }}
          />
          <OverlayViewF
            position={{ lat: playbackPoint.latitude, lng: playbackPoint.longitude }}
            mapPaneName="floatPane"
            getPixelPositionOffset={(width, height) => ({
              x: -(width / 2),
              y: -(height + 42),
            })}
          >
            <div className="pointer-events-none relative min-w-[160px] rounded-xl border border-blue-200 bg-white px-3 py-2 shadow-lg">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <History className="h-3.5 w-3.5 text-blue-600" />
                  Replay
                </div>
                <p className="text-[11px] text-slate-700">
                  {format(new Date(playbackPoint.recorded_at), 'dd MMM HH:mm:ss', { locale: es })}
                </p>
                {typeof playbackPoint.speed === 'number' ? (
                  <p className="text-[11px] text-muted-foreground">
                    {Math.round(playbackPoint.speed)} KPH
                  </p>
                ) : null}
              </div>
              <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-blue-200 bg-white" />
            </div>
          </OverlayViewF>
        </>
      ) : null}

      {selectedRider && selectedRider.last_latitude && selectedRider.last_longitude && (
        <OverlayViewF
          position={{
            lat: playbackPoint?.latitude ?? selectedRider.last_latitude,
            lng: playbackPoint?.longitude ?? selectedRider.last_longitude,
          }}
          mapPaneName="floatPane"
          getPixelPositionOffset={(width, height) => ({
            x: -(width / 2),
            y: -(height + 54),
          })}
        >
          <div className="pointer-events-auto relative min-w-[164px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <div className="space-y-1.5 text-sm">
              <h4 className="font-bold leading-tight text-slate-900">
                {selectedRider.first_name} {selectedRider.last_name}
              </h4>
              <p className="flex items-center gap-2 leading-none text-slate-700">
                  <User className="h-3.5 w-3.5"/>
                  {activeOrderRiderIds.has(selectedRider.id) ? 'Con pedido activo' : selectedRider.is_active_for_orders ? 'Disponible' : 'Inactivo'}
              </p>
              {selectedTimestamp && (
                  <p className="text-[11px] leading-none text-muted-foreground">
                      {playbackPoint ? 'Punto:' : 'Última act:'} {format(new Date(selectedTimestamp), 'HH:mm:ss', {locale: es})}
                  </p>
              )}
              {typeof selectedSpeed === 'number' ? (
                <p className="text-[11px] leading-none text-muted-foreground">
                  Velocidad: {Math.round(selectedSpeed)} KPH
                </p>
              ) : null}
              {activeOrderByRiderId.has(selectedRider.id) ? (
                <Link
                  href={`/orders/${activeOrderByRiderId.get(selectedRider.id)?.id}`}
                  className="inline-flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  Ver pedido activo
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
            <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
          </div>
        </OverlayViewF>
      )}
    </GoogleMap>
    </div>
  );
}
