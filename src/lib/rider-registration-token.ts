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

/**
 * Verifica un token de registro. Devuelve el riderId si el hash coincide y el token
 * no ha expirado (o no fue invalidado al enviar la solicitud). Devuelve null en otro caso.
 */
export async function verifyRegistrationToken(token: string | null | undefined): Promise<string | null> {
  const trimmed = token?.trim();
  if (!trimmed || trimmed.length > MAX_TOKEN_LENGTH) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('riders')
    .select('id, registration_token_expires_at')
    .eq('registration_token_hash', hashRegistrationToken(trimmed))
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = data.registration_token_expires_at
    ? new Date(data.registration_token_expires_at).getTime()
    : Number.NaN;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  return String(data.id);
}
