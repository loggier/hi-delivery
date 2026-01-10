-- Añade una columna para rastrear a los repartidores notificados para un pedido.
ALTER TABLE grupohubs.orders
ADD COLUMN notified_riders JSONB DEFAULT '[]'::jsonb;
