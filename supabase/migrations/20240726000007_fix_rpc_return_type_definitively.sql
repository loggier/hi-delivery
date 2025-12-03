-- Elimina la función existente para permitir un cambio en el tipo de retorno.
DROP FUNCTION IF EXISTS grupohubs.create_or_update_role_with_permissions(text,jsonb,text);

-- Vuelve a crear la función con los tipos de retorno correctos (TEXT).
CREATE OR REPLACE FUNCTION grupohubs.create_or_update_role_with_permissions(
  name_in text,
  permissions_in jsonb,
  role_id_in text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  "name" text,
  created_at timestamptz,
  role_permissions jsonb
) AS $$
DECLARE
  new_role_id text;
  p jsonb;
BEGIN
  -- Si role_id_in es NULL, es una operación de inserción.
  -- Si no, es una actualización.
  IF role_id_in IS NULL THEN
    -- Insertar un nuevo rol y obtener su ID
    INSERT INTO grupohubs.roles (name)
    VALUES (name_in)
    RETURNING grupohubs.roles.id INTO new_role_id;
  ELSE
    -- Actualizar el nombre del rol existente
    UPDATE grupohubs.roles
    SET name = name_in
    WHERE grupohubs.roles.id = role_id_in;
    new_role_id := role_id_in;
  END IF;

  -- Borrar permisos existentes para este rol para evitar duplicados
  DELETE FROM grupohubs.role_permissions
  WHERE role_id = new_role_id;

  -- Recorrer el JSON de permisos e insertarlos en la tabla
  FOR p IN SELECT * FROM jsonb_array_elements(permissions_in)
  LOOP
    INSERT INTO grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
    VALUES (
      new_role_id,
      p->>'module_id',
      (p->>'can_create')::boolean,
      (p->>'can_read')::boolean,
      (p->>'can_update')::boolean,
      (p->>'can_delete')::boolean
    );
  END LOOP;

  -- Devolver la fila del rol recién creado/actualizado junto con sus nuevos permisos en formato JSON
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.created_at,
    (SELECT jsonb_agg(rp) FROM grupohubs.role_permissions rp WHERE rp.role_id = new_role_id) as role_permissions
  FROM grupohubs.roles r
  WHERE r.id = new_role_id;
END;
$$ LANGUAGE plpgsql;
