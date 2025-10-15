-- Nota: Este script asume que la extensión pgcrypto está habilitada en Supabase.
-- Si no lo está, ejecute: CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insertar el Rol de Super Administrador con todos los permisos
-- El UUID para el rol es '4f8a5c4e-4b2e-4d7b-8b0a-7e3f8e7b1d1e'
INSERT INTO grupohubs.roles (id, name, permissions, created_at)
VALUES (
    '4f8a5c4e-4b2e-4d7b-8b0a-7e3f8e7b1d1e',
    'Super Administrador',
    '{
      "recolectarEfectivo": true, "complemento": true, "atributo": true, "banner": true, "campaña": true,
      "categoria": true, "cupon": true, "reembolso": true, "gestionDeClientes": true, "repartidor": true,
      "proveerGanancias": true, "empleado": true, "producto": true, "notificacion": true, "pedido": true,
      "tienda": true, "reporte": true, "configuraciones": true, "listaDeRetiros": true, "zona": true,
      "modulo": true, "paquete": true, "puntoDeVenta": true, "unidad": true, "suscripcion": true
    }',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insertar el usuario "master"
-- La contraseña por defecto es 'supersecret'.
-- El hash fue generado con bcrypt (costo 12).
-- Para cambiar la contraseña, genere un nuevo hash y reemplácelo aquí.
INSERT INTO grupohubs.users (id, name, email, password, role_id, status, created_at)
VALUES (
    '8a7b1c1d-1e1f-4a8b-b1e1-9f7e8d6c5b4a',
    'Usuario Master',
    'master@grupohubs.com',
    '$2a$12$4i.e.1nIMg.PLuWf9J2p3eW1QYmQ8cM6X.L/L.8b9.z.Z.9Y.G7mS',
    '4f8a5c4e-4b2e-4d7b-8b0a-7e3f8e7b1d1e',
    'ACTIVE',
    NOW()
) ON CONFLICT (id) DO NOTHING;
