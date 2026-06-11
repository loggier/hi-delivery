INSERT INTO grupohubs.notification_templates (template_key, name, description, audience, channel, subject, body, variables, status)
VALUES
  (
    'password.changed',
    'Confirmacion de cambio de contrasena',
    'Mensaje de seguridad enviado cuando una contrasena se cambia correctamente.',
    'system',
    'whatsapp',
    NULL,
    'Hi Delivery: Hola {{user.name}}, tu contrasena ha sido cambiada correctamente. Si no fuiste tu, contacta a soporte de inmediato.',
    '["user.name", "app.name"]'::jsonb,
    'ACTIVE'
  )
ON CONFLICT (template_key, channel) DO NOTHING;
