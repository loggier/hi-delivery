

"use client";

import { useState, useEffect, useCallback } from 'react';
import { Business, CustomerAddress, Plan, BusinessBranch } from '@/types';
import { api } from '@/lib/api';

export interface ShippingInfo {
    distance: number; // in meters
    duration: string;
    cost: number;
    directions: google.maps.DirectionsResult | null;
}

type PickupLocation = Pick<Business | BusinessBranch, 'id' | 'name' | 'address_line' | 'latitude' | 'longitude'> & { business_id?: string };

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

    const calculateRoute = useCallback(() => {
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

        const directionsService = new google.maps.DirectionsService();

        directionsService.route(
            {
                origin: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
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
    }, [isMapsLoaded, pickupLocation, address, plan, isLoadingPlan, isLoadingBusiness]);

    useEffect(() => {
        calculateRoute();
    }, [calculateRoute]);

    return { shippingInfo, isLoading: isLoading || isLoadingPlan || isLoadingBusiness, error };
};
