
"use client";

import React, { useEffect, useCallback, useRef } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, useLoadScript } from '@react-google-maps/api';
import { Rider } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const libraries: ('places')[] = ['places'];

interface LiveMapProps {
  riders: Rider[];
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

export function LiveMap({ riders }: LiveMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [selectedRider, setSelectedRider] = React.useState<Rider | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (mapRef.current && riders.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      let activeRidersFound = 0;
      riders.forEach(rider => {
        if (rider.last_latitude && rider.last_longitude) {
          bounds.extend(new window.google.maps.LatLng(rider.last_latitude, rider.last_longitude));
          activeRidersFound++;
        }
      });
      if (activeRidersFound > 0) {
        mapRef.current.fitBounds(bounds);
        // Si solo hay un repartidor, el zoom puede ser demasiado cercano. Lo ajustamos.
        if (activeRidersFound === 1) {
            const listener = window.google.maps.event.addListener(mapRef.current, "idle", function() {
                if (mapRef.current) {
                  if (mapRef.current.getZoom()! > 15) mapRef.current.setZoom(15);
                  window.google.maps.event.removeListener(listener);
                }
            });
        }
      }
    }
  }, [riders]);


  if (loadError) return <div>Error al cargar el mapa</div>;
  if (!isLoaded) return <Skeleton className="w-full h-full rounded-lg" />;
  
  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
  };

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={12}
      options={mapOptions}
      onLoad={onMapLoad}
      onUnmount={onUnmount}
    >
      {riders.map((rider) =>
        rider.last_latitude && rider.last_longitude ? (
          <MarkerF
            key={rider.id}
            position={{ lat: rider.last_latitude, lng: rider.last_longitude }}
            onClick={() => setSelectedRider(rider)}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                  <path fill="%23${rider.is_active_for_orders ? '0F62FE' : '64748b'}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 32),
            }}
          />
        ) : null
      )}

      {selectedRider && selectedRider.last_latitude && selectedRider.last_longitude && (
        <InfoWindowF
          position={{ lat: selectedRider.last_latitude, lng: selectedRider.last_longitude }}
          onCloseClick={() => setSelectedRider(null)}
        >
          <div className="p-2 space-y-2 text-sm">
            <h4 className="font-bold">{selectedRider.first_name} {selectedRider.last_name}</h4>
            <p className="flex items-center gap-2">
                <User className="h-4 w-4"/>
                {selectedRider.is_active_for_orders ? 'Activo' : 'Inactivo'}
            </p>
            {selectedRider.last_location_update && (
                <p className="text-xs text-muted-foreground">
                    Última act: {format(new Date(selectedRider.last_location_update), 'HH:mm:ss', {locale: es})}
                </p>
            )}
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
