import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

import { getAdminSessionSchema } from '@/lib/auth/admin-session';
import { isOwnerRole } from '@/lib/auth/roles';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const OWNER_SESSION_COOKIE = 'hid-owner-session';
const OWNER_SESSION_TTL_SECONDS = 12 * 60 * 60;
const OWNER_SESSION_SECRET_MIN_LENGTH = 32;

export class OwnerSessionConfigError extends Error {
  constructor() {
    super(
      `OWNER_SESSION_SECRET no está configurado o tiene menos de ${OWNER_SESSION_SECRET_MIN_LENGTH} caracteres.`,
    );
    this.name = 'OwnerSessionConfigError';
  }
}

export class OwnerSessionError extends Error {
  readonly status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = 'OwnerSessionError';
    this.status = status;
  }
}

export interface OwnerSessionInput {
  userId: string;
  businessId: string;
  roleId: string;
}

export interface OwnerSession {
  userId: string;
  businessId: string;
  roleId: string;
}

// Contenido mínimo del token: ids y rol. Nunca datos personales.
type OwnerTokenPayload = {
  uid: string;
  bid: string;
  rol: string;
  exp: number;
};

// Sin valor por defecto: si falta el secreto, el login de dueño y la validación fallan.
export function getOwnerSessionSecret(): string {
  const secret = process.env.OWNER_SESSION_SECRET;
  if (!secret || secret.length < OWNER_SESSION_SECRET_MIN_LENGTH) {
    throw new OwnerSessionConfigError();
  }
  return secret;
}

export function assertOwnerSessionConfigured(): void {
  getOwnerSessionSecret();
}

function signEncodedPayload(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function encodeToken(payload: OwnerTokenPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encodedPayload}.${signEncodedPayload(encodedPayload, secret)}`;
}

function decodeToken(token: string, secret: string): OwnerTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expected = Buffer.from(signEncodedPayload(encodedPayload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as OwnerTokenPayload).uid === 'string' &&
      typeof (parsed as OwnerTokenPayload).bid === 'string' &&
      typeof (parsed as OwnerTokenPayload).rol === 'string' &&
      typeof (parsed as OwnerTokenPayload).exp === 'number'
    ) {
      return parsed as OwnerTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function ownerCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function createOwnerSession(input: OwnerSessionInput): Promise<void> {
  const secret = getOwnerSessionSecret();
  const exp = Math.floor(Date.now() / 1000) + OWNER_SESSION_TTL_SECONDS;
  const token = encodeToken(
    { uid: input.userId, bid: input.businessId, rol: input.roleId, exp },
    secret,
  );

  const cookieStore = await cookies();
  cookieStore.set(OWNER_SESSION_COOKIE, token, ownerCookieOptions(OWNER_SESSION_TTL_SECONDS));
}

export async function clearOwnerSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OWNER_SESSION_COOKIE, '', {
    ...ownerCookieOptions(0),
    expires: new Date(0),
  });
}

// Verifica firma, expiración y que el usuario siga ACTIVE con rol de dueño
// y que el negocio de la cookie pertenezca a ese usuario.
export async function requireOwnerSession(): Promise<OwnerSession> {
  const secret = getOwnerSessionSecret();

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(OWNER_SESSION_COOKIE)?.value;
  if (!rawToken) {
    throw new OwnerSessionError('Authentication required', 401);
  }

  const payload = decodeToken(rawToken, secret);
  if (!payload || payload.exp * 1000 <= Date.now()) {
    throw new OwnerSessionError('Invalid or expired session', 401);
  }

  const supabase = createSupabaseAdminClient(getAdminSessionSchema());
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role_id, status, role:roles(name)')
    .eq('id', payload.uid)
    .maybeSingle();

  if (userError || !user || user.status !== 'ACTIVE' || !isOwnerRole({ role_id: user.role_id, role: Array.isArray(user.role) ? user.role[0] : user.role })) {
    throw new OwnerSessionError('Business owner access required', 403);
  }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, user_id')
    .eq('id', payload.bid)
    .maybeSingle();

  if (businessError || !business || String(business.user_id) !== String(user.id)) {
    throw new OwnerSessionError('Business scope unavailable', 403);
  }

  return {
    userId: String(user.id),
    businessId: String(business.id),
    roleId: String(user.role_id),
  };
}
