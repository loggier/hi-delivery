-- 1. Alterar la tabla de roles para eliminar la columna de permisos JSONB (si existe) dentro del esquema correcto
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'grupohubs' AND table_name='roles' AND column_name='permissions') THEN
      ALTER TABLE grupohubs.roles DROP COLUMN permissions;
   END IF;
END $$;


-- 2. Crear la tabla `modules` para catalogar las secciones de la aplicación
CREATE TABLE IF NOT EXISTS grupohubs.modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- 3. Crear la tabla `role_permissions` para la relación entre roles, módulos y acciones
CREATE TABLE IF NOT EXISTS grupohubs.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES grupohubs.roles(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL REFERENCES grupohubs.modules(id) ON DELETE CASCADE,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT false,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Restricción para asegurar que no haya duplicados
    UNIQUE(role_id, module_id)
);


-- 4. Poblar la tabla `modules` con los módulos actuales de la aplicación
-- Se usa INSERT ... ON CONFLICT para evitar errores si el script se ejecuta varias veces.
INSERT INTO grupohubs.modules (id, name, description) VALUES
    ('dashboard', 'Panel de Control', 'Vista principal con estadísticas y resúmenes.'),
    ('pos', 'Punto de Venta', 'Módulo para crear pedidos manualmente.'),
    ('shipping', 'Envíos', 'Módulo para solicitar envíos de paquetería.'),
    ('orders', 'Pedidos', 'Gestión de todos los pedidos de la plataforma.'),
    ('businesses', 'Negocios', 'Administración de los negocios afiliados.'),
    ('riders', 'Repartidores', 'Gestión de la flota de repartidores.'),
    ('customers', 'Clientes', 'Catálogo y gestión de clientes finales.'),
    ('zones', 'Zonas', 'Definición de áreas geográficas de operación.'),
    ('subscriptions', 'Suscripciones', 'Vista y gestión de las suscripciones de los negocios.'),
    ('products', 'Productos', 'Catálogo global de productos.'),
    ('business-categories', 'Cat. de Negocios', 'Categorías para organizar los negocios.'),
    ('product-categories', 'Cat. de Productos', 'Categorías para organizar los productos.'),
    ('plans', 'Planes', 'Gestión de los planes de suscripción.'),
    ('users', 'Usuarios', 'Administración de usuarios del panel (staff).'),
    ('roles', 'Roles y Permisos', 'Definición de roles y sus accesos a módulos.'),
    ('settings', 'Configuración', 'Ajustes globales del sistema.')
ON CONFLICT (id) DO NOTHING;


-- 5. Asignar permisos completos al rol de Super Administrador
-- Inserta permisos para cada módulo para el rol 'Super Administrador' (asumiendo que su ID es 'role-admin').
-- Si el permiso ya existe para ese rol y módulo, no hace nada.
DO $$
DECLARE
    super_admin_role_id UUID;
    module_record RECORD;
BEGIN
    -- Obtener el ID del rol de Super Administrador (ajusta el nombre si es diferente)
    SELECT id INTO super_admin_role_id FROM grupohubs.roles WHERE name = 'Super Administrador' LIMIT 1;

    IF super_admin_role_id IS NOT NULL THEN
        -- Iterar sobre todos los módulos y dar permisos totales
        FOR module_record IN SELECT id FROM grupohubs.modules
        LOOP
            INSERT INTO grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
            VALUES (super_admin_role_id, module_record.id, true, true, true, true)
            ON CONFLICT (role_id, module_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;
