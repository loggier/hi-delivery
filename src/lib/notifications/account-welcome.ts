import { withTimeout } from '@/lib/mail/send-with-timeout';
import { sendNotification } from '@/lib/notifications/notification-service';

export type AccountWelcomeInput = {
  email: string | null | undefined;
  userName: string;
};

/**
 * Envía la bienvenida por correo (plantilla `account.welcome`) y la espera con tiempo límite.
 * Best-effort: nunca rechaza. Si no hay correo, no hace nada. Si falla o expira,
 * registra sólo la plantilla y el error, sin destinatario, y termina sin lanzar.
 */
export async function sendAccountWelcomeEmail(input: AccountWelcomeInput): Promise<void> {
  const recipient = input.email?.trim();
  if (!recipient) return;

  try {
    await withTimeout(
      sendNotification({
        templateKey: 'account.welcome',
        channel: 'email',
        recipient,
        variables: {
          'user.name': input.userName,
        },
      }),
    );
  } catch (error: unknown) {
    console.error(
      'Account welcome email failed (account.welcome):',
      error instanceof Error ? error.message : 'error desconocido',
    );
  }
}
