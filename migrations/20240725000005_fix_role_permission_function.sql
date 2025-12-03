-- Primero, eliminamos todas las posibles versiones conflictivas de la función.
-- Ignoramos los errores si alguna de ellas no existe.

DROP FUNCTION IF EXISTS grupohubs.create_or_update_role_with_permissions(name text, permissions jsonb, role_id_in text);
DROP FUNCTION IF EXISTS grupohubs.create_or_update_role_with_permissions(name_in text, permissions_in jsonb, role_id_in text);
DROP FUNCTION IF EXISTS grupohubs.create_or_update_role_with_permissions(role_id_in text, name_in text, permissions_in jsonb);
DROP FUNCTION IF EXISTS grupohubs.create_or_update_role_with_permissions(name character varying, permissions jsonb, role_id_in character varying);

-- Ahora, creamos la única y correcta versión de la función.

CREATE OR REPLACE FUNCTION grupohubs.create_or_update_role_with_permissions(
    name_in text,
    permissions_in jsonb,
    role_id_in text DEFAULT NULL
)
RETURNS TABLE(id text, name text, created_at text) AS $$
DECLARE
    new_role_id text;
    perm jsonb;
BEGIN
    -- Crear o actualizar el rol
    IF role_id_in IS NOT NULL THEN
        -- Actualizar el nombre del rol existente
        UPDATE grupohubs.roles
        SET name = name_in, updated_at = now()
        WHERE grupohubs.roles.id = role_id_in
        RETURNING grupohubs.roles.id INTO new_role_id;

        -- Eliminar permisos antiguos para este rol
        DELETE FROM grupohubs.role_permissions WHERE role_id = role_id_in;
    ELSE
        -- Insertar un nuevo rol y obtener su ID
        INSERT INTO grupohubs.roles (name)
        VALUES (name_in)
        RETURNING grupohubs.roles.id INTO new_role_id;
    END IF;

    -- Insertar los nuevos permisos
    IF permissions_in IS NOT NULL AND jsonb_array_length(permissions_in) > 0 THEN
        FOR perm IN (SELECT * FROM jsonb_array_elements(permissions_in))
        LOOP
            INSERT INTO grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
            VALUES (
                new_role_id,
                perm->>'module_id',
                (perm->>'can_create')::boolean,
                (perm->>'can_read')::boolean,
                (perm->>'can_update')::boolean,
                (perm->>'can_delete')::boolean
            );
        END LOOP;
    END IF;
    
    -- Devolver los datos del rol creado/actualizado para que coincida con el tipo de retorno
    RETURN QUERY 
    SELECT r.id::text, r.name::text, r.created_at::text 
    FROM grupohubs.roles r 
    WHERE r.id = new_role_id;
END;
$$ LANGUAGE plpgsql;
