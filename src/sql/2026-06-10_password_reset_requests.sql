CREATE TABLE IF NOT EXISTS grupohubs.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES grupohubs.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  delivery_channel TEXT NOT NULL DEFAULT 'whatsapp',
  recipient TEXT NOT NULL,
  token_hash TEXT,
  code_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  request_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT password_reset_requests_target_type_check CHECK (target_type IN ('web', 'rider')),
  CONSTRAINT password_reset_requests_delivery_channel_check CHECK (delivery_channel IN ('whatsapp')),
  CONSTRAINT password_reset_requests_attempt_count_check CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id
ON grupohubs.password_reset_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_token_hash
ON grupohubs.password_reset_requests(token_hash)
WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_recipient_created_at
ON grupohubs.password_reset_requests(recipient, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_expires_at
ON grupohubs.password_reset_requests(expires_at);

INSERT INTO grupohubs.notification_template_variables (key, label, description, sample_value, audience, source)
VALUES
  ('password.reset_code', 'Codigo de recuperacion', 'Codigo temporal de 6 digitos para recuperar contrasena en app.', '482913', 'system', 'seed')
ON CONFLICT (key) DO NOTHING;

INSERT INTO grupohubs.notification_templates (template_key, name, description, audience, channel, subject, body, variables, status)
VALUES
  (
    'password.reset_code',
    'Codigo de recuperacion de contrasena',
    'Mensaje con codigo temporal para que un repartidor recupere su contrasena desde la app.',
    'rider',
    'whatsapp',
    NULL,
    'Hola {{user.name}}, tu codigo para recuperar tu contrasena en {{app.name}} es {{password.reset_code}}. Expira en 1 hora.',
    '["user.name", "app.name", "password.reset_code"]'::jsonb,
    'ACTIVE'
  )
ON CONFLICT (template_key, channel) DO NOTHING;
