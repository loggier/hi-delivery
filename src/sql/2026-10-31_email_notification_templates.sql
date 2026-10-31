-- Plantillas de correo electrónico (channel = 'email') para notification_templates.
-- Texto plano con {{variables}}; el diseño HTML lo aplica el código de envío.
-- Idempotente: ON CONFLICT (template_key, channel) DO NOTHING no modifica filas existentes.
-- Las variables usadas ya existen en notification_template_variables y notification_constants
-- (ver src/db/migrations/007_create_notification_templates.sql). No se requieren constantes nuevas.

INSERT INTO grupohubs.notification_templates (template_key, name, description, audience, channel, subject, body, variables, status)
VALUES
  (
    'password.reset_request',
    'Correo de enlace para restablecer contraseña',
    'Correo con enlace de restablecimiento de contraseña para usuarios web o repartidores.',
    'system',
    'email',
    'Restablece tu contraseña',
    'Hola {{user.name}},

Recibimos una solicitud para restablecer la contraseña de tu cuenta. Para crear una nueva contraseña, abre el siguiente enlace:

{{password.reset_link}}

El enlace vence el {{password.reset_expires_at}}.

Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual seguirá vigente.

{{app.brand_signature}}',
    '["user.name", "password.reset_link", "password.reset_expires_at", "app.brand_signature"]'::jsonb,
    'ACTIVE'
  ),
  (
    'password.reset_code',
    'Correo con código para restablecer contraseña',
    'Correo con código temporal para restablecer la contraseña.',
    'system',
    'email',
    'Tu código para restablecer la contraseña',
    'Hola {{user.name}},

Tu código para restablecer la contraseña es:

{{password.reset_code}}

Por seguridad, este código expira en 1 hora. No lo compartas con nadie.

Si no solicitaste este código, puedes ignorar este correo. Tu contraseña actual seguirá vigente.

{{app.brand_signature}}',
    '["user.name", "password.reset_code", "app.brand_signature"]'::jsonb,
    'ACTIVE'
  ),
  (
    'password.changed',
    'Correo de confirmación de cambio de contraseña',
    'Confirmación de seguridad enviada cuando la contraseña se cambia correctamente.',
    'system',
    'email',
    'Tu contraseña fue cambiada',
    'Hola {{user.name}},

Te confirmamos que la contraseña de tu cuenta se cambió correctamente.

Si no fuiste tú quien realizó este cambio, contacta a soporte de inmediato respondiendo a este correo.

{{app.brand_signature}}',
    '["user.name", "app.brand_signature"]'::jsonb,
    'ACTIVE'
  ),
  (
    'account.welcome',
    'Correo de bienvenida a la cuenta',
    'Correo de bienvenida enviado al registrarse en la plataforma.',
    'system',
    'email',
    'Bienvenido a {{app.name}}',
    'Hola {{user.name}},

Bienvenido a {{app.name}}. Tu cuenta ya está creada.

Para comenzar, ingresa desde el siguiente enlace:

{{app.site_url}}

{{app.brand_signature}}',
    '["user.name", "app.name", "app.site_url", "app.brand_signature"]'::jsonb,
    'ACTIVE'
  )
ON CONFLICT (template_key, channel) DO NOTHING;
