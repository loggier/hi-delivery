
-- Primero, eliminamos la función existente para poder recrearla con una nueva firma de retorno.
-- Usamos los tipos de datos que PostgreSQL infirió en el error anterior.
DROP FUNCTION IF EXISTS grupohubs.create_or_update_role_with_permissions(text, jsonb, text);

-- Ahora, creamos la función con la definición correcta.
CREATE OR REPLACE FUNCTION grupohubs.create_or_update_role_with_permissions(
    p_name character varying,
    p_permissions jsonb,
    p_role_id text DEFAULT NULL
)
RETURNS TABLE(id character varying, name character varying, created_at timestamp with time zone, role_permissions json)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_role_id uuid;
    module_id text;
    actions jsonb;
BEGIN
    -- Crear o actualizar el rol
    IF p_role_id IS NOT NULL THEN
        -- Actualizar el nombre del rol existente
        UPDATE grupohubs.roles
        SET name = p_name
        WHERE grupohubs.roles.id = p_role_id::uuid
        RETURNING grupohubs.roles.id INTO new_role_id;
    ELSE
        -- Insertar un nuevo rol
        INSERT INTO grupohubs.roles (name)
        VALUES (p_name)
        RETURNING grupohubs.roles.id INTO new_role_id;
    END IF;

    -- Eliminar permisos antiguos para este rol
    DELETE FROM grupohubs.role_permissions
    WHERE grupohubs.role_permissions.role_id = new_role_id;

    -- Insertar nuevos permisos desde el JSON
    FOR module_id, actions IN SELECT * FROM jsonb_each(p_permissions)
    LOOP
        INSERT INTO grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
        VALUES (
            new_role_id,
            module_id,
            (actions->>'can_create')::boolean,
            (actions->>'can_read')::boolean,
            (actions->>'can_update')::boolean,
            (actions->>'can_delete')::boolean
        );
    END LOOP;

    -- Devolver el rol creado/actualizado con sus permisos en el formato esperado
    RETURN QUERY
    SELECT
        r.id::character varying,
        r.name,
        r.created_at,
        (SELECT json_agg(rp) FROM grupohubs.role_permissions rp WHERE rp.role_id = new_role_id) AS role_permissions
    FROM
        grupohubs.roles r
    WHERE
        r.id = new_role_id;
END;
$$;
