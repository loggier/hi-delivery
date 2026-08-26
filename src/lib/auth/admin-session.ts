import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const ADMIN_SESSION_COOKIE = 'hid-admin-session';
const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

export interface AdminOperationUser {
  id: string;
  roleId: string;
  status: string;
}

export class AdminSessionError extends Error {
  readonly status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = 'AdminSessionError';
    this.status = status;
  }
}

export function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAdminWebSession(userId: string): Promise<void> {
  const rawToken = newSessionToken();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('admin_web_sessions').insert({
    token_hash: hashSessionToken(rawToken),
    user_id: userId,
    expires_at: new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000).toISOString(),
  });

  if (error) {
    throw new Error('Unable to create admin session');
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export async function requireAdminOperationSession(): Promise<AdminOperationUser> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!rawToken) {
    throw new AdminSessionError('Authentication required', 401);
  }

  const supabase = createSupabaseAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from('admin_web_sessions')
    .select('user_id, expires_at, revoked_at')
    .eq('token_hash', hashSessionToken(rawToken))
    .maybeSingle();

  const expiresAt = session ? new Date(session.expires_at).getTime() : Number.NaN;
  if (
    sessionError ||
    !session ||
    session.revoked_at !== null ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw new AdminSessionError('Invalid or expired session', 401);
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role_id, status')
    .eq('id', session.user_id)
    .maybeSingle();

  if (userError || !user || user.status !== 'ACTIVE' || user.role_id !== 'role-admin') {
    throw new AdminSessionError('Admin access required', 403);
  }

  return { id: user.id, roleId: user.role_id, status: user.status };
}

export async function revokeCurrentAdminWebSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  try {
    if (rawToken) {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase
        .from('admin_web_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', hashSessionToken(rawToken));

      if (error) {
        throw new Error('Unable to revoke admin session');
      }
    }
  } catch {
    throw new Error('Unable to revoke admin session');
  } finally {
    try {
      cookieStore.delete(ADMIN_SESSION_COOKIE);
    } catch {
      // Cookie deletion is best-effort in contexts where headers are immutable.
    }
  }
}
