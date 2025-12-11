
"use client";

import React, { useCallback, useRef, useState, useMemo } from "react";
import { useLoadScript, GoogleMap, DrawingManager, Autocomplete, Polygon } from '@react-google-maps/api';
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface GeofenceMapProps {
    value?: { lat: number, lng: number }[];
    onChange: (value: { lat: number, lng: number }[] | undefined) => void;
    parentGeofence?: { lat: number, lng: number }[] | null;
}

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

export const GeofenceMap: React.FC<GeofenceMapProps> = ({ value, onChange, parentGeofence }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    mapRef.current = mapInstance;
    
    const geofenceToFit = value && value.length > 0 ? value : parentGeofence;
    
    if (geofenceToFit && geofenceToFit.length > 0 && typeof window !== 'undefined' && window.google) {
        const bounds = new window.google.maps.LatLngBounds();
        geofenceToFit.forEach(coord => bounds.extend(coord));
        mapInstance.fitBounds(bounds);
    }
  }, [parentGeofence, value]);

  const mapCenter = useMemo(() => {
    if (!isLoaded) return { lat: 19.4326, lng: -99.1332 };
    
    const getCenter = (coords: { lat: number; lng: number }[]) => {
      const bounds = new window.google.maps.LatLngBounds();
      coords.forEach(coord => bounds.extend(coord));
      return bounds.getCenter().toJSON();
    };

    if (value && value.length > 0) return getCenter(value);
    if (parentGeofence && parentGeofence.length > 0) return getCenter(parentGeofence);
    
    return { lat: 19.4326, lng: -99.1332 };
  }, [value, parentGeofence, isLoaded]);

  const onPolygonComplete = useCallback((poly: google.maps.Polygon) => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    polygonRef.current = poly;
    const path = poly.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
    onChange(path);
    poly.setMap(null); // The main polygon is rendered based on `value`, so hide the drawing manager's one
  }, [onChange]);

  const onPolygonEdit = useCallback(() => {
    if (polygonRef.current) {
      const newPath = polygonRef.current.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
      onChange(newPath);
    }
  }, [onChange]);

  const clearGeofence = () => {
    onChange(undefined);
  };
  
  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current && mapRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place?.geometry?.viewport) {
        mapRef.current.fitBounds(place.geometry.viewport);
      } else if (place?.geometry?.location) {
        mapRef.current.setCenter(place.geometry.location);
        mapRef.current.setZoom(12);
      }
    }
  };

  if (loadError) return <div>Error cargando el mapa. Por favor, revisa la API Key de Google Maps.</div>;
  
  if (!isLoaded) return <Skeleton className="h-[500px] w-full" />;

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
        center={mapCenter}
        zoom={12}
        onLoad={onMapLoad}
        options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: true }}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-80">
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                <input
                    type="text"
                    placeholder="Buscar una ubicación..."
                    className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background shadow-md",
                        "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    )}
                />
            </Autocomplete>
        </div>

        <DrawingManager
            onPolygonComplete={onPolygonComplete}
            options={{
              drawingControl: true,
              drawingControlOptions: {
                position: window.google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
              },
              polygonOptions: {
                fillColor: "hsl(var(--hid-primary))",
                fillOpacity: 0.2,
                strokeColor: "hsl(var(--hid-primary))",
                strokeWeight: 2,
                clickable: true,
                editable: true,
                zIndex: 1,
              },
            }}
        />

        {parentGeofence && (
             <Polygon
                paths={parentGeofence}
                options={{
                    fillColor: "#9ca3af",
                    fillOpacity: 0.1,
                    strokeColor: "#6b7280",
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    clickable: false,
                    editable: false,
                    zIndex: 0,
                }}
            />
        )}

        {value && (
          <Polygon
            paths={value}
            editable
            draggable
            onMouseUp={onPolygonEdit}
            onDragEnd={onPolygonEdit}
            onLoad={(p) => { polygonRef.current = p; }}
            onUnmount={() => { polygonRef.current = null; }}
            options={{
              fillColor: "hsl(var(--hid-primary))",
              fillOpacity: 0.3,
              strokeColor: "hsl(var(--hid-primary))",
              strokeWeight: 2,
            }}
          />
        )}
      </GoogleMap>

      {value && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="absolute top-4 right-4 z-10"
          onClick={clearGeofence}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
};
