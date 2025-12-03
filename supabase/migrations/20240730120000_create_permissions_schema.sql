-- supabase/migrations/20240730120000_create_permissions_schema.sql

-- 1. Drop the old permissions column from the roles table if it exists
DO $$
BEGIN
   IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'grupohubs' 
      AND table_name = 'roles' 
      AND column_name = 'permissions'
   ) THEN
      ALTER TABLE grupohubs.roles DROP COLUMN permissions;
   END IF;
END $$;


-- 2. Create the new modules table
CREATE TABLE IF NOT EXISTS grupohubs.modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- Enable RLS for the new tables
ALTER TABLE grupohubs.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to modules" ON grupohubs.modules FOR SELECT USING (true);


-- 3. Create the new role_permissions table
-- This table links roles to modules and defines the actions they can perform.
CREATE TABLE IF NOT EXISTS grupohubs.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id TEXT NOT NULL REFERENCES grupohubs.roles(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL REFERENCES grupohubs.modules(id) ON DELETE CASCADE,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT false,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, module_id)
);

-- Enable RLS for the new tables
ALTER TABLE grupohubs.role_permissions ENABLE ROW LEVEL SECURITY;
-- For now, allow admin users full access. You can refine this later.
CREATE POLICY "Allow full access to admins on role_permissions" 
ON grupohubs.role_permissions FOR ALL 
USING (auth.jwt() ->> 'user_role' = 'admin') 
WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');


-- 4. Populate the modules table with all the sections from the admin panel
INSERT INTO grupohubs.modules (id, name, description) VALUES
    ('dashboard', 'Panel de Control', 'Visualización de estadísticas y métricas clave.'),
    ('pos', 'Punto de Venta', 'Creación de pedidos manuales para clientes.'),
    ('shipping', 'Envíos', 'Módulo para cotizar y crear envíos de paquetería.'),
    ('orders', 'Pedidos', 'Gestión y seguimiento de todos los pedidos de la plataforma.'),
    ('businesses', 'Negocios', 'Administración de los negocios afiliados.'),
    ('riders', 'Repartidores', 'Administración de los repartidores.'),
    ('customers', 'Clientes', 'Catálogo de clientes que han realizado pedidos.'),
    ('zones', 'Zonas', 'Gestión de las áreas geográficas de operación.'),
    ('subscriptions', 'Suscripciones', 'Visualización y gestión de las suscripciones de los negocios.'),
    ('products', 'Productos', 'Catálogo general de productos de todos los negocios.'),
    ('business-categories', 'Cat. de Negocios', 'Categorías para organizar los negocios.'),
    ('product-categories', 'Cat. de Productos', 'Categorías para organizar los productos.'),
    ('plans', 'Planes', 'Gestión de los planes de suscripción para negocios.'),
    ('users', 'Usuarios', 'Administración de usuarios del panel (staff).'),
    ('roles', 'Roles y Permisos', 'Gestión de roles y sus respectivos permisos.'),
    ('settings', 'Configuración', 'Ajustes globales del sistema.')
ON CONFLICT (id) DO NOTHING;


-- 5. Grant all permissions for all modules to the Super Admin role
-- This ensures the main admin can still do everything after the migration.
-- Assumes the super admin role has the name 'Super Administrador'
DO $$
DECLARE
    admin_role_id TEXT;
    module_record RECORD;
BEGIN
    -- Find the ID of the Super Administrador role
    SELECT id INTO admin_role_id FROM grupohubs.roles WHERE name = 'Super Administrador' LIMIT 1;

    -- If the role exists, loop through all modules and grant full permissions
    IF admin_role_id IS NOT NULL THEN
        FOR module_record IN SELECT id FROM grupohubs.modules LOOP
            INSERT INTO grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
            VALUES (admin_role_id, module_record.id, true, true, true, true)
            ON CONFLICT (role_id, module_id) DO UPDATE SET
                can_create = EXCLUDED.can_create,
                can_read = EXCLUDED.can_read,
                can_update = EXCLUDED.can_update,
                can_delete = EXCLUDED.can_delete;
        END LOOP;
    END IF;
END $$;
