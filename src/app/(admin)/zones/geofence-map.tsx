
"use client";

import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
import { useLoadScript, GoogleMap, DrawingManager, Polygon } from '@react-google-maps/api';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash } from "lucide-react";

interface GeofenceMapProps {
    value?: { lat: number; lng: number }[];
    onValueChange: (path: { lat: number; lng: number }[]) => void;
    subGeofences?: { id: string; geofence: { lat: number; lng: number }[] }[];
    isDrawing?: boolean;
    onDrawingComplete?: (path: { lat: number; lng: number }[]) => void;
    onMapLoad?: (map: google.maps.Map) => void;
    onMapDragEnd?: () => void;
    onMapZoomChanged?: () => void;
    mapCenter?: google.maps.LatLngLiteral;
    mapZoom?: number;
}

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

export const GeofenceMap: React.FC<GeofenceMapProps> = ({
    value,
    onValueChange,
    subGeofences = [],
    isDrawing = false,
    onDrawingComplete,
    onMapLoad,
    onMapDragEnd,
    onMapZoomChanged,
    mapCenter: controlledMapCenter,
    mapZoom,
}) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const polygonRef = useRef<google.maps.Polygon | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    const initialCenter = useMemo(() => {
        if (controlledMapCenter) return controlledMapCenter;
        if (value && value.length > 0 && window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            value.forEach(coord => bounds.extend(coord));
            return bounds.getCenter().toJSON();
        }
        return { lat: 19.4326, lng: -99.1332 };
    }, [value, controlledMapCenter]);


    const handleMapLoad = useCallback((map: google.maps.Map) => {
        if (onMapLoad) onMapLoad(map);
        if (value && value.length > 0 && window.google) {
             const bounds = new window.google.maps.LatLngBounds();
             value.forEach(coord => bounds.extend(coord));
             map.fitBounds(bounds);
        }
    }, [onMapLoad, value]);

    const onPolygonEdit = useCallback(() => {
        if (polygonRef.current) {
            const newPath = polygonRef.current.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
            onValueChange(newPath);
        }
    }, [onValueChange]);

    const handleDrawingComplete = useCallback((polygon: google.maps.Polygon) => {
        const path = polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
        if (onDrawingComplete) {
            onDrawingComplete(path);
        }
        polygon.setMap(null); 
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
    }, [onDrawingComplete]);
    
    const clearGeofence = () => {
        onValueChange([]);
    }

    if (loadError) return <div>Error cargando el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-[500px] w-full" />;

    return (
        <div className="relative">
            <GoogleMap
                mapContainerStyle={{ height: '500px', width: '100%' }}
                center={initialCenter}
                zoom={mapZoom}
                onLoad={handleMapLoad}
                onDragEnd={onMapDragEnd}
                onZoomChanged={onMapZoomChanged}
                options={{ mapTypeControl: false, streetViewControl: false }}
            >
                {isLoaded && (
                    <DrawingManager
                        onLoad={(dm) => { drawingManagerRef.current = dm; }}
                        onPolygonComplete={handleDrawingComplete}
                        options={{
                            drawingControl: isDrawing,
                            drawingControlOptions: {
                                position: window.google.maps.ControlPosition.TOP_CENTER,
                                drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
                            },
                            polygonOptions: {
                                fillColor: "#FF0000",
                                fillOpacity: 0.3,
                                strokeWeight: 2,
                                strokeColor: "#FF0000",
                                clickable: false,
                                editable: false,
                                zIndex: 1,
                            },
                        }}
                    />
                )}

                {value && value.length > 0 && (
                    <Polygon
                        paths={value}
                        editable
                        draggable
                        onMouseUp={onPolygonEdit}
                        onDragEnd={onPolygonEdit}
                        onLoad={(poly) => { polygonRef.current = poly; }}
                        options={{
                            fillColor: "hsl(var(--hid-primary))",
                            fillOpacity: 0.1,
                            strokeColor: "hsl(var(--hid-primary))",
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            zIndex: 1,
                        }}
                    />
                )}
                {subGeofences.map(area => (
                    <Polygon
                        key={area.id}
                        paths={area.geofence}
                        options={{
                            fillColor: "hsl(var(--hid-secondary))",
                            fillOpacity: 0.2,
                            strokeColor: "hsl(var(--hid-secondary))",
                            strokeWeight: 1,
                        }}
                    />
                ))}
            </GoogleMap>
            {value && value.length > 0 && (
                 <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute bottom-4 left-4 z-10"
                    onClick={clearGeofence}
                >
                    <Trash className="mr-2 h-4 w-4" />
                    Limpiar Geocerca
                </Button>
            )}
        </div>
    );
};
