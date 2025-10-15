-- 1. Crear el Rol de Super Administrador si no existe
-- Se usa ON CONFLICT para evitar errores si el rol ya fue creado.
INSERT INTO grupohubs.roles (id, name, permissions, created_at)
VALUES (
    'role-admin',
    'Super Administrador',
    '{
      "recolectarEfectivo": true, "complemento": true, "atributo": true, "banner": true, "campaña": true, "categoria": true, "cupon": true,
      "reembolso": true, "gestionDeClientes": true, "repartidor": true, "proveerGanancias": true, "empleado": true, "producto": true,
      "notificacion": true, "pedido": true, "tienda": true, "reporte": true, "configuraciones": true, "listaDeRetiros": true,
      "zona": true, "modulo": true, "paquete": true, "puntoDeVenta": true, "unidad": true, "suscripcion": true
    }'::jsonb,
    now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  permissions = EXCLUDED.permissions;

-- 2. Crear el Usuario Master
-- Se usa ON CONFLICT para evitar errores si el usuario ya existe.
-- La contraseña 'supersecret' está hasheada con bcrypt.
-- Para cambiarla, genera un nuevo hash: https://www.bcrypt-generator.com/
INSERT INTO grupohubs.users (id, name, email, password, role_id, status, created_at)
VALUES (
    'user-master',
    'Master Admin',
    'master@grupohubs.com',
    '$2a$12$lIq8q.5J3c.1f.bXv.iVb.aL9wJ2/3G6n.Z.o.X2J/3G.aL9wJ2/3', -- Contraseña: supersecret
    'role-admin',
    'ACTIVE',
    now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  role_id = EXCLUDED.role_id,
  status = EXCLUDED.status;
