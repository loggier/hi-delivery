-- Eliminar tablas y tipos si existen (en orden inverso de dependencia)
DROP TABLE IF EXISTS grupohubs.order_events CASCADE;
DROP TABLE IF EXISTS grupohubs.order_items CASCADE;
DROP TABLE IF EXISTS grupohubs.orders CASCADE;
DROP TYPE IF EXISTS grupohubs.order_status;
DROP TYPE IF EXISTS grupohubs.order_event_type;

-- Crear ENUM para los estados de la orden
CREATE TYPE grupohubs.order_status AS ENUM (
  'pending_acceptance',
  'accepted',
  'at_store',
  'picked_up',
  'on_the_way',
  'delivered',
  'completed',
  'cancelled',
  'pending'
);

-- Crear ENUM para los tipos de evento de la orden
CREATE TYPE grupohubs.order_event_type AS ENUM (
  'pending',
  'accepted',
  'arrived_at_store',
  'picked_up',
  'arrived_at_destination',
  'delivered',
  'completed',
  'cancelled'
);


-- Tabla principal de pedidos
CREATE TABLE grupohubs.orders (
    id character varying(255) PRIMARY KEY,
    customer_id character varying(255) REFERENCES grupohubs.customers(id) ON DELETE SET NULL,
    business_id character varying(255) REFERENCES grupohubs.businesses(id) ON DELETE CASCADE NOT NULL,
    rider_id character varying(255) REFERENCES grupohubs.riders(id) ON DELETE SET NULL,
    
    status grupohubs.order_status NOT NULL DEFAULT 'pending',
    
    pickup_address jsonb NOT NULL,
    delivery_address jsonb NOT NULL,
    
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(255) NOT NULL,
    
    items_description text,
    
    subtotal numeric(10, 2) NOT NULL DEFAULT 0,
    delivery_fee numeric(10, 2) NOT NULL DEFAULT 0,
    order_total numeric(10, 2) NOT NULL DEFAULT 0,
    
    distance numeric(10, 2), -- en KM

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE grupohubs.orders IS 'Tabla principal de pedidos';

-- Tabla de ítems del pedido
CREATE TABLE grupohubs.order_items (
    id bigserial PRIMARY KEY,
    order_id character varying(255) REFERENCES grupohubs.orders(id) ON DELETE CASCADE NOT NULL,
    product_id character varying(255) REFERENCES grupohubs.products(id) ON DELETE SET NULL,
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),

    -- Para evitar duplicados del mismo producto en la misma orden
    UNIQUE(order_id, product_id)
);
COMMENT ON TABLE grupohubs.order_items IS 'Ítems individuales de cada pedido';


-- Tabla de eventos/historial del pedido
CREATE TABLE grupohubs.order_events (
    id bigserial PRIMARY KEY,
    order_id character varying(255) REFERENCES grupohubs.orders(id) ON DELETE CASCADE NOT NULL,
    event_type grupohubs.order_event_type NOT NULL,
    event_timestamp timestamptz NOT NULL DEFAULT now(),
    notes text,
    photo_url character varying(2048),
    location jsonb -- para guardar lat/lng del repartidor en el momento del evento
);
COMMENT ON TABLE grupohubs.order_events IS 'Registra cada paso y cambio de estado en el ciclo de vida de un pedido';

-- Habilitar Row Level Security
ALTER TABLE grupohubs.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.order_events ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS ( permisivas para empezar, se deben ajustar para producción )
CREATE POLICY "Allow all for authenticated users" ON grupohubs.orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON grupohubs.order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON grupohubs.order_events FOR ALL TO authenticated USING (true);
