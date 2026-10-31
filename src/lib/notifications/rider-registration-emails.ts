import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { withTimeout } from '@/lib/mail/send-with-timeout';
import { sendNotification } from '@/lib/notifications/notification-service';

async function sendRiderEmailBestEffort(
  templateKey: 'rider.registration_link' | 'rider.documents_received',
  recipient: string,
  variables: Record<string, unknown>,
): Promise<void> {
  try {
    await withTimeout(
      sendNotification({
        templateKey,
        channel: 'email',
        recipient,
        variables,
      }),
    );
  } catch (error: unknown) {
    console.error(
      `Rider email failed (${templateKey}):`,
      error instanceof Error ? error.message : 'error desconocido',
    );
  }
}

/**
 * Enlace para continuar el registro (rider.registration_link). Best-effort: nunca lanza.
 * Requiere APP_PUBLIC_URL; si no está configurada, el correo se omite.
 */
export async function sendRiderRegistrationLinkEmail(input: {
  email: string | null | undefined;
  userName: string;
  registrationToken: string;
  expiresAt: Date;
}): Promise<void> {
  const recipient = input.email?.trim();
  if (!recipient) return;

  const baseUrl = process.env.APP_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    console.error('Rider registration link email skipped: APP_PUBLIC_URL no está configurada.');
    return;
  }

  const registrationLink = `${baseUrl}/site/deliveryman/apply/personal-info?token=${encodeURIComponent(input.registrationToken)}`;

  await sendRiderEmailBestEffort('rider.registration_link', recipient, {
    'user.name': input.userName,
    'registration.link': registrationLink,
    'registration.expires_at': format(input.expiresAt, "d 'de' MMMM, yyyy, h:mm a", { locale: es }),
  });
}

/**
 * Confirmación de documentos recibidos (rider.documents_received). Best-effort: nunca lanza.
 */
export async function sendRiderDocumentsReceivedEmail(input: {
  email: string | null | undefined;
  userName: string;
}): Promise<void> {
  const recipient = input.email?.trim();
  if (!recipient) return;

  await sendRiderEmailBestEffort('rider.documents_received', recipient, {
    'user.name': input.userName,
  });
}
