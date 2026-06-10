CREATE TABLE IF NOT EXISTS grupohubs.notification_template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  sample_value TEXT,
  audience TEXT NOT NULL DEFAULT 'system',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grupohubs.notification_constants (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grupohubs.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  audience TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_templates_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT notification_templates_channel_check CHECK (channel IN ('whatsapp', 'push', 'email', 'sms')),
  CONSTRAINT notification_templates_audience_check CHECK (audience IN ('partner', 'rider', 'customer', 'admin', 'system')),
  CONSTRAINT notification_templates_unique_key_channel UNIQUE (template_key, channel)
);

CREATE TABLE IF NOT EXISTS grupohubs.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  template_id UUID REFERENCES grupohubs.notification_templates(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  audience TEXT,
  recipient TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_subject TEXT,
  rendered_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  provider_response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_logs_status_check CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT notification_logs_channel_check CHECK (channel IN ('whatsapp', 'push', 'email', 'sms'))
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_template_key
ON grupohubs.notification_templates(template_key);

CREATE INDEX IF NOT EXISTS idx_notification_templates_channel_status
ON grupohubs.notification_templates(channel, status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_template_key
ON grupohubs.notification_logs(template_key);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at
ON grupohubs.notification_logs(created_at DESC);

INSERT INTO grupohubs.notification_constants (key, label, value, description, is_secret)
VALUES
  ('app.name', 'Nombre de la plataforma', 'Hi Delivery', 'Nombre publico usado en mensajes.', FALSE),
  ('app.site_url', 'URL del sitio', 'https://hi-delivery.com', 'URL publica del sitio.', FALSE),
  ('app.admin_url', 'URL del panel admin', 'https://hi-delivery.com/sign-in', 'URL de acceso al panel administrativo.', FALSE),
  ('app.support_phone', 'Telefono de soporte', '', 'Telefono de soporte operativo.', FALSE),
  ('app.support_whatsapp', 'WhatsApp de soporte', '', 'WhatsApp de soporte operativo.', FALSE),
  ('app.brand_signature', 'Firma de marca', 'Equipo Hi Delivery', 'Firma corta para mensajes.', FALSE),
  ('password.reset_base_url', 'URL base para recuperar password', 'https://hi-delivery.com/reset-password', 'Base para construir enlaces de recuperacion.', FALSE)
ON CONFLICT (key) DO NOTHING;

INSERT INTO grupohubs.notification_template_variables (key, label, description, sample_value, audience, source)
VALUES
  ('partner.name', 'Nombre del socio', 'Nombre comercial o contacto principal del socio.', 'Tacos El Centro', 'partner', 'seed'),
  ('partner.phone', 'Teléfono del socio', 'Teléfono del socio o negocio.', '528112345678', 'partner', 'seed'),
  ('partner.status', 'Estado del socio', 'Estado operativo del socio.', 'Activo', 'partner', 'seed'),
  ('rider.first_name', 'Nombre del repartidor', 'Primer nombre del repartidor.', 'Juan', 'rider', 'seed'),
  ('rider.last_name', 'Apellido del repartidor', 'Apellido del repartidor.', 'Pérez', 'rider', 'seed'),
  ('rider.phone', 'Teléfono del repartidor', 'WhatsApp o teléfono del repartidor.', '528187654321', 'rider', 'seed'),
  ('rider.status', 'Estado del repartidor', 'Estado operativo del repartidor.', 'Aprobado', 'rider', 'seed'),
  ('customer.name', 'Nombre del cliente', 'Nombre completo del cliente.', 'María López', 'customer', 'seed'),
  ('customer.phone', 'Teléfono del cliente', 'Teléfono o WhatsApp del cliente.', '528155512345', 'customer', 'seed'),
  ('order.id', 'ID del pedido', 'Identificador interno del pedido.', 'ord-123', 'system', 'seed'),
  ('order.total', 'Total del pedido', 'Total monetario del pedido.', '$249.00', 'system', 'seed'),
  ('order.status', 'Estado del pedido', 'Estado actual del pedido.', 'En camino', 'system', 'seed'),
  ('order.pickup_address', 'Dirección de recolección', 'Dirección origen del pedido.', 'Av. Universidad 100', 'system', 'seed'),
  ('order.delivery_address', 'Dirección de entrega', 'Dirección destino del pedido.', 'Calle Reforma 200', 'system', 'seed'),
  ('user.name', 'Nombre del usuario', 'Nombre de usuario del panel o app.', 'Ana Martínez', 'system', 'seed'),
  ('user.email', 'Correo del usuario', 'Correo del usuario.', 'ana@example.com', 'system', 'seed'),
  ('password.reset_link', 'Enlace de recuperación', 'URL para cambiar contraseña.', 'https://app.example.com/reset?token=abc', 'system', 'seed'),
  ('password.reset_expires_at', 'Expiración de recuperación', 'Fecha/hora de expiración del enlace.', '25/05/2026 19:00', 'system', 'seed'),
  ('app.name', 'Nombre de la plataforma', 'Nombre de la aplicación.', 'Hi Delivery', 'system', 'seed'),
  ('app.site_url', 'URL del sitio', 'URL pública del sitio.', 'https://hi-delivery.com', 'system', 'seed'),
  ('app.admin_url', 'URL del panel admin', 'URL de acceso al panel administrativo.', 'https://hi-delivery.com/sign-in', 'system', 'seed'),
  ('app.support_phone', 'Teléfono de soporte', 'Teléfono de soporte operativo.', '8180000000', 'system', 'seed'),
  ('app.support_whatsapp', 'WhatsApp de soporte', 'WhatsApp de soporte operativo.', '528180000000', 'system', 'seed'),
  ('app.brand_signature', 'Firma de marca', 'Firma corta de cierre.', 'Equipo Hi Delivery', 'system', 'seed')
ON CONFLICT (key) DO NOTHING;

INSERT INTO grupohubs.notification_templates (template_key, name, description, audience, channel, subject, body, variables, status)
VALUES
  (
    'rider.welcome',
    'Bienvenida repartidor',
    'Mensaje enviado cuando un repartidor queda aprobado.',
    'rider',
    'whatsapp',
    NULL,
    'Hola {{rider.first_name}}, bienvenido a {{app.name}}. Tu cuenta de repartidor fue activada y ya puedes recibir pedidos.',
    '["rider.first_name", "app.name"]'::jsonb,
    'ACTIVE'
  ),
  (
    'partner.welcome',
    'Bienvenida socio',
    'Mensaje enviado cuando un socio queda activo.',
    'partner',
    'whatsapp',
    NULL,
    'Hola {{partner.name}}, tu negocio ya está activo en {{app.name}}. Puedes comenzar a gestionar pedidos.',
    '["partner.name", "app.name"]'::jsonb,
    'ACTIVE'
  ),
  (
    'order.created',
    'Pedido creado',
    'Notificación operativa cuando se crea un pedido.',
    'admin',
    'push',
    'Nuevo pedido {{order.id}}',
    'Se creó el pedido {{order.id}} por {{order.total}} para {{customer.name}}.',
    '["order.id", "order.total", "customer.name"]'::jsonb,
    'ACTIVE'
  ),
  (
    'password.reset_request',
    'Solicitud de recuperación de contraseña',
    'Mensaje con enlace para recuperar contraseña.',
    'system',
    'whatsapp',
    NULL,
    'Hola {{user.name}}, solicitaste recuperar tu contraseña en {{app.name}}. Usa este enlace: {{password.reset_link}}',
    '["user.name", "app.name", "password.reset_link"]'::jsonb,
    'ACTIVE'
  )
ON CONFLICT (template_key, channel) DO NOTHING;
