-- Asegúrate de ejecutar esto en el editor SQL de Supabase.

-- Eliminamos los tipos si ya existen para evitar conflictos
DROP TYPE IF EXISTS grupohubs.order_status CASCADE;
DROP TYPE IF EXISTS grupohubs.order_event_type CASCADE;

-- Creamos los tipos ENUM para estandarizar los estados y eventos
CREATE TYPE grupohubs.order_status AS ENUM (
  'pending_acceptance', -- Esperando que un repartidor acepte
  'accepted',           -- Repartidor aceptó y va al negocio
  'at_store',           -- Repartidor llegó al negocio
  'picked_up',          -- Repartidor recogió y va al cliente
  'on_the_way',         -- Repartidor llegó con el cliente
  'delivered',          -- Pedido entregado (foto de evidencia)
  'completed',          -- Pedido finalizado y pagado
  'cancelled'           -- Pedido cancelado
);

CREATE TYPE grupohubs.order_event_type AS ENUM (
  'accepted',
  'arrived_at_store',
  'picked_up',
  'arrived_at_destination',
  'delivered',
  'cancelled'
);

-- Tabla principal de pedidos (orders)
CREATE TABLE IF NOT EXISTS grupohubs.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    short_id text UNIQUE NOT NULL,
    status grupohubs.order_status NOT NULL DEFAULT 'pending_acceptance',

    business_id uuid REFERENCES grupohubs.businesses(id),
    customer_id uuid REFERENCES grupohubs.customers(id),
    rider_id uuid REFERENCES grupohubs.riders(id) ON DELETE SET NULL,

    -- Origen y Destino (se guardan como JSON por flexibilidad)
    origin_address jsonb,
    destination_address jsonb NOT NULL,

    -- Detalles para el repartidor
    customer_name text,
    customer_phone text,
    items_description text NOT NULL,
    pickup_instructions text,
    delivery_instructions text,

    -- Detalles financieros
    order_total numeric(10, 2) NOT NULL DEFAULT 0,
    delivery_fee numeric(10, 2) NOT NULL DEFAULT 0,
    estimated_earnings numeric(10, 2), -- Ganancia estimada para el repartidor
    
    -- Métricas de ruta
    distance_meters integer,
    duration_seconds integer,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabla de ítems del pedido (order_items)
CREATE TABLE IF NOT EXISTS grupohubs.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES grupohubs.products(id) ON DELETE SET NULL, -- Puede ser null para envíos express
    
    description text NOT NULL, -- Ej. "Taco al Pastor" o "Documentos importantes"
    quantity integer NOT NULL DEFAULT 1,
    price numeric(10, 2) NOT NULL,

    created_at timestamptz DEFAULT now()
);

-- Tabla de eventos del pedido (order_events)
CREATE TABLE IF NOT EXISTS grupohubs.order_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES grupohubs.orders(id) ON DELETE CASCADE,
    rider_id uuid REFERENCES grupohubs.riders(id),

    event_type grupohubs.order_event_type NOT NULL,
    event_time timestamptz NOT NULL DEFAULT now(),
    
    -- Datos adicionales por evento
    coordinates geography(Point, 4326), -- Para registrar la ubicación del repartidor en cada evento
    photo_evidence_url text, -- Específico para el evento 'delivered'
    notes text
);


-- Habilitar Row Level Security (RLS) en todas las tablas nuevas.
-- Las políticas se definirán en un paso posterior.
ALTER TABLE IF EXISTS grupohubs.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS grupohubs.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS grupohubs.order_events ENABLE ROW LEVEL SECURITY;


-- Función para generar un ID corto y legible
CREATE OR REPLACE FUNCTION grupohubs.generate_short_id()
RETURNS text AS $$
DECLARE
    new_id text;
    done bool;
BEGIN
    done := false;
    WHILE NOT done LOOP
        new_id := upper(substr(md5(random()::text), 0, 7));
        done := NOT exists(SELECT 1 FROM grupohubs.orders WHERE short_id=new_id);
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE PLPGSQL VOLATILE;

-- Trigger para asignar el short_id automáticamente
CREATE OR REPLACE TRIGGER set_short_id_on_insert
BEFORE INSERT ON grupohubs.orders
FOR EACH ROW
EXECUTE FUNCTION grupohubs.generate_short_id_trigger();

CREATE OR REPLACE FUNCTION grupohubs.generate_short_id_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.short_id := grupohubs.generate_short_id();
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;
