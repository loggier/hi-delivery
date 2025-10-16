-- This script should be run only once to create the master administrator user.
-- It's intended for initial setup.

-- 1. Ensure the 'admin' role exists
INSERT INTO grupohubs.roles (id, name, permissions, created_at)
SELECT 'role-admin', 'Super Administrador', '{"recolectarEfectivo": true, "complemento": true, "atributo": true, "banner": true, "campaña": true, "categoria": true, "cupon": true, "reembolso": true, "gestionDeClientes": true, "repartidor": true, "proveerGanancias": true, "empleado": true, "producto": true, "notificacion": true, "pedido": true, "tienda": true, "reporte": true, "configuraciones": true, "listaDeRetiros": true, "zona": true, "modulo": true, "paquete": true, "puntoDeVenta": true, "unidad": true, "suscripcion": true}', NOW()
WHERE NOT EXISTS (SELECT 1 FROM grupohubs.roles WHERE id = 'role-admin');

-- 2. Ensure the 'owner' role exists
INSERT INTO grupohubs.roles (id, name, permissions, created_at)
SELECT 'role-owner', 'Dueño de Negocio', '{"producto": true, "pedido": true, "reporte": true, "configuraciones": true, "recolectarEfectivo": false, "complemento": false, "atributo": false, "banner": false, "campaña": false, "categoria": false, "cupon": false, "reembolso": false, "gestionDeClientes": false, "repartidor": false, "proveerGanancias": false, "empleado": false, "notificacion": false, "tienda": false, "listaDeRetiros": false, "zona": false, "modulo": false, "paquete": false, "puntoDeVenta": false, "unidad": false, "suscripcion": false}', NOW()
WHERE NOT EXISTS (SELECT 1 FROM grupohubs.roles WHERE id = 'role-owner');


-- 3. Create the master user
-- IMPORTANT: The password 'supersecret' will be automatically hashed on the first login.
-- After the first successful login, the plain text password will be replaced by a secure hash.
INSERT INTO grupohubs.users (id, name, email, password, role_id, status, created_at)
VALUES (
    'user-master-001',
    'Usuario Master',
    'master@grupohubs.com',
    'supersecret', -- This will be auto-hashed by the API on first login.
    'role-admin',
    'ACTIVE',
    NOW()
) ON CONFLICT (email) DO NOTHING;
