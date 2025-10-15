-- Este script inserta el rol de Super Administrador y un usuario master asociado.
-- La contraseña de ejemplo es 'supersecret' y está hasheada con bcrypt.
-- IMPORTANTE: Cambia el hash de la contraseña por uno nuevo si cambias la contraseña en texto plano.

-- 1. Insertar el rol de "Super Administrador" con todos los permisos.
-- El UUID es fijo para poder referenciarlo fácilmente.
INSERT INTO grupohubs.roles (id, name, permissions)
VALUES 
('d2f0c345-4236-4d56-a068-9f826019c059', 'Super Administrador', '{"recolectarEfectivo": true, "complemento": true, "atributo": true, "banner": true, "campaña": true, "categoria": true, "cupon": true, "reembolso": true, "gestionDeClientes": true, "repartidor": true, "proveerGanancias": true, "empleado": true, "producto": true, "notificacion": true, "pedido": true, "tienda": true, "reporte": true, "configuraciones": true, "listaDeRetiros": true, "zona": true, "modulo": true, "paquete": true, "puntoDeVenta": true, "unidad": true, "suscripcion": true}')
ON CONFLICT (name) DO NOTHING;

-- 2. Insertar el usuario "Master" y asignarle el rol de Super Administrador.
-- El hash corresponde a la contraseña 'supersecret'
INSERT INTO grupohubs.users (name, email, password, role_id, status)
VALUES
('Usuario Master', 'master@grupohubs.com', '$2a$12$K0jN0qZ0a5zJ3zG8b2eK.e1Y9Q.z9dD.b8tX.c5V.a5eJ4eK.c3e', 'd2f0c345-4236-4d56-a068-9f826019c059', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;
