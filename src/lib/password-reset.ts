import crypto from 'crypto';
import { addHours, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { sendNotification } from '@/lib/notifications/notification-service';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type PasswordResetChannel = 'web' | 'app';
export type PasswordResetTargetType = 'web' | 'rider';

export const PASSWORD_RESET_EXPIRY_HOURS = 1;
export const PASSWORD_RESET_MAX_CODE_ATTEMPTS = 5;
export const PASSWORD_RESET_REQUEST_WINDOW_MINUTES = 10;
export const PASSWORD_RESET_MAX_REQUESTS_PER_WINDOW = 3;

type ResetUser = {
  id: string;
  name: string;
  status?: string | null;
};

export type PasswordResetRecipient = {
  user: ResetUser;
  targetType: PasswordResetTargetType;
  recipient: string;
};

export function buildPhoneCandidates(rawPhone: string) {
  const trimmed = rawPhone.trim();
  const digits = trimmed.replace(/\D/g, '');
  const candidates = new Set<string>();

  if (trimmed) candidates.add(trimmed);
  if (digits) candidates.add(digits);

  if (digits.length === 10) {
    candidates.add(`52${digits}`);
    candidates.add(`+52${digits}`);
  } else if (digits.length === 12 && digits.startsWith('52')) {
    const localDigits = digits.slice(2);
    candidates.add(localDigits);
    candidates.add(`52${localDigits}`);
    candidates.add(`+52${localDigits}`);
    candidates.add(`+${digits}`);
  } else if (digits.length > 0) {
    candidates.add(`+${digits}`);
  }

  return [...candidates].filter(Boolean);
}

export function normalizeWhatsappRecipient(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return digits;
  return digits;
}

export function createResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function createResetCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashResetSecret(secret: string) {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_URL || 'hi-delivery';
  return crypto.createHash('sha256').update(`${pepper}:${secret}`).digest('hex');
}

export function getResetExpiresAt() {
  return addHours(new Date(), PASSWORD_RESET_EXPIRY_HOURS);
}

export function formatResetExpiry(expiresAt: Date) {
  return format(expiresAt, "d 'de' MMMM, yyyy, h:mm a", { locale: es });
}

export function buildResetLink(baseUrl: string, token: string) {
  const url = new URL(baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export function getRequestIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

export async function getPasswordResetBaseUrl(origin: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('notification_constants')
    .select('value')
    .eq('key', 'password.reset_base_url')
    .maybeSingle();

  const configured = String(data?.value || '').trim();
  return configured || `${origin.replace(/\/+$/, '')}/reset-password`;
}

export async function findWebResetRecipientByPhone(phone: string): Promise<PasswordResetRecipient | null> {
  const supabase = createSupabaseAdminClient();
  const candidates = buildPhoneCandidates(phone);

  const { data: business } = await supabase
    .from('businesses')
    .select('user_id, phone_whatsapp, status')
    .in('phone_whatsapp', candidates)
    .limit(1)
    .maybeSingle();

  if (!business?.user_id || business.status !== 'ACTIVE') return null;

  const { data: user } = await supabase
    .from('users')
    .select('id, name, status')
    .eq('id', business.user_id)
    .maybeSingle();

  if (!user || user.status !== 'ACTIVE') return null;

  return {
    user: { id: user.id, name: user.name || 'usuario', status: user.status },
    targetType: 'web',
    recipient: normalizeWhatsappRecipient(business.phone_whatsapp || phone),
  };
}

export async function findRiderResetRecipientByPhone(phone: string): Promise<PasswordResetRecipient | null> {
  const supabase = createSupabaseAdminClient();
  const candidates = buildPhoneCandidates(phone);

  const { data: rider } = await supabase
    .from('riders')
    .select('user_id, phone_e164, first_name, last_name')
    .in('phone_e164', candidates)
    .limit(1)
    .maybeSingle();

  if (!rider?.user_id) return null;

  const { data: user } = await supabase
    .from('users')
    .select('id, name, status')
    .eq('id', rider.user_id)
    .maybeSingle();

  if (!user || user.status !== 'ACTIVE') return null;

  const riderName = [rider.first_name, rider.last_name].filter(Boolean).join(' ').trim();

  return {
    user: { id: user.id, name: user.name || riderName || 'repartidor', status: user.status },
    targetType: 'rider',
    recipient: normalizeWhatsappRecipient(rider.phone_e164 || phone),
  };
}

export async function hasRecentPasswordResetRequests(recipient: string) {
  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - PASSWORD_RESET_REQUEST_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('password_reset_requests')
    .select('id', { count: 'exact', head: true })
    .eq('recipient', recipient)
    .gte('created_at', since);

  return (count ?? 0) >= PASSWORD_RESET_MAX_REQUESTS_PER_WINDOW;
}

export async function sendPasswordResetLink(input: {
  recipient: string;
  userName: string;
  resetLink: string;
  expiresAt: Date;
}) {
  return sendNotification({
    templateKey: 'password.reset_request',
    channel: 'whatsapp',
    recipient: input.recipient,
    variables: {
      'user.name': input.userName,
      'password.reset_link': input.resetLink,
      'password.reset_expires_at': formatResetExpiry(input.expiresAt),
    },
  });
}

export async function sendPasswordResetCode(input: {
  recipient: string;
  userName: string;
  code: string;
}) {
  return sendNotification({
    templateKey: 'password.reset_code',
    channel: 'whatsapp',
    recipient: input.recipient,
    variables: {
      'user.name': input.userName,
      'password.reset_code': input.code,
    },
  });
}
