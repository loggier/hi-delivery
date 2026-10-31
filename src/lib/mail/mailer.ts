import nodemailer, { type Transporter } from 'nodemailer';
import { getSmtpConfig, type SmtpConfig } from './smtp-config';

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = {
  messageId: string;
  rejectedCount: number;
};

let cachedTransporter: Transporter | null = null;

function getTransporter(config: SmtpConfig): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }
  return cachedTransporter;
}

/**
 * Envía un correo usando la cuenta SMTP configurada en variables de entorno.
 * No registra destinatarios ni credenciales en consola.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('El correo no está configurado: faltan variables SMTP_*.');
  }

  const info = await getTransporter(config).sendMail({
    from: config.fromName
      ? { name: config.fromName, address: config.fromEmail }
      : config.fromEmail,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  return {
    messageId: info.messageId,
    rejectedCount: info.rejected.length,
  };
}
