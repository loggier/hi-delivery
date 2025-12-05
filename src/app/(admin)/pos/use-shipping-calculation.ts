
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Business, CustomerAddress, Plan } from '@/types';
import { api } from '@/lib/api';

export interface ShippingInfo {
    distance: number; // in meters
    duration: string;
    cost: number;
    directions: google.maps.DirectionsResult | null;
}

export const useShippingCalculation = (business: Business | null, address: CustomerAddress | null, isMapsLoaded: boolean): { shippingInfo: ShippingInfo | null, isLoading: boolean, error: string | null } => {
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: plan, isLoading: isLoadingPlan } = api.plans.useGetOne(business?.plan_id || '', { enabled: !!business?.plan_id });

    const calculateRoute = useCallback(() => {
        if (!isMapsLoaded || !business?.latitude || !business?.longitude || !address?.latitude || !address?.longitude || !plan) {
            setShippingInfo(null);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        const directionsService = new google.maps.DirectionsService();

        directionsService.route(
            {
                origin: { lat: business.latitude, lng: business.longitude },
                destination: { lat: address.latitude, lng: address.longitude },
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result && result.routes[0]) {
                    const route = result.routes[0];
                    if (route.legs[0] && route.legs[0].distance && route.legs[0].duration) {
                        const distanceInMeters = route.legs[0].distance.value;
                        const distanceInKm = distanceInMeters / 1000;
                        const durationText = route.legs[0].duration.text;
                        
                        let cost = plan.rider_fee;
                        if (distanceInKm > plan.min_distance) {
                            const extraKm = distanceInKm - plan.min_distance;
                            cost += extraKm * plan.fee_per_km;
                        }

                        setShippingInfo({
                            distance: distanceInMeters,
                            duration: durationText,
                            cost: Math.max(cost, plan.min_shipping_fee),
                            directions: result,
                        });
                    } else {
                        setError("No se pudo obtener la distancia o duración de la ruta.");
                    }
                } else {
                    setError("No se pudo calcular la ruta. Verifica las direcciones.");
                    console.error("Directions request failed due to " + status);
                }
                setIsLoading(false);
            }
        );
    }, [isMapsLoaded, business, address, plan]);

    useEffect(() => {
        calculateRoute();
    }, [calculateRoute]);

    return { shippingInfo, isLoading: isLoading || isLoadingPlan, error };
};
