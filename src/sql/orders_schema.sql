
-- ### TIPOS ENUMERADOS (ENUMS) ###

-- Eliminar el tipo si ya existe para evitar errores en re-ejecución
DROP TYPE IF EXISTS grupohubs.order_status;
DROP TYPE IF EXISTS grupohubs.order_event_type;

-- Tipo para los estados de un pedido
CREATE TYPE grupohubs.order_status AS ENUM (
  'pending_acceptance', -- Esperando que un repartidor acepte
  'accepted',           -- Repartidor aceptó y va al negocio
  'at_store',           -- Repartidor llegó al negocio
  'picked_up',          -- Repartidor recogió y va al cliente
  'on_the_way',         -- Repartidor en camino
  'delivered',          -- Repartidor entregó
  'completed',          -- Pedido finalizado/pagado
  'cancelled'           -- Pedido cancelado
);

-- Tipo para los eventos de la orden
CREATE TYPE grupohubs.order_event_type AS ENUM (
  'pending',            -- Creación del pedido
  'accepted',           -- Repartidor acepta
  'at_store',           -- Repartidor en negocio
  'picked_up',          -- Repartidor recoge
  'delivered',          -- Repartidor entrega
  'cancelled'           -- Pedido cancelado por alguna de las partes
);


-- ### TABLAS PRINCIPALES ###

-- Eliminar tablas si existen en el orden correcto para evitar errores de dependencias
DROP TABLE IF EXISTS grupohubs.order_events;
DROP TABLE IF EXISTS grupohubs.order_items;
DROP TABLE IF EXISTS grupohubs.orders;

-- Tabla principal de pedidos (orders)
CREATE TABLE grupohubs.orders (
  id character varying(255) PRIMARY KEY,
  business_id character varying(255) REFERENCES grupohubs.businesses(id),
  customer_id character varying(255) REFERENCES grupohubs.customers(id),
  rider_id character varying(255) REFERENCES grupohubs.riders(id),
  status grupohubs.order_status NOT NULL DEFAULT 'pending_acceptance',
  
  -- Direcciones como JSONB
  pickup_address jsonb NOT NULL,
  delivery_address jsonb NOT NULL,
  
  -- Detalles del cliente (cacheado para acceso rápido)
  customer_name character varying(255),
  customer_phone character varying(50),
  
  -- Detalles de los productos y costos
  items_description text,
  subtotal numeric(10, 2) NOT NULL,
  delivery_fee numeric(10, 2) NOT NULL,
  order_total numeric(10, 2) NOT NULL,
  
  -- Detalles de la ruta
  distance numeric(10, 2), -- en kilómetros

  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE grupohubs.orders IS 'Tabla principal de pedidos';
COMMENT ON COLUMN grupohubs.orders.pickup_address IS 'JSONB con { "text": "Dirección", "coordinates": { "lat": 0, "lng": 0 } }';
COMMENT ON COLUMN grupohubs.orders.delivery_address IS 'JSONB con { "text": "Dirección", "coordinates": { "lat": 0, "lng": 0 } }';


-- Tabla de ítems de cada pedido (order_items)
CREATE TABLE grupohubs.order_items (
  id bigserial PRIMARY KEY,
  order_id character varying(255) REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
  product_id character varying(255) REFERENCES grupohubs.products(id),
  quantity integer NOT NULL,
  price numeric(10, 2) NOT NULL,
  
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE grupohubs.order_items IS 'Ítems específicos de cada pedido';


-- Tabla de eventos de la orden (order_events)
CREATE TABLE grupohubs.order_events (
  id bigserial PRIMARY KEY,
  order_id character varying(255) REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
  rider_id character varying(255) REFERENCES grupohubs.riders(id),
  event_type grupohubs.order_event_type NOT NULL,
  event_timestamp timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Datos adicionales opcionales
  notes text,
  photo_url character varying(255),
  location jsonb -- Para registrar la ubicación del repartidor en cada evento
);

COMMENT ON TABLE grupohubs.order_events IS 'Historial de eventos para cada pedido, trazabilidad del repartidor';
COMMENT ON COLUMN grupohubs.order_events.photo_url IS 'URL a la foto de evidencia en la entrega';
COMMENT ON COLUMN grupohubs.order_events.location IS 'JSONB con { "lat": 0, "lng": 0 }';


-- ### ÍNDICES ###
CREATE INDEX idx_orders_status ON grupohubs.orders(status);
CREATE INDEX idx_orders_rider_id ON grupohubs.orders(rider_id);
CREATE INDEX idx_orders_business_id ON grupohubs.orders(business_id);
CREATE INDEX idx_order_items_order_id ON grupohubs.order_items(order_id);
CREATE INDEX idx_order_events_order_id ON grupohubs.order_events(order_id);


-- ### SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY) ###

-- Habilitar RLS en todas las tablas
ALTER TABLE grupohubs.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.order_events ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para asegurar un estado limpio
DROP POLICY IF EXISTS "Allow all access for orders" ON grupohubs.orders;
DROP POLICY IF EXISTS "Allow all access for order_items" ON grupohubs.order_items;
DROP POLICY IF EXISTS "Allow all access for order_events" ON grupohubs.order_events;
DROP POLICY IF EXISTS "Allow public users to create orders" ON grupohubs.orders;

-- Políticas permisivas para la clave de servicio (service_role) y para desarrollo con la clave anónima
-- Esto permite el acceso completo desde el lado del servidor y desde el cliente durante el desarrollo.
CREATE POLICY "Allow all access for orders" ON grupohubs.orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access for order_items" ON grupohubs.order_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access for order_events" ON grupohubs.order_events
  FOR ALL
  USING (true)
  WITH CHECK (true);
