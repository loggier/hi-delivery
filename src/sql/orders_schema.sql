-- Eliminar tablas en orden inverso para manejar dependencias
DROP TABLE IF EXISTS grupohubs.order_events;
DROP TABLE IF EXISTS grupohubs.order_items;
DROP TABLE IF EXISTS grupohubs.orders;
DROP TABLE IF EXISTS grupohubs.customers;
DROP TABLE IF EXISTS grupohubs.customer_addresses;

-- Eliminar ENUMs personalizados. Usamos CASCADE para eliminar dependencias en columnas.
DROP TYPE IF EXISTS grupohubs.order_status CASCADE;
DROP TYPE IF EXISTS grupohubs.order_event_type CASCADE;
DROP TYPE IF EXISTS grupohubs.address CASCADE;

-- Crear tipos ENUM para estados y eventos de pedidos
CREATE TYPE grupohubs.order_status AS ENUM (
  'pending_acceptance', -- Esperando que un repartidor acepte
  'accepted',           -- Repartidor aceptó y va al negocio
  'at_store',           -- Repartidor llegó al negocio
  'picked_up',          -- Repartidor recogió y va al cliente
  'on_the_way',         -- Repartidor llegó con el cliente (o está muy cerca)
  'delivered',          -- Pedido entregado (con o sin foto)
  'completed',          -- Pedido finalizado/archivado
  'cancelled'           -- Pedido cancelado
);

CREATE TYPE grupohubs.order_event_type AS ENUM (
  'pending',            -- Pedido creado
  'accepted',           -- Repartidor aceptó
  'at_store',           -- Repartidor en negocio
  'picked_up',          -- Repartidor recogió
  'on_the_way',         -- Repartidor en destino
  'delivered',          -- Entregado
  'cancelled'           -- Cancelado
);

-- Crear tipo personalizado para direcciones
CREATE TYPE grupohubs.address AS (
  text TEXT,
  coordinates JSONB
);

-- Crear tabla de clientes
CREATE TABLE grupohubs.customers (
    id character varying(255) PRIMARY KEY,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    order_count integer DEFAULT 0,
    total_spent numeric(10, 2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de direcciones de clientes
CREATE TABLE grupohubs.customer_addresses (
    id character varying(255) PRIMARY KEY,
    customer_id character varying(255) REFERENCES grupohubs.customers(id) ON DELETE CASCADE,
    address text NOT NULL,
    neighborhood character varying(255),
    city character varying(255),
    state character varying(255),
    zip_code character varying(10),
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla principal de pedidos (orders)
CREATE TABLE grupohubs.orders (
    id character varying(255) PRIMARY KEY,
    business_id character varying(255) REFERENCES grupohubs.businesses(id),
    customer_id character varying(255) REFERENCES grupohubs.customers(id),
    rider_id character varying(255) REFERENCES grupohubs.riders(id),
    status grupohubs.order_status NOT NULL DEFAULT 'pending_acceptance',
    
    pickup_address grupohubs.address NOT NULL,
    delivery_address grupohubs.address NOT NULL,
    
    pickup_business_name character varying(255) NOT NULL,
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(255) NOT NULL,
    
    items_description text,
    
    subtotal numeric(10, 2) NOT NULL DEFAULT 0,
    delivery_fee numeric(10, 2) NOT NULL DEFAULT 0,
    order_total numeric(10, 2) NOT NULL DEFAULT 0,
    estimated_earnings numeric(10, 2),
    distance double precision, -- en km
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de ítems de pedido (order_items)
CREATE TABLE grupohubs.order_items (
    id bigserial PRIMARY KEY,
    order_id character varying(255) REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    product_id character varying(255) REFERENCES grupohubs.products(id),
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    -- Opcional: podrías guardar una copia del nombre del producto aquí
    product_name character varying(255)
);

-- Crear tabla de eventos de pedido (order_events)
CREATE TABLE grupohubs.order_events (
    id bigserial PRIMARY KEY,
    order_id character varying(255) REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    rider_id character varying(255) REFERENCES grupohubs.riders(id),
    event_type grupohubs.order_event_type NOT NULL,
    event_time timestamp with time zone DEFAULT now(),
    coordinates JSONB, -- Para guardar lat/lng en el momento del evento
    photo_url character varying(255), -- Para la foto de evidencia
    notes text
);

-- --- COMENTARIOS Y POLÍTICAS DE SEGURIDAD (RLS) ---

-- Comentarios para claridad
COMMENT ON TABLE grupohubs.orders IS 'Tabla principal de pedidos';
COMMENT ON TABLE grupohubs.order_items IS 'Ítems específicos de cada pedido';
COMMENT ON TABLE grupohubs.order_events IS 'Historial de eventos y cambios de estado de un pedido';

-- Habilitar Row Level Security (RLS) en las tablas
ALTER TABLE grupohubs.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupohubs.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acceso público de lectura (SELECT) y escritura (INSERT)
-- Esto es necesario para que la anon key pueda interactuar con las tablas.
-- En un entorno de producción, estas reglas serían mucho más restrictivas.

CREATE POLICY "Allow public insert access on orders" ON grupohubs.orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public read access on orders" ON grupohubs.orders FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access on order_items" ON grupohubs.order_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public read access on order_items" ON grupohubs.order_items FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert access on order_events" ON grupohubs.order_events FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public read access on order_events" ON grupohubs.order_events FOR SELECT TO public USING (true);

CREATE POLICY "Allow public access on customers" ON grupohubs.customers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on customer_addresses" ON grupohubs.customer_addresses FOR ALL TO public USING (true) WITH CHECK (true);
