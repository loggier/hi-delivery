-- Creación de la tabla de configuraciones del sistema
CREATE TABLE grupohubs.system_settings (
    id INT PRIMARY KEY,
    min_shipping_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_distance_km NUMERIC(5, 2) NOT NULL DEFAULT 0,
    max_distance_km NUMERIC(5, 2) NOT NULL DEFAULT 0,
    cost_per_extra_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar la fila única para las configuraciones. El ID siempre será 1.
INSERT INTO grupohubs.system_settings (id, min_shipping_amount, min_distance_km, max_distance_km, cost_per_extra_km)
VALUES (1, 50.00, 3.0, 15.0, 8.00);

-- Opcional: añadir un constraint para asegurar que solo exista la fila con id=1
ALTER TABLE grupohubs.system_settings ADD CONSTRAINT enforce_single_row CHECK (id = 1);
