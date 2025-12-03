-- 1. Alter the roles table to remove the old permissions column if it exists.
ALTER TABLE public.roles DROP COLUMN IF EXISTS permissions;

-- 2. Create the modules table to store application sections.
CREATE TABLE IF NOT EXISTS public.modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.modules IS 'Stores the different modules or sections of the application for permission management.';
COMMENT ON COLUMN public.modules.id IS 'Unique identifier for the module (e.g., "users", "products").';
COMMENT ON COLUMN public.modules.name IS 'User-friendly name of the module (e.g., "Usuarios", "Productos").';


-- 3. Create the role_permissions table to link roles, modules, and actions.
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_id, module_id)
);

-- Add comments for clarity
COMMENT ON TABLE public.role_permissions IS 'Pivot table linking roles to their permissions for each module.';
COMMENT ON COLUMN public.role_permissions.role_id IS 'Foreign key to the roles table.';
COMMENT ON COLUMN public.role_permissions.module_id IS 'Foreign key to the modules table.';
COMMENT ON COLUMN public.role_permissions.can_create IS 'Permission to create new items in the module.';
COMMENT ON COLUMN public.role_permissions.can_read IS 'Permission to view items in the module.';
COMMENT ON COLUMN public.role_permissions.can_update IS 'Permission to edit items in the module.';
COMMENT ON COLUMN public.role_permissions.can_delete IS 'Permission to remove items in the module.';


-- 4. Populate the modules table with all current sections of the application.
-- Using INSERT with ON CONFLICT DO NOTHING to make the script safely rerunnable.
INSERT INTO public.modules (id, name, description) VALUES
    ('dashboard', 'Panel de Control', 'Acceso a la vista principal y estadísticas.'),
    ('pos', 'Punto de Venta', 'Acceso a la terminal de punto de venta para crear pedidos.'),
    ('shipping', 'Envíos', 'Módulo para cotizar y gestionar envíos de paquetería.'),
    ('orders', 'Pedidos', 'Gestión y seguimiento de todos los pedidos de la plataforma.'),
    ('businesses', 'Negocios', 'Gestión de la información y estado de los negocios afiliados.'),
    ('riders', 'Repartidores', 'Gestión de los perfiles y solicitudes de los repartidores.'),
    ('customers', 'Clientes', 'Visualización del historial y datos de los clientes finales.'),
    ('zones', 'Zonas', 'Administración de las zonas de operación y sus geocercas.'),
    ('subscriptions', 'Suscripciones', 'Visualización del estado de las suscripciones de los negocios.'),
    ('products', 'Productos', 'Gestión del catálogo de productos de todos los negocios.'),
    ('product_categories', 'Categorías de Productos', 'Administración de las categorías globales para productos.'),
    ('business_categories', 'Categorías de Negocios', 'Administración de las categorías para los negocios.'),
    ('plans', 'Planes', 'Gestión de los planes de suscripción para los negocios.'),
    ('users', 'Usuarios del Sistema', 'Administración de los usuarios del panel (administradores, gerentes, etc.).'),
    ('roles', 'Roles y Permisos', 'Gestión de los roles y los permisos que tiene cada uno.'),
    ('settings', 'Configuración', 'Ajustes globales del sistema.')
ON CONFLICT (id) DO NOTHING;


-- 5. Grant full permissions to the Super Administrador role for all existing modules as a baseline.
-- This script finds the ID for "Super Administrador" and inserts permissions for every module.
DO $$
DECLARE
    super_admin_role_id UUID;
    module_record RECORD;
BEGIN
    -- Find the role_id for the Super Administrator
    SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'Super Administrador' LIMIT 1;

    -- If the role exists, loop through all modules and grant full access
    IF super_admin_role_id IS NOT NULL THEN
        FOR module_record IN SELECT id FROM public.modules
        LOOP
            INSERT INTO public.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
            VALUES (super_admin_role_id, module_record.id, true, true, true, true)
            ON CONFLICT (role_id, module_id) DO UPDATE 
            SET can_create = true, can_read = true, can_update = true, can_delete = true;
        END LOOP;
    END IF;
END $$;
