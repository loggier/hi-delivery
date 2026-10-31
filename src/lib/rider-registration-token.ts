import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const RIDER_REGISTRATION_TOKEN_TTL_DAYS = 7;

const MAX_TOKEN_LENGTH = 200;

/** Token de registro de 32 bytes aleatorios en base64url. El valor en claro solo viaja en el enlace y en la respuesta al creador. */
export function createRegistrationToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash SHA-256 en hex. Es lo único que se guarda en `riders.registration_token_hash`. */
export function hashRegistrationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getRegistrationTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + RIDER_REGISTRATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Extrae el token de `Authorization: Bearer <token>`. Devuelve null si no existe o no es válido. */
export function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length <= MAX_TOKEN_LENGTH ? token : null;
}

export type RegistrationTokenState =
  | { state: 'active'; riderId: string }
  | { state: 'submitted'; riderId: string }
  | { state: 'invalid' };

/**
 * Estado de un token de registro:
 * - `active`: coincide con un repartidor en `incomplete` y no ha expirado. Puede usar el wizard.
 * - `submitted`: coincide con un repartidor que ya no está en `incomplete` (envío final o revisión).
 * - `invalid`: no coincide, o está vencido sin envío.
 */
export async function getRegistrationTokenState(token: string | null | undefined): Promise<RegistrationTokenState> {
  const trimmed = token?.trim();
  if (!trimmed || trimmed.length > MAX_TOKEN_LENGTH) return { state: 'invalid' };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('riders')
    .select('id, status, registration_token_expires_at')
    .eq('registration_token_hash', hashRegistrationToken(trimmed))
    .maybeSingle();

  if (error || !data) return { state: 'invalid' };

  const riderId = String(data.id);
  if (data.status !== 'incomplete') return { state: 'submitted', riderId };

  const expiresAt = data.registration_token_expires_at
    ? new Date(data.registration_token_expires_at).getTime()
    : Number.NaN;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return { state: 'invalid' };

  return { state: 'active', riderId };
}

/**
 * Verifica un token para escrituras y lecturas del wizard. Devuelve el riderId sólo si el
 * token está `active`. Un repartidor que ya no está en `incomplete` no puede escribir con su token.
 */
export async function verifyRegistrationToken(token: string | null | undefined): Promise<string | null> {
  const result = await getRegistrationTokenState(token);
  return result.state === 'active' ? result.riderId : null;
}
