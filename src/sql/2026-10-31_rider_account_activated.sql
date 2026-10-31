-- Plantilla de correo para repartidores cuando su cuenta queda activa (forward-only, sólo INSERT).
-- Texto plano; las imágenes de las tiendas de apps van en el diseño del correo, no aquí.

INSERT INTO grupohubs.notification_templates (template_key, name, description, audience, channel, subject, body, variables, status)
VALUES
  (
    'rider.account_activated',
    'Correo de cuenta de repartidor activa',
    'Confirmación enviada al repartidor cuando sus documentos son aprobados y su cuenta queda activa.',
    'rider',
    'email',
    'Tu cuenta de repartidor está activa',
    'Hola {{user.name}},

Tus documentos fueron aprobados y tu cuenta de repartidor está activa.

Bienvenido al equipo de Hi Delivery.

Descarga la app de repartidores para comenzar a recibir pedidos:
- Android: disponible en Google Play.
- iOS: disponible en la App Store.

{{app.brand_signature}}',
    '["user.name", "app.brand_signature"]'::jsonb,
    'ACTIVE'
  )
ON CONFLICT (template_key, channel) DO NOTHING;
