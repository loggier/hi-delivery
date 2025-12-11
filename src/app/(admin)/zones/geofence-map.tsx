
"use client";

import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
import { useLoadScript, GoogleMap, DrawingManager, Polygon } from '@react-google-maps/api';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface GeofenceMapProps {
    mainGeofence?: { lat: number; lng: number }[];
    subGeofences?: { id: string; geofence: { lat: number; lng: number }[] }[];
    onMainGeofenceChange: (path: { lat: number; lng: number }[]) => void;
    isDrawing: boolean;
    onDrawingComplete: (path: { lat: number; lng: number }[]) => void;
    clearDrawing?: () => void;
}

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

export const GeofenceMap: React.FC<GeofenceMapProps> = ({
    mainGeofence,
    subGeofences = [],
    onMainGeofenceChange,
    isDrawing,
    onDrawingComplete,
    clearDrawing,
}) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const mainPolygonRef = useRef<google.maps.Polygon | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        mapRef.current = mapInstance;
        if (mainGeofence && mainGeofence.length > 0 && window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            mainGeofence.forEach(coord => bounds.extend(coord));
            mapInstance.fitBounds(bounds);
        }
    }, [mainGeofence]);

    const onMainPolygonEdit = useCallback(() => {
        if (mainPolygonRef.current) {
            const newPath = mainPolygonRef.current.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
            onMainGeofenceChange(newPath);
        }
    }, [onMainGeofenceChange]);

    const handleDrawingComplete = useCallback((polygon: google.maps.Polygon) => {
        const path = polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
        onDrawingComplete(path);
        polygon.setMap(null); // Remove the drawn polygon, parent state will re-render it
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
    }, [onDrawingComplete]);
    
    useEffect(() => {
        if(drawingManagerRef.current) {
            drawingManagerRef.current.setOptions({
                drawingControl: isDrawing,
                drawingMode: isDrawing ? window.google.maps.drawing.OverlayType.POLYGON : null,
            });
        }
    }, [isDrawing]);


    if (loadError) return <div>Error cargando el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-[500px] w-full" />;

    return (
        <GoogleMap
            mapContainerStyle={{ height: '500px', width: '100%' }}
            center={{ lat: 19.4326, lng: -99.1332 }}
            zoom={5}
            onLoad={onMapLoad}
            options={{ mapTypeControl: false, streetViewControl: false }}
        >
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

            {mainGeofence && (
                <Polygon
                    paths={mainGeofence}
                    editable
                    draggable
                    onMouseUp={onMainPolygonEdit}
                    onDragEnd={onMainPolygonEdit}
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
    );
};
