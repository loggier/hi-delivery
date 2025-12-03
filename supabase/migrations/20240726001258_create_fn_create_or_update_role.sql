
create or replace function grupohubs.create_or_update_role_with_permissions(
    name_in text,
    permissions_in jsonb,
    role_id_in text default null
)
returns table (
    id character varying,
    name character varying,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = grupohubs, public
as $$
declare
    new_role_id text;
    permission_item jsonb;
begin
    -- Upsert the role
    if role_id_in is not null then
        update grupohubs.roles
        set name = name_in
        where roles.id = role_id_in
        returning roles.id into new_role_id;
    else
        insert into grupohubs.roles (id, name)
        values (concat('role-', public.uuid_generate_v4()), name_in)
        returning roles.id into new_role_id;
    end if;

    -- Delete old permissions for this role
    delete from grupohubs.role_permissions
    where role_permissions.role_id = new_role_id;

    -- Insert new permissions from the JSONB array
    if jsonb_array_length(permissions_in) > 0 then
        for permission_item in select * from jsonb_array_elements(permissions_in)
        loop
            insert into grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
            values (
                new_role_id,
                permission_item->>'module_id',
                (permission_item->>'can_create')::boolean,
                (permission_item->>'can_read')::boolean,
                (permission_item->>'can_update')::boolean,
                (permission_item->>'can_delete')::boolean
            );
        end loop;
    end if;
    
    -- Return the created/updated role
    return query
        select r.id, r.name, r.created_at
        from grupohubs.roles r
        where r.id = new_role_id;
end;
$$;
