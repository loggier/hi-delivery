
create or replace function grupohubs.create_or_update_role_with_permissions(
    role_id_in text,
    name_in text,
    permissions_in jsonb
)
returns table (
    id text,
    name text,
    created_at timestamptz,
    role_permissions jsonb
) as $$
declare
    new_role_id text;
    perm_item jsonb;
begin
    -- Crear o actualizar el rol
    if role_id_in is not null then
        -- Actualizar
        update grupohubs.roles
        set name = name_in
        where roles.id = role_id_in
        returning roles.id into new_role_id;
        
        -- Borrar permisos existentes para este rol
        delete from grupohubs.role_permissions
        where role_id = new_role_id;
    else
        -- Crear
        insert into grupohubs.roles (name)
        values (name_in)
        returning roles.id into new_role_id;
    end if;

    -- Insertar los nuevos permisos
    if permissions_in is not null and jsonb_array_length(permissions_in) > 0 then
        for perm_item in select * from jsonb_array_elements(permissions_in)
        loop
            insert into grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
            values (
                new_role_id,
                perm_item->>'module_id',
                (perm_item->>'can_create')::boolean,
                (perm_item->>'can_read')::boolean,
                (perm_item->>'can_update')::boolean,
                (perm_item->>'can_delete')::boolean
            );
        end loop;
    end if;

    -- Devolver el rol completo con sus nuevos permisos
    return query
    select
        r.id,
        r.name,
        r.created_at,
        (
            select jsonb_agg(rp)
            from grupohubs.role_permissions rp
            where rp.role_id = r.id
        ) as role_permissions
    from
        grupohubs.roles r
    where
        r.id = new_role_id;
end;
$$ language plpgsql;
