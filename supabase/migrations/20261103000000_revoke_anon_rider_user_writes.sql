-- Quita a la clave pública (rol anon) escrituras directas sobre riders y users,
-- y la lectura del hash de contraseña. Solo cambia permisos: no borra datos.
-- La web escribe por el servidor (clave de servicio). La app de repartidores usa rutas
-- /api/rider-app/* para disponibilidad, token de notificaciones y contraseña.
-- Rollback: GRANT INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON grupohubs.riders, grupohubs.users TO anon;
--           GRANT SELECT (password) ON grupohubs.users TO anon;

REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON grupohubs.riders, grupohubs.users FROM anon;
REVOKE SELECT (password) ON grupohubs.users FROM anon;
