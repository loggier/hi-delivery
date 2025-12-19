

"use client";

import React, { useCallback, useRef } from "react";
import { GoogleMap, DrawingManager, Polygon } from '@react-google-maps/api';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash } from "lucide-react";
import { type Area } from "@/types";

interface GeofenceMapProps {
    isLoaded: boolean;
    loadError?: Error;
    mainGeofence?: { lat: number; lng: number }[];
    onMainGeofenceChange: (path: { lat: number; lng: number }[]) => void;
    subGeofences?: Area[];
    isDrawing?: boolean;
    isCreatingZone?: boolean; // Flag to indicate if we are on the "new zone" page
    newAreaPath?: { lat: number; lng: number }[] | null;
    onDrawingComplete?: (path: { lat: number; lng: number }[]) => void;
    onMapLoad?: (map: google.maps.Map) => void;
    onMapDragEnd?: () => void;
    onMapZoomChanged?: () => void;
    mapCenter?: google.maps.LatLngLiteral;
    mapZoom?: number;
}

export const GeofenceMap: React.FC<GeofenceMapProps> = ({
    isLoaded,
    loadError,
    mainGeofence,
    onMainGeofenceChange,
    subGeofences = [],
    isDrawing = false,
    isCreatingZone = false,
    newAreaPath,
    onDrawingComplete,
    onMapLoad,
    onMapDragEnd,
    onMapZoomChanged,
    mapCenter,
    mapZoom,
}) => {
    const mainPolygonRef = useRef<google.maps.Polygon | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        if (onMapLoad) onMapLoad(map);
        if (isLoaded && mainGeofence && mainGeofence.length > 0 && window.google) {
             const bounds = new window.google.maps.LatLngBounds();
             mainGeofence.forEach(coord => bounds.extend(coord));
             map.fitBounds(bounds);
        }
    }, [onMapLoad, mainGeofence, isLoaded]);

    const onPolygonEdit = useCallback(() => {
        if (mainPolygonRef.current) {
            const newPath = mainPolygonRef.current.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
            onMainGeofenceChange(newPath);
        }
    }, [onMainGeofenceChange]);

    const handleDrawingComplete = useCallback((polygon: google.maps.Polygon) => {
        const path = polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
        if (isCreatingZone) {
            onMainGeofenceChange(path);
        } else if (onDrawingComplete) {
            onDrawingComplete(path);
        }

        polygon.setMap(null); 
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
    }, [onDrawingComplete, isCreatingZone, onMainGeofenceChange]);
    
    const clearGeofence = () => {
        onMainGeofenceChange([]);
    }
    
    if (loadError) return <div>Error cargando el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-[500px] w-full" />;

    const showDrawingManager = isLoaded && (isDrawing || (isCreatingZone && (!mainGeofence || mainGeofence.length === 0)));

    return (
        <div className="relative">
            <GoogleMap
                mapContainerStyle={{ height: '500px', width: '100%' }}
                center={mapCenter}
                zoom={mapZoom}
                onLoad={handleMapLoad}
                onDragEnd={onMapDragEnd}
                onZoomChanged={onMapZoomChanged}
                options={{ mapTypeControl: false, streetViewControl: false }}
            >
                {showDrawingManager && window.google && (
                    <DrawingManager
                        onLoad={(dm) => { drawingManagerRef.current = dm; }}
                        onPolygonComplete={handleDrawingComplete}
                        drawingMode={window.google.maps.drawing.OverlayType.POLYGON}
                        options={{
                            drawingControl: false, // Deshabilita la barra de herramientas del DrawingManager
                            polygonOptions: {
                                fillColor: "hsl(var(--hid-primary))",
                                fillOpacity: 0.3,
                                strokeWeight: 2,
                                strokeColor: "hsl(var(--hid-primary))",
                                clickable: false,
                                editable: true,
                                zIndex: 3,
                            },
                        }}
                    />
                )}

                {mainGeofence && mainGeofence.length > 0 && (
                    <Polygon
                        paths={mainGeofence}
                        editable={!isDrawing}
                        draggable={!isDrawing}
                        onMouseUp={onPolygonEdit}
                        onDragEnd={onPolygonEdit}
                        onLoad={(poly) => { mainPolygonRef.current = poly; }}
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

                {newAreaPath && (
                     <Polygon
                        paths={newAreaPath}
                        options={{
                            fillColor: "#FF0000",
                            fillOpacity: 0.3,
                            strokeColor: "#FF0000",
                            strokeWeight: 2,
                            zIndex: 3,
                        }}
                    />
                )}

                {subGeofences.map(area => (
                    <Polygon
                        key={area.id}
                        paths={area.geofence}
                        options={{
                            fillColor: area.color || "hsl(var(--hid-secondary))",
                            fillOpacity: 0.2,
                            strokeColor: area.color || "hsl(var(--hid-secondary))",
                            strokeWeight: 1,
                            zIndex: 2,
                        }}
                    />
                ))}
            </GoogleMap>
            {mainGeofence && mainGeofence.length > 0 && !isDrawing && (
                 <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute bottom-4 left-4 z-10"
                    onClick={clearGeofence}
                >
                    <Trash className="mr-2 h-4 w-4" />
                    Limpiar Geocerca Principal
                </Button>
            )}
        </div>
    );
};
