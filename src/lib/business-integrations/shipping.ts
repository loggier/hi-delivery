import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ShippingCoordinates = { latitude: number; longitude: number };

export type BusinessShippingQuote = {
  delivery_fee: number;
  delivery_fee_cents: number;
  distance_meters: number;
  duration_seconds: number;
  estimated_duration: string;
  distance_source: 'osrm' | 'haversine_fallback';
};

export class ShippingQuoteUnavailableError extends Error {
  constructor() {
    super('Shipping quote unavailable');
    this.name = 'ShippingQuoteUnavailableError';
  }
}

type Coordinates = { latitude: number; longitude: number };

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineDistanceMeters(origin: Coordinates, destination: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const arc = Math.sin(latitudeDelta / 2) ** 2
    + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(originLatitude) * Math.cos(destinationLatitude);
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(arc));
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.max(1, Math.round((seconds % 3600) / 60));
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

async function drivingRoute(origin: Coordinates, destination: Coordinates) {
  const routeBase = (
    process.env.OSRM_ROUTE_URL
    || process.env.NEXT_PUBLIC_OSRM_ROUTE_URL
    || 'https://nominatim.vemontech.com/route/v1/driving'
  ).replace(/\/$/, '');
  const url = `${routeBase}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false&steps=false`;
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5_000) });
  const payload = await response.json() as {
    code?: string;
    routes?: Array<{ distance?: unknown; duration?: unknown }>;
  };
  const distance = numericValue(payload.routes?.[0]?.distance);
  const duration = numericValue(payload.routes?.[0]?.duration);
  if (!response.ok || payload.code !== 'Ok' || distance === null || duration === null || distance <= 0 || duration <= 0) {
    throw new Error('Driving route unavailable');
  }
  return { distanceMeters: distance, durationSeconds: duration };
}

export function getDeliveryCoordinates(address: {
  latitude?: number;
  longitude?: number;
  coordinates?: { lat: number; lng: number };
}): ShippingCoordinates | null {
  const latitude = address.latitude ?? address.coordinates?.lat;
  const longitude = address.longitude ?? address.coordinates?.lng;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

export async function calculateBusinessShippingQuote(
  businessId: string,
  destination: ShippingCoordinates,
): Promise<BusinessShippingQuote> {
  const supabase = createSupabaseAdminClient();
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('latitude, longitude, plan_id')
    .eq('id', businessId)
    .maybeSingle();

  if (businessError || !business?.plan_id) throw new ShippingQuoteUnavailableError();

  const originLatitude = numericValue(business.latitude);
  const originLongitude = numericValue(business.longitude);
  if (originLatitude === null || originLongitude === null
    || originLatitude < -90 || originLatitude > 90
    || originLongitude < -180 || originLongitude > 180) {
    throw new ShippingQuoteUnavailableError();
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('rider_fee, fee_per_km, min_distance, min_shipping_fee')
    .eq('id', business.plan_id)
    .maybeSingle();

  if (planError || !plan) throw new ShippingQuoteUnavailableError();

  const riderFee = numericValue(plan.rider_fee);
  const feePerKm = numericValue(plan.fee_per_km);
  const minimumDistanceKm = numericValue(plan.min_distance);
  const minimumShippingFee = numericValue(plan.min_shipping_fee);
  const planValues = [riderFee, feePerKm, minimumDistanceKm, minimumShippingFee];
  if (planValues.some((value) => value === null || value < 0 || value > 1_000_000)) {
    throw new ShippingQuoteUnavailableError();
  }

  const origin = { latitude: originLatitude, longitude: originLongitude };
  let distanceMeters: number;
  let durationSeconds: number;
  let distanceSource: BusinessShippingQuote['distance_source'];

  try {
    const route = await drivingRoute(origin, destination);
    distanceMeters = route.distanceMeters;
    durationSeconds = route.durationSeconds;
    distanceSource = 'osrm';
  } catch {
    distanceMeters = haversineDistanceMeters(origin, destination);
    durationSeconds = Math.max(60, Math.round((distanceMeters / 1000 / 28) * 3600));
    distanceSource = 'haversine_fallback';
  }

  const distanceKm = distanceMeters / 1000;
  const extraKm = Math.max(0, distanceKm - minimumDistanceKm!);
  const calculatedFee = riderFee! + extraKm * feePerKm!;
  const feeCents = Math.max(Math.round(calculatedFee * 100), Math.round(minimumShippingFee! * 100));
  if (!Number.isSafeInteger(feeCents) || feeCents < 0 || feeCents > 100_000_000) {
    throw new ShippingQuoteUnavailableError();
  }

  const roundedDuration = Math.round(durationSeconds);
  return {
    delivery_fee: feeCents / 100,
    delivery_fee_cents: feeCents,
    distance_meters: distanceMeters,
    duration_seconds: roundedDuration,
    estimated_duration: formatDuration(roundedDuration),
    distance_source: distanceSource,
  };
}
