-- Limpieza inicial para desarrollo. El CASCADE es crucial para eliminar objetos dependientes.
DROP TABLE IF EXISTS grupohubs.order_events CASCADE;
DROP TABLE IF EXISTS grupohubs.order_items CASCADE;
DROP TABLE IF EXISTS grupohubs.orders CASCADE;
DROP TABLE IF EXISTS grupohubs.customers CASCADE;
DROP TABLE IF EXISTS grupohubs.customer_addresses CASCADE;

DROP TYPE IF EXISTS grupohubs.order_status CASCADE;
DROP TYPE IF EXISTS grupohubs.order_event_type CASCADE;


-- Creación de Tipos (ENUMs) para garantizar la integridad de los datos.
CREATE TYPE grupohubs.order_status AS ENUM (
  'pending_acceptance', -- Esperando que un repartidor acepte
  'accepted',           -- Repartidor aceptó y va al negocio
  'at_store',           -- Repartidor llegó al negocio
  'cooking',            -- El negocio está preparando el pedido (opcional)
  'ready_for_pickup',   -- Pedido listo para ser recogido
  'picked_up',          -- Repartidor recogió el pedido y va al cliente
  'on_the_way',         -- Repartidor en camino a la entrega
  'arrived_at_destination', -- Repartidor llegó al destino del cliente
  'delivered',          -- Pedido entregado (pendiente de confirmación final)
  'completed',          -- Pedido finalizado y pagado
  'cancelled',          -- Pedido cancelado
  'refunded',           -- Pedido reembolsado
  'failed'              -- Pago fallido u otro error grave
);

CREATE TYPE grupohubs.order_event_type AS ENUM (
  'pending',
  'accepted',
  'arrived_at_store',
  'picked_up',
  'arrived_at_destination',
  'delivered',
  'cancelled',
  'driver_assigned',
  'other'
);


-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS grupohubs.customers (
    id character varying(255) PRIMARY KEY NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL UNIQUE,
    email character varying(255) UNIQUE,
    order_count integer DEFAULT 0,
    total_spent numeric(10, 2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE grupohubs.customers IS 'Tabla para almacenar información de los clientes finales.';

-- Tabla de Direcciones de Clientes
CREATE TABLE IF NOT EXISTS grupohubs.customer_addresses (
    id character varying(255) PRIMARY KEY NOT NULL,
    customer_id character varying(255) NOT NULL,
    address text NOT NULL,
    neighborhood character varying(255),
    city character varying(255),
    state character varying(255),
    zip_code character varying(10),
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES grupohubs.customers(id) ON DELETE CASCADE
);

COMMENT ON TABLE grupohubs.customer_addresses IS 'Almacena múltiples direcciones por cliente.';


-- Tabla Principal de Pedidos
CREATE TABLE IF NOT EXISTS grupohubs.orders (
    id character varying(255) PRIMARY KEY NOT NULL,
    business_id character varying(255) NOT NULL,
    customer_id character varying(255) NOT NULL,
    rider_id character varying(255),
    status grupohubs.order_status DEFAULT 'pending_acceptance',
    
    -- Direcciones en formato JSON para flexibilidad
    pickup_address jsonb NOT NULL,
    delivery_address jsonb NOT NULL,
    
    customer_name character varying(255) NOT NULL,
    customer_phone character varying(50) NOT NULL,
    
    items_description text,
    
    -- Campos Financieros
    subtotal numeric(10, 2) NOT NULL,
    delivery_fee numeric(10, 2) NOT NULL,
    order_total numeric(10, 2) NOT NULL,
    estimated_earnings numeric(10, 2), -- Ganancia estimada para el repartidor
    
    distance numeric(8, 2), -- Distancia en KM

    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,

    -- Llaves Foráneas
    CONSTRAINT fk_business FOREIGN KEY(business_id) REFERENCES grupohubs.businesses(id),
    CONSTRAINT fk_customer FOREIGN KEY(customer_id) REFERENCES grupohubs.customers(id),
    CONSTRAINT fk_rider FOREIGN KEY(rider_id) REFERENCES grupohubs.riders(id)
);

COMMENT ON TABLE grupohubs.orders IS 'Tabla central que contiene todos los pedidos del sistema.';

-- Tabla de Ítems del Pedido
CREATE TABLE IF NOT EXISTS grupohubs.order_items (
    id bigserial PRIMARY KEY,
    order_id character varying(255) NOT NULL,
    product_id character varying(255), -- Nulable para pedidos que no son de catálogo
    quantity integer NOT NULL,
    price numeric(10, 2) NOT NULL,
    item_description text, -- Por si el producto no existe en nuestro catálogo

    CONSTRAINT fk_order FOREIGN KEY(order_id) REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_product FOREIGN KEY(product_id) REFERENCES grupohubs.products(id) ON DELETE SET NULL
);

COMMENT ON TABLE grupohubs.order_items IS 'Detalle de los productos o ítems de cada pedido.';

-- Tabla de Eventos del Pedido (Historial)
CREATE TABLE IF NOT EXISTS grupohubs.order_events (
    id bigserial PRIMARY KEY,
    order_id character varying(255) NOT NULL,
    rider_id character varying(255),
    event_type grupohubs.order_event_type NOT NULL,
    event_time timestamp with time zone DEFAULT now(),
    notes text,
    photo_url character varying(2048),
    location jsonb, -- Para guardar {lat, lng} del evento

    CONSTRAINT fk_order_event FOREIGN KEY(order_id) REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_rider_event FOREIGN KEY(rider_id) REFERENCES grupohubs.riders(id)
);

COMMENT ON TABLE grupohubs.order_events IS 'Registra el historial de eventos de un pedido, como "aceptado", "recogido", "entregado".';


-- Políticas de Seguridad a Nivel de Fila (RLS)

-- Orders
ALTER TABLE grupohubs.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for orders" ON grupohubs.orders;
CREATE POLICY "Public access for orders" ON grupohubs.orders
    FOR ALL
    TO public
    USING (true);

-- Order Items
ALTER TABLE grupohubs.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for order items" ON grupohubs.order_items;
CREATE POLICY "Public access for order items" ON grupohubs.order_items
    FOR ALL
    TO public
    USING (true);

-- Order Events
ALTER TABLE grupohubs.order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for order events" ON grupohubs.order_events;
CREATE POLICY "Public access for order events" ON grupohubs.order_events
    FOR ALL
    TO public
    USING (true);

-- Customers
ALTER TABLE grupohubs.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for customers" ON grupohubs.customers;
CREATE POLICY "Public access for customers" ON grupohubs.customers
    FOR ALL
    TO public
    USING (true);
    
-- Customer Addresses
ALTER TABLE grupohubs.customer_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for customer addresses" ON grupohubs.customer_addresses;
CREATE POLICY "Public access for customer addresses" ON grupohubs.customer_addresses
    FOR ALL
    TO public
    USING (true);
    
