export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string | null;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * Devuelve la configuración SMTP desde variables de entorno.
 * Retorna `null` si faltan las variables obligatorias (correo deshabilitado).
 * Lanza error si una variable tiene un formato inválido.
 */
export function getSmtpConfig(): SmtpConfig | null {
  const host = readEnv('SMTP_HOST');
  const user = readEnv('SMTP_USER');
  const password = readEnv('SMTP_PASSWORD');
  const fromEmail = readEnv('SMTP_FROM_EMAIL');

  if (!host || !user || !password || !fromEmail) {
    return null;
  }

  const port = Number(readEnv('SMTP_PORT') ?? '587');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT debe ser un número entre 1 y 65535.');
  }

  const secureRaw = readEnv('SMTP_SECURE');
  const secure = secureRaw ? secureRaw.toLowerCase() === 'true' : port === 465;

  return {
    host,
    port,
    secure,
    user,
    password,
    fromEmail,
    fromName: readEnv('SMTP_FROM_NAME') ?? null,
  };
}
