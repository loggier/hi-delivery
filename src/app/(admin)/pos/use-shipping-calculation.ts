
"use client";

import { useState, useEffect } from 'react';
import { Business, CustomerAddress } from '@/types';
import { api } from '@/lib/api';

export interface ShippingInfo {
    distance: number;
    duration: string; // This will be an estimate
    cost: number;
    directions: google.maps.DirectionsResult | null; // Keep for potential future use, but will be null for now
}

// Haversine formula to calculate distance between two points in km
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Estimate duration based on an average speed
function estimateDuration(distanceInKm: number) {
    const AVERAGE_SPEED_KMPH = 30;
    const timeInHours = distanceInKm / AVERAGE_SPEED_KMPH;
    const timeInMinutes = Math.round(timeInHours * 60);
    if (timeInMinutes < 1) return "1 min";
    return `${timeInMinutes} min`;
}


export const useShippingCalculation = (business: Business | null, address: CustomerAddress | null, isMapsLoaded: boolean): { shippingInfo: ShippingInfo | null, isLoading: boolean, error: string | null } => {
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: plan, isLoading: isLoadingPlan } = api.plans.useGetOne(business?.plan_id || '', { enabled: !!business?.plan_id });

    useEffect(() => {
        if (business?.latitude && business?.longitude && address?.latitude && address?.longitude && plan) {
            setIsLoading(true);
            setError(null);
            
            try {
                const distanceInKm = getHaversineDistance(
                    business.latitude,
                    business.longitude,
                    address.latitude,
                    address.longitude
                );

                let cost = plan.rider_fee;
                if (distanceInKm > plan.min_distance) {
                    const extraKm = distanceInKm - plan.min_distance;
                    cost += extraKm * plan.fee_per_km;
                }
                
                const estimatedDuration = estimateDuration(distanceInKm);

                setShippingInfo({
                    distance: distanceInKm,
                    duration: estimatedDuration,
                    cost: Math.max(cost, plan.min_shipping_fee),
                    directions: null, // No directions object available
                });

            } catch (e) {
                 setError("No se pudo calcular la distancia.");
                 setShippingInfo(null);
            } finally {
                setIsLoading(false);
            }

        } else {
            setShippingInfo(null);
            setError(null);
        }
    }, [business, address, plan]);

    return { shippingInfo, isLoading: isLoading || isLoadingPlan, error };
};
