

"use client";

import { useState, useEffect, useCallback } from 'react';
import { Business, CustomerAddress, Plan, BusinessBranch } from '@/types';
import { api } from '@/lib/api';

const OSRM_ROUTE_URL = process.env.NEXT_PUBLIC_OSRM_ROUTE_URL || 'https://nominatim.vemontech.com/route/v1/driving';

type LatLng = { lat: number; lng: number };

export interface WoosmapRoutePath {
    provider: 'osrm';
    polyline: string;
    points: LatLng[];
    distance: number;
    duration_seconds: number;
}

export interface ShippingInfo {
    distance: number; // in meters
    duration: string;
    durationSeconds: number;
    cost: number;
    directions: google.maps.DirectionsResult | null;
    routePath: WoosmapRoutePath | null;
}

type PickupLocation = Pick<Business | BusinessBranch, 'id' | 'name' | 'address_line' | 'latitude' | 'longitude'> & { business_id?: string };

function decodePolyline(encoded: string): LatLng[] {
    const points: LatLng[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte: number;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += deltaLat;

        shift = 0;
        result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += deltaLng;

        points.push({
            lat: lat / 1e5,
            lng: lng / 1e5,
        });
    }

    return points;
}

function formatDurationFromSeconds(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.max(1, Math.round((totalSeconds % 3600) / 60));
    if (hours > 0) return `${hours} h ${minutes} min`;
    return `${minutes} min`;
}

function extractNumericValue(value: any): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value === 'object') {
        return extractNumericValue(value.value ?? value.amount ?? value.distance ?? value.duration);
    }
    return 0;
}

function haversineDistanceMeters(a: LatLng, b: LatLng): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchOsrmRoute(origin: LatLng, destination: LatLng) {
    const url = `${OSRM_ROUTE_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline&steps=false`;
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok || payload?.code !== 'Ok' || !payload?.routes?.[0]) {
        throw new Error(payload?.message || 'OSRM route unavailable');
    }

    const route = payload.routes[0];
    const polyline = route.geometry || '';
    const points = polyline ? decodePolyline(polyline) : [origin, destination];
    return {
        polyline,
        points,
        distance: extractNumericValue(route.distance),
        durationSeconds: extractNumericValue(route.duration),
    };
}

export const useShippingCalculation = (pickupLocation: PickupLocation | null, address: CustomerAddress | null, isMapsLoaded: boolean): { shippingInfo: ShippingInfo | null, isLoading: boolean, error: string | null } => {
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const businessId = pickupLocation?.id.startsWith('biz-') 
        ? pickupLocation.id 
        : (pickupLocation as BusinessBranch)?.business_id;

    const { data: business, isLoading: isLoadingBusiness } = api.businesses.useGetOne(businessId || '', {
        enabled: !!businessId
    });

    const { data: plan, isLoading: isLoadingPlan } = api.plans.useGetOne(business?.plan_id || '', {
        enabled: !!business?.plan_id
    });

    const calculateRoute = useCallback(async () => {
        if (!isMapsLoaded || !pickupLocation?.latitude || !pickupLocation?.longitude || !address?.latitude || !address?.longitude) {
            setShippingInfo(null);
            setError(null);
            return;
        }

        if (!plan) {
            if (!isLoadingPlan && !isLoadingBusiness) {
                setError("El negocio no tiene un plan de suscripción activo para calcular el envío.");
            }
            return;
        }

        setIsLoading(true);
        setError(null);

            const originPoint = { lat: pickupLocation.latitude, lng: pickupLocation.longitude };
            const destinationPoint = { lat: address.latitude, lng: address.longitude };

        try {
            let distanceInMeters = 0;
            let durationSeconds = 0;
            let encodedPolyline = '';

            try {
                const osrmRoute = await fetchOsrmRoute(originPoint, destinationPoint);
                encodedPolyline = osrmRoute.polyline;
                distanceInMeters = osrmRoute.distance;
                durationSeconds = osrmRoute.durationSeconds;
            } catch (osrmError) {
                // Fallback when OSRM is unavailable.
            }

            if (distanceInMeters <= 0) {
                distanceInMeters = haversineDistanceMeters(originPoint, destinationPoint);
            }
            if (durationSeconds <= 0) {
                const avgUrbanSpeedKmh = 28;
                durationSeconds = Math.max(60, Math.round((distanceInMeters / 1000 / avgUrbanSpeedKmh) * 3600));
            }

            const durationText = formatDurationFromSeconds(durationSeconds);

            const distanceInKm = distanceInMeters / 1000;
            let cost = plan.rider_fee;
            if (distanceInKm > plan.min_distance) {
                const extraKm = distanceInKm - plan.min_distance;
                cost += extraKm * plan.fee_per_km;
            }

            const routePath: WoosmapRoutePath = {
                provider: 'osrm',
                polyline: encodedPolyline,
                points: encodedPolyline
                    ? decodePolyline(encodedPolyline)
                    : [
                        originPoint,
                        destinationPoint,
                    ],
                distance: distanceInMeters,
                duration_seconds: durationSeconds,
            };

            setShippingInfo({
                distance: distanceInMeters,
                duration: durationText,
                durationSeconds,
                cost: Math.max(cost, plan.min_shipping_fee),
                directions: null,
                routePath,
            });
        } catch (routeError) {
            setShippingInfo(null);
            setError("No se pudo calcular la ruta. Verifica las direcciones.");
            console.error("OSRM route request failed:", routeError);
        } finally {
            setIsLoading(false);
        }
    }, [isMapsLoaded, pickupLocation, address, plan, isLoadingPlan, isLoadingBusiness]);

    useEffect(() => {
        calculateRoute();
    }, [calculateRoute]);

    return { shippingInfo, isLoading: isLoading || isLoadingPlan || isLoadingBusiness, error };
};
