import 'server-only';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { withTimeout } from '@/lib/mail/send-with-timeout';
import { sendNotification } from '@/lib/notifications/notification-service';
import { normalizeWhatsappRecipient } from '@/lib/password-reset';

export type RegistrationLinkResendResult = {
  email: boolean;
  whatsapp: boolean;
};

/** URL pública base (APP_PUBLIC_URL) sin barra final. Null si no está configurada. */
export function getRegistrationLinkBaseUrl(): string | null {
  const baseUrl = process.env.APP_PUBLIC_URL?.trim().replace(/\/+$/, '');
  return baseUrl || null;
}

function buildRegistrationLink(baseUrl: string, token: string): string {
  return `${baseUrl}/site/deliveryman/apply/personal-info?token=${encodeURIComponent(token)}`;
}

/** Un canal: nunca lanza. Devuelve si se envió. No registra destinatario ni token en consola. */
async function sendOnChannel(
  channel: 'email' | 'whatsapp',
  recipient: string,
  variables: Record<string, unknown>,
): Promise<boolean> {
  try {
    await withTimeout(
      sendNotification({
        templateKey: 'rider.registration_link',
        channel,
        recipient,
        variables,
      }),
    );
    return true;
  } catch (error: unknown) {
    console.error(
      `Rider registration resend failed (${channel}):`,
      error instanceof Error ? error.message : 'error desconocido',
    );
    return false;
  }
}

/**
 * Envía el enlace de registro nuevo por correo y por WhatsApp, de forma independiente.
 * Cada canal tiene timeout y no afecta al otro. Un canal sin dato de contacto no se intenta.
 */
export async function resendRiderRegistrationLink(input: {
  baseUrl: string;
  registrationToken: string;
  expiresAt: Date;
  userName: string;
  email: string | null | undefined;
  phone: string | null | undefined;
}): Promise<RegistrationLinkResendResult> {
  const variables = {
    'user.name': input.userName,
    'registration.link': buildRegistrationLink(input.baseUrl, input.registrationToken),
    'registration.expires_at': format(input.expiresAt, "d 'de' MMMM, yyyy, h:mm a", { locale: es }),
  };

  const emailRecipient = input.email?.trim() || null;
  const whatsappRecipient = input.phone ? normalizeWhatsappRecipient(input.phone) : null;

  const [email, whatsapp] = await Promise.all([
    emailRecipient ? sendOnChannel('email', emailRecipient, variables) : Promise.resolve(false),
    whatsappRecipient ? sendOnChannel('whatsapp', whatsappRecipient, variables) : Promise.resolve(false),
  ]);

  return { email, whatsapp };
}
