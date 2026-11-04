import 'server-only';

import { randomUUID } from 'node:crypto';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Vida de las URLs firmadas de evidencias: 10 minutos. */
export const DELIVERY_PROOF_SIGNED_URL_TTL_SECONDS = 600;

const PROOF_EXTENSIONS = ['jpg', 'png', 'webp'] as const;
export type DeliveryProofExtension = (typeof PROOF_EXTENSIONS)[number];

/** Bucket de evidencias. Debe ser privado; por ahora usa la configuración existente. */
export function getDeliveryProofBucket(): string {
  return process.env.DELIVERY_PROOF_BUCKET?.trim() || 'hidelivery';
}

/** Carpeta de un repartidor dentro de un pedido: `orders/<orderId>/<riderId>`. */
export function buildDeliveryProofFolder(orderId: string, riderId: string): string {
  return `orders/${orderId}/${riderId}`;
}

/** Nombre nuevo generado en servidor (UUID). Nunca usa el nombre enviado por el cliente. */
export function buildDeliveryProofPath(orderId: string, riderId: string, ext: DeliveryProofExtension): string {
  return `${buildDeliveryProofFolder(orderId, riderId)}/${randomUUID()}.${ext}`;
}

/**
 * Valida que un path de evidencia pertenezca a este pedido y repartidor y tenga la forma generada en servidor.
 * Rechaza cualquier URL, segmentos `..` o nombres que no sean UUID con extensión permitida.
 */
export function isDeliveryProofPathFor(path: string, orderId: string, riderId: string): boolean {
  const prefix = `${buildDeliveryProofFolder(orderId, riderId)}/`;
  if (!path.startsWith(prefix)) return false;
  const fileName = path.slice(prefix.length);
  const pattern = new RegExp(
    `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${PROOF_EXTENSIONS.join('|')})$`,
  );
  return pattern.test(fileName);
}

/**
 * Obtiene la ruta de storage de un valor guardado. Acepta el path nuevo y, por compatibilidad,
 * URLs públicas antiguas del mismo bucket. Devuelve null si el valor no apunta a ese bucket.
 */
export function extractDeliveryProofPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.startsWith('/') || trimmed.includes('..') ? null : trimmed;
  }

  const bucket = getDeliveryProofBucket();
  try {
    const url = new URL(trimmed);
    const marker = `/storage/v1/object/`;
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    const rest = url.pathname.slice(index + marker.length);
    const bucketPrefix = `public/${bucket}/`;
    const signedPrefix = `sign/${bucket}/`;
    const objectPath = rest.startsWith(bucketPrefix)
      ? rest.slice(bucketPrefix.length)
      : rest.startsWith(signedPrefix)
        ? rest.slice(signedPrefix.length)
        : null;
    if (!objectPath) return null;
    const decoded = decodeURIComponent(objectPath);
    return decoded.includes('..') ? null : decoded;
  } catch {
    return null;
  }
}

/**
 * Firma una evidencia para mostrarla. Devuelve una URL que vence en 10 minutos,
 * o null si no hay evidencia válida o no se pudo firmar. Nunca devuelve un enlace público.
 */
export async function signDeliveryProofUrl(value: unknown): Promise<string | null> {
  const path = extractDeliveryProofPath(value);
  if (!path) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(getDeliveryProofBucket())
    .createSignedUrl(path, DELIVERY_PROOF_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Reemplaza `delivery_proof_url` de un pedido por su URL firmada (o null). Para respuestas de la app. */
export async function withSignedDeliveryProof<T extends Record<string, unknown>>(order: T): Promise<T> {
  if (!('delivery_proof_url' in order)) return order;
  const signed = await signDeliveryProofUrl(order.delivery_proof_url);
  return { ...order, delivery_proof_url: signed };
}
