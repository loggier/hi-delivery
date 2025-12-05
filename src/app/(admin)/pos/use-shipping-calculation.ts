
"use client";

import { useState, useEffect } from 'react';
import { Business, CustomerAddress } from '@/types';
import { api } from '@/lib/api';

export interface ShippingInfo {
    distance: number;
    duration: string;
    cost: number;
    directions: google.maps.DirectionsResult | null;
}

export const useShippingCalculation = (business: Business | null, address: CustomerAddress | null, isMapsLoaded: boolean): { shippingInfo: ShippingInfo | null, isLoading: boolean, error: string | null } => {
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: plan, isLoading: isLoadingPlan } = api.plans.useGetOne(business?.plan_id || '', { enabled: !!business?.plan_id });

    useEffect(() => {
        if (isMapsLoaded && business?.latitude && business?.longitude && address?.latitude && address?.longitude && plan && typeof window !== 'undefined') {
            setIsLoading(true);
            setError(null);
            
            const directionsService = new window.google.maps.DirectionsService();
            directionsService.route({
                origin: { lat: business.latitude, lng: business.longitude },
                destination: { lat: address.latitude, lng: address.longitude },
                travelMode: window.google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                setIsLoading(false);
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                    const route = result.routes[0].legs[0];
                    if (route.distance && route.duration) {
                        const distanceInKm = route.distance.value / 1000;
                        
                        let cost = plan.rider_fee;
                        if (distanceInKm > plan.min_distance) {
                            const extraKm = distanceInKm - plan.min_distance;
                            cost += extraKm * plan.fee_per_km;
                        }

                        setShippingInfo({
                            distance: distanceInKm,
                            duration: route.duration.text,
                            cost: Math.max(cost, plan.min_shipping_fee),
                            directions: result,
                        });
                    }
                } else {
                    setError("No se pudo calcular la ruta. Verifica las direcciones.");
                    setShippingInfo(null);
                }
            });
        } else {
            setShippingInfo(null);
            setError(null);
        }
    }, [business, address, isMapsLoaded, plan]);

    return { shippingInfo, isLoading: isLoading || isLoadingPlan, error };
};

    