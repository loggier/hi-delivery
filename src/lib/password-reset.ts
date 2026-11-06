import crypto from 'crypto';
import { addHours, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { withTimeout } from '@/lib/mail/send-with-timeout';
import { sendNotification } from '@/lib/notifications/notification-service';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type PasswordResetChannel = 'web' | 'app';
export type PasswordResetTargetType = 'web' | 'rider';

export const PASSWORD_RESET_EXPIRY_HOURS = 1;
export const PASSWORD_RESET_MAX_CODE_ATTEMPTS = 5;
export const PASSWORD_RESET_REQUEST_WINDOW_MINUTES = 10;
export const PASSWORD_RESET_MAX_REQUESTS_PER_WINDOW = 3;
export const PASSWORD_RESET_MAX_REQUESTS_PER_IP = 10;

type ResetUser = {
  id: string;
  name: string;
  status?: string | null;
  email?: string | null;
};

export type PasswordResetRecipient = {
  user: ResetUser;
  targetType: PasswordResetTargetType;
  recipient: string;
};

/**
 * Cuenta encontrada por correo o teléfono. Puede tener WhatsApp, correo o ambos.
 * `storedRecipient` es el valor que se guarda en `password_reset_requests.recipient` (WhatsApp si existe; si no, el correo).
 */
export type PasswordResetAccount = {
  user: ResetUser;
  targetType: PasswordResetTargetType;
  whatsappRecipient: string | null;
  email: string | null;
  storedRecipient: string;
};

const EMAIL_IDENTIFIER_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    .select('id, name, status, email')
    .eq('id', business.user_id)
    .maybeSingle();

  if (!user || user.status !== 'ACTIVE') return null;

  return {
    user: { id: user.id, name: user.name || 'usuario', status: user.status, email: user.email ?? null },
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
    .select('id, name, status, email')
    .eq('id', rider.user_id)
    .maybeSingle();

  if (!user || user.status !== 'ACTIVE') return null;

  const riderName = [rider.first_name, rider.last_name].filter(Boolean).join(' ').trim();

  return {
    user: {
      id: user.id,
      name: user.name || riderName || 'repartidor',
      status: user.status,
      email: user.email ?? null,
    },
    targetType: 'rider',
    recipient: normalizeWhatsappRecipient(rider.phone_e164 || phone),
  };
}

function buildAccount(
  user: ResetUser,
  targetType: PasswordResetTargetType,
  whatsappRecipient: string | null,
  email: string | null | undefined,
): PasswordResetAccount | null {
  const normalizedEmail = email?.trim() || null;
  const storedRecipient = whatsappRecipient || normalizedEmail;
  if (!storedRecipient) return null;

  return { user, targetType, whatsappRecipient, email: normalizedEmail, storedRecipient };
}

/** Busca la cuenta del canal indicado por correo (users.email y perfil del canal). */
async function findAccountByEmail(channel: PasswordResetChannel, rawEmail: string): Promise<PasswordResetAccount | null> {
  const email = rawEmail.trim();
  if (!EMAIL_IDENTIFIER_PATTERN.test(email)) return null;

  const supabase = createSupabaseAdminClient();
  // Escapa los comodines de LIKE para que el correo se compare literalmente.
  const escapedEmail = email.replace(/[\\%_]/g, (char) => `\\${char}`);
  const { data: user } = await supabase
    .from('users')
    .select('id, name, status, email')
    .ilike('email', escapedEmail)
    .limit(1)
    .maybeSingle();

  if (!user || user.status !== 'ACTIVE') return null;

  if (channel === 'web') {
    const { data: business } = await supabase
      .from('businesses')
      .select('phone_whatsapp, status')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!business || business.status !== 'ACTIVE') return null;

    return buildAccount(
      { id: user.id, name: user.name || 'usuario', status: user.status, email: user.email ?? null },
      'web',
      business.phone_whatsapp ? normalizeWhatsappRecipient(business.phone_whatsapp) : null,
      user.email,
    );
  }

  const { data: rider } = await supabase
    .from('riders')
    .select('phone_e164, first_name, last_name')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!rider) return null;

  const riderName = [rider.first_name, rider.last_name].filter(Boolean).join(' ').trim();
  return buildAccount(
    {
      id: user.id,
      name: user.name || riderName || 'repartidor',
      status: user.status,
      email: user.email ?? null,
    },
    'rider',
    rider.phone_e164 ? normalizeWhatsappRecipient(rider.phone_e164) : null,
    user.email,
  );
}

/**
 * Encuentra la cuenta por correo o teléfono para el canal indicado.
 * `web` busca negocios; `app` busca repartidores. Devuelve null si no hay cuenta válida.
 */
export async function findPasswordResetAccount(input: {
  channel: PasswordResetChannel;
  identifier: string;
}): Promise<PasswordResetAccount | null> {
  const identifier = input.identifier.trim();
  if (!identifier) return null;

  if (identifier.includes('@')) {
    return findAccountByEmail(input.channel, identifier);
  }

  const recipient = input.channel === 'web'
    ? await findWebResetRecipientByPhone(identifier)
    : await findRiderResetRecipientByPhone(identifier);
  if (!recipient) return null;

  return buildAccount(recipient.user, recipient.targetType, recipient.recipient, recipient.user.email);
}

/** Contactos actuales de un usuario (para confirmaciones). WhatsApp según el perfil del canal. */
export async function getResetContactsForUser(
  userId: string,
  targetType: PasswordResetTargetType,
): Promise<{ name: string; email: string | null; whatsappRecipient: string | null }> {
  const supabase = createSupabaseAdminClient();
  const { data: user } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle();

  let whatsappRecipient: string | null = null;
  if (targetType === 'web') {
    const { data: business } = await supabase
      .from('businesses')
      .select('phone_whatsapp')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    whatsappRecipient = business?.phone_whatsapp ? normalizeWhatsappRecipient(business.phone_whatsapp) : null;
  } else {
    const { data: rider } = await supabase
      .from('riders')
      .select('phone_e164')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    whatsappRecipient = rider?.phone_e164 ? normalizeWhatsappRecipient(rider.phone_e164) : null;
  }

  return {
    name: user?.name || 'usuario',
    email: user?.email?.trim() || null,
    whatsappRecipient,
  };
}

/** Límite por cuenta: cuenta las solicitudes recientes del usuario para ese tipo de cuenta. */
export async function hasTooManyRecentResetRequestsForUser(
  userId: string,
  targetType: PasswordResetTargetType,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - PASSWORD_RESET_REQUEST_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('password_reset_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .gte('created_at', since);

  return (count ?? 0) >= PASSWORD_RESET_MAX_REQUESTS_PER_WINDOW;
}

/** Límite por IP de origen. Si no hay IP, no aplica. */
export async function hasTooManyRecentResetRequestsFromIp(ip: string | null): Promise<boolean> {
  if (!ip) return false;

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - PASSWORD_RESET_REQUEST_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('password_reset_requests')
    .select('id', { count: 'exact', head: true })
    .eq('request_ip', ip)
    .gte('created_at', since);

  return (count ?? 0) >= PASSWORD_RESET_MAX_REQUESTS_PER_IP;
}

/**
 * Envío por correo best-effort con tiempo límite. Si el usuario no tiene correo, no hace nada.
 * Nunca lanza: si falla o expira, registra sólo la plantilla y el error, sin destinatario.
 */
async function sendPasswordEmailBestEffort(input: {
  userEmail?: string | null;
  templateKey: string;
  variables: Record<string, unknown>;
}): Promise<void> {
  const recipient = input.userEmail?.trim();
  if (!recipient) return;

  try {
    await withTimeout(
      sendNotification({
        templateKey: input.templateKey,
        channel: 'email',
        recipient,
        variables: input.variables,
      }),
    );
  } catch (error: unknown) {
    console.error(
      `Password email notification failed (${input.templateKey}):`,
      error instanceof Error ? error.message : 'error desconocido',
    );
  }
}

/** Registra en notification_logs que WhatsApp se omitió porque la cuenta no tiene número. Best-effort. */
async function recordWhatsappSkip(templateKey: string): Promise<null> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("notification_logs").insert({
      template_key: templateKey,
      channel: "whatsapp",
      audience: "system",
      recipient: "(sin número)",
      variables: {},
      rendered_subject: null,
      rendered_body: "(omitido)",
      status: "failed",
      provider: "evolution",
      error_message: "La cuenta no tiene número de WhatsApp registrado.",
    });
  } catch {
    // El registro del motivo no debe bloquear la recuperación.
  }
  return null;
}

/**
 * Entrega el mismo mensaje por WhatsApp (si hay número) y por correo (si hay dirección).
 * Los dos canales corren en paralelo, cada uno con timeout. Un fallo de uno no detiene al otro.
 * Si WhatsApp falla, el error se relanza al llamador; el correo ya se intentó.
 */
async function deliverPasswordResetMessage(input: {
  templateKey: 'password.reset_request' | 'password.reset_code' | 'password.changed';
  whatsappRecipient: string | null;
  userEmail?: string | null;
  variables: Record<string, unknown>;
}): Promise<void> {
  const whatsappTask = input.whatsappRecipient
    ? withTimeout(
        sendNotification({
          templateKey: input.templateKey,
          channel: 'whatsapp',
          recipient: input.whatsappRecipient,
          variables: input.variables,
        }),
      )
    : recordWhatsappSkip(input.templateKey);

  const emailTask = sendPasswordEmailBestEffort({
    userEmail: input.userEmail,
    templateKey: input.templateKey,
    variables: input.variables,
  });

  const [whatsappResult] = await Promise.allSettled([whatsappTask, emailTask]);
  if (whatsappResult.status === 'rejected') throw whatsappResult.reason;
}

export async function sendPasswordResetLink(input: {
  recipient: string | null;
  userName: string;
  userEmail?: string | null;
  resetLink: string;
  expiresAt: Date;
}): Promise<void> {
  await deliverPasswordResetMessage({
    templateKey: 'password.reset_request',
    whatsappRecipient: input.recipient,
    userEmail: input.userEmail,
    variables: {
      'user.name': input.userName,
      'password.reset_link': input.resetLink,
      'password.reset_expires_at': formatResetExpiry(input.expiresAt),
    },
  });
}

export async function sendPasswordResetCode(input: {
  recipient: string | null;
  userName: string;
  userEmail?: string | null;
  code: string;
}): Promise<void> {
  await deliverPasswordResetMessage({
    templateKey: 'password.reset_code',
    whatsappRecipient: input.recipient,
    userEmail: input.userEmail,
    variables: {
      'user.name': input.userName,
      'password.reset_code': input.code,
    },
  });
}

/**
 * Aviso de contraseña cambiada por ambos canales. Si `recipient` es null se omite WhatsApp;
 * si `userEmail` es null se omite el correo.
 */
export async function sendPasswordChangedNotice(input: {
  recipient: string | null;
  userName: string;
  userEmail?: string | null;
}): Promise<void> {
  await deliverPasswordResetMessage({
    templateKey: 'password.changed',
    whatsappRecipient: input.recipient,
    userEmail: input.userEmail,
    variables: {
      'user.name': input.userName,
    },
  });
}
