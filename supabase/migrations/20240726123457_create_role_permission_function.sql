
-- Habilita el lenguaje PL/pgSQL si aún no está habilitado
CREATE EXTENSION IF NOT EXISTS plpgsql;

-- Definición de la función para crear/actualizar un rol y sus permisos
CREATE OR REPLACE FUNCTION grupohubs.create_or_update_role_with_permissions(
    name TEXT,
    permissions JSONB,
    role_id_in TEXT DEFAULT NULL
)
RETURNS grupohubs.roles
LANGUAGE plpgsql
AS $$
DECLARE
    new_role_id TEXT;
    updated_role RECORD;
    permission_item JSONB;
BEGIN
    -- Si se proporciona un role_id, es una actualización. Si no, es una creación.
    IF role_id_in IS NOT NULL THEN
        -- Actualizar el nombre del rol existente
        UPDATE grupohubs.roles
        SET name = create_or_update_role_with_permissions.name
        WHERE id = role_id_in
        RETURNING id INTO new_role_id;
    ELSE
        -- Insertar un nuevo rol
        INSERT INTO grupohubs.roles (id, name)
        VALUES (concat('role_', public.uuid_generate_v4()), create_or_update_role_with_permissions.name)
        RETURNING id INTO new_role_id;
    END IF;

    -- Eliminar todos los permisos existentes para este rol para evitar duplicados
    DELETE FROM grupohubs.role_permissions WHERE role_id = new_role_id;

    -- Insertar los nuevos permisos desde el array JSONB
    FOR permission_item IN SELECT * FROM jsonb_array_elements(permissions)
    LOOP
        INSERT INTO grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
        VALUES (
            new_role_id,
            permission_item ->> 'module_id',
            (permission_item ->> 'can_create')::BOOLEAN,
            (permission_item ->> 'can_read')::BOOLEAN,
            (permission_item ->> 'can_update')::BOOLEAN,
            (permission_item ->> 'can_delete')::BOOLEAN
        );
    END LOOP;

    -- Devolver el rol completo con sus nuevos permisos
    SELECT * INTO updated_role FROM grupohubs.roles WHERE id = new_role_id;
    RETURN updated_role;
END;
$$;
