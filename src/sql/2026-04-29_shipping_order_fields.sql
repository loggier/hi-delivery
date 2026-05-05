-- Campos nuevos para pedidos de shipping
-- Ejecutar en la base de datos del servidor antes de usar el flujo nuevo.

ALTER TABLE grupohubs.orders
  ADD COLUMN IF NOT EXISTS ticket_photo_url character varying(2048),
  ADD COLUMN IF NOT EXISTS ticket_photo_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ready_in_minutes integer;

COMMENT ON COLUMN grupohubs.orders.ticket_photo_url IS 'URL publica de la foto del ticket del pedido.';
COMMENT ON COLUMN grupohubs.orders.ticket_photo_urls IS 'URLs publicas de las fotos del ticket del pedido.';
COMMENT ON COLUMN grupohubs.orders.ready_in_minutes IS 'Minutos estimados para que el pedido este listo para salir.';
