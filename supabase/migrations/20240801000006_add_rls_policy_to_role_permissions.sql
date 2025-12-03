-- supabase/migrations/20240801000006_add_rls_policy_to_role_permissions.sql

-- Habilitar la seguridad a nivel de fila en la tabla si aún no está habilitada
ALTER TABLE grupohubs.role_permissions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Allow full access to service_role" ON grupohubs.role_permissions;
DROP POLICY IF EXISTS "Allow anon access" ON grupohubs.role_permissions;

-- Crear una política que permita el acceso total para los roles de servicio y anónimo.
-- Esto es crucial para que las funciones del servidor y las operaciones del backend funcionen.
CREATE POLICY "Allow full access for backend and anon"
ON grupohubs.role_permissions
FOR ALL
USING (true)
WITH CHECK (true);

-- Nota: Esta es una política muy permisiva. En un entorno de producción futuro,
-- se podría restringir para permitir acceso solo a roles de administrador autenticados.
-- Por ahora, esto resolverá el error de RLS.
