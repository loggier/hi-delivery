-- Token de registro para repartidores (forward-only, sin DROP ni DELETE).
-- Guarda sólo el hash del token; el valor en claro sólo viaja en el enlace enviado por correo.

ALTER TABLE grupohubs.riders ADD COLUMN IF NOT EXISTS registration_token_hash TEXT;
ALTER TABLE grupohubs.riders ADD COLUMN IF NOT EXISTS registration_token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS riders_registration_token_hash_key
ON grupohubs.riders(registration_token_hash)
WHERE registration_token_hash IS NOT NULL;

-- Plantillas de correo para repartidores (texto plano; el diseño lo aplica el código).
INSERT INTO grupohubs.notification_templates (template_key, name, description, audience, channel, subject, body, variables, status)
VALUES
  (
    'rider.registration_link',
    'Correo con enlace para continuar el registro de repartidor',
    'Enlace para que el repartidor suba sus documentos. El enlace vence en la fecha indicada.',
    'rider',
    'email',
    'Continúa tu registro en Hi Delivery',
    'Hola {{user.name}},

Para continuar tu registro como repartidor, sube tus documentos en el siguiente enlace:

{{registration.link}}

El enlace vence el {{registration.expires_at}}.

No compartas este enlace con nadie.

{{app.brand_signature}}',
    '["user.name", "registration.link", "registration.expires_at", "app.brand_signature"]'::jsonb,
    'ACTIVE'
  ),
  (
    'rider.documents_received',
    'Correo de confirmación de documentos recibidos',
    'Confirmación enviada al repartidor cuando sus documentos llegan para revisión.',
    'rider',
    'email',
    'Recibimos tus documentos',
    'Hola {{user.name}},

Recibimos los documentos que enviaste para tu registro como repartidor.

El equipo de Hi Delivery los revisará y te responderemos por este correo.

{{app.brand_signature}}',
    '["user.name", "app.brand_signature"]'::jsonb,
    'ACTIVE'
  )
ON CONFLICT (template_key, channel) DO NOTHING;
