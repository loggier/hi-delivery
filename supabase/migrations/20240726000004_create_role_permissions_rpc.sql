
create or replace function grupohubs.create_or_update_role_with_permissions(
    role_id_in text,
    name_in text,
    permissions_in jsonb
)
returns table (
    id text,
    name text,
    created_at timestamptz,
    role_permissions json
) as $$
declare
    new_role_id text;
    perm_record jsonb;
begin
    -- Upsert the role
    if role_id_in is not null then
        update grupohubs.roles
        set name = name_in
        where grupohubs.roles.id = role_id_in
        returning grupohubs.roles.id into new_role_id;
    else
        insert into grupohubs.roles (name)
        values (name_in)
        returning grupohubs.roles.id into new_role_id;
    end if;

    -- Delete existing permissions for this role
    delete from grupohubs.role_permissions where grupohubs.role_permissions.role_id = new_role_id;

    -- Insert new permissions
    if jsonb_array_length(permissions_in) > 0 then
        for perm_record in select * from jsonb_array_elements(permissions_in)
        loop
            insert into grupohubs.role_permissions (role_id, module_id, can_create, can_read, can_update, can_delete)
            values (
                new_role_id,
                perm_record->>'module_id',
                (perm_record->>'can_create')::boolean,
                (perm_record->>'can_read')::boolean,
                (perm_record->>'can_update')::boolean,
                (perm_record->>'can_delete')::boolean
            );
        end loop;
    end if;

    -- Return the updated role with its new permissions
    return query
    select
        r.id,
        r.name,
        r.created_at,
        (
            select json_agg(rp)
            from grupohubs.role_permissions rp
            where rp.role_id = new_role_id
        ) as role_permissions
    from grupohubs.roles r
    where r.id = new_role_id;
end;
$$ language plpgsql volatile;
