-- Continúa 20261103000000_revoke_anon_rider_user_writes.sql (aplicada parcialmente en producción).
-- Forward-only: sólo cambia privilegios (GRANT/REVOKE). No borra ni modifica datos.
--
-- Estado verificado en producción por el líder (sólo lectura):
--   * anon ya no tiene INSERT en riders ni users.
--   * anon todavía tiene SELECT y UPDATE en riders y users.
--   * anon todavía puede leer users.password: un REVOKE SELECT sobre una columna no
--     sirve mientras exista un SELECT de tabla; por eso el paso 2 revoca la tabla y
--     vuelve a conceder sólo un conjunto de columnas.
--
-- Verificación en código (src/ y hid-repartidores/lib/):
--   * Ningún componente del navegador escribe riders ni users con el cliente anon.
--     Las escrituras van por rutas de servidor con clave de servicio:
--     /api/riders/[id]/status, /api/riders/[id], /api/users/[id], /api/rider-app/*
--     (requireRiderOrdersAccess usa createSupabaseAdminClient).
--   * La app de repartidores sólo lee riders (id, user_id, first_name, last_name,
--     avatar1x1_url, phone_e164) y users (id, name, email, role_id, status) en
--     lib/screens/profile_screen.dart.
--   * BLOQUEO: la web admin lee con cliente anon y select('*') por defecto
--     (src/lib/api.ts createApi, L100-115; usado en riders y users). Si se revoca SELECT
--     de tabla sin cambiar esas consultas, el panel deja de cargar usuarios y repartidores.
--     Por eso el paso 2 está comentado.
--
-- Paso 1 (listo): cerrar escrituras de anon que ya no usa nadie.
-- Riesgo bajo; los roles authenticated y service_role no cambian.

BEGIN;

REVOKE UPDATE ON grupohubs.riders, grupohubs.users FROM anon;

COMMIT;

-- Paso 2 (PENDIENTE, no aplicar hasta cumplir los requisitos):
-- Requisitos previos:
--   a) Listar columnas reales con information_schema.columns para grupohubs.users y
--      grupohubs.riders, y confirmar que existen las columnas de abajo.
--   b) Web: cambiar las consultas anon de users y riders a columnas explícitas
--      (src/lib/api.ts createApi y las páginas que usan api.users / api.riders),
--      sin password, password_hash, push_token, device_id ni tokens.
--   c) Confirmar que el panel no lee relaciones (role, business) con anon.
--
-- BEGIN;
-- REVOKE SELECT ON grupohubs.users FROM anon;
-- GRANT SELECT (id, name, email, role_id, status /* + columnas que confirme (b) */)
--   ON grupohubs.users TO anon;
--
-- REVOKE SELECT ON grupohubs.riders FROM anon;
-- GRANT SELECT (<todas las columnas de riders excepto password_hash, push_token,
--   device_id y cualquier token>) ON grupohubs.riders TO anon;
-- COMMIT;

-- Rollback (restaura privilegios previos; sólo si hace falta):
-- BEGIN;
-- GRANT UPDATE ON grupohubs.riders, grupohubs.users TO anon;
-- GRANT SELECT ON grupohubs.users TO anon;   -- restaura también la lectura de password
-- GRANT SELECT ON grupohubs.riders TO anon;  -- sólo si se aplicó el paso 2
-- COMMIT;
