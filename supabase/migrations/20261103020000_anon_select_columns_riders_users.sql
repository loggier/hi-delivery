-- Paso 2 de privilegios anon en riders y users.
-- Quita la lectura de tabla completa a la clave pública y deja solo las columnas que usan
-- la app de repartidores, el panel y el monitoreo. Excluye contraseñas, hashes, tokens
-- de notificación y tokens de registro. Solo cambia permisos: no borra datos.
-- Requiere que 20261103010000 (quita UPDATE anon) ya esté aplicada.
-- Rollback: GRANT SELECT ON grupohubs.riders, grupohubs.users TO anon;

REVOKE SELECT ON grupohubs.users FROM anon;
GRANT SELECT (id, name, email, avatar_url, role_id, status, created_at) ON grupohubs.users TO anon;

REVOKE SELECT ON grupohubs.riders FROM anon;
GRANT SELECT (
    id, user_id, first_name, last_name, mother_last_name, email, phone_e164, status,
    birth_date, rider_type, zone_id, address,
    ine_front_url, ine_back_url, proof_of_address_url, license_front_url, license_back_url,
    vehicle_type, ownership, brand, year, model, color, plate, license_valid_until,
    moto_photos, circulation_card_front_url, circulation_card_back_url,
    insurer, policy_number, policy_valid_until, policy_first_page_url,
    has_helmet, has_uniform, has_box, avatar_1x1_url, avatar1x1_url,
    created_at, updated_at,
    is_active_for_orders, last_latitude, last_longitude, last_speed, last_course,
    last_location_update, last_location_received_at, last_location_event_id, last_location_sequence,
    tracking_session_id, tracking_available_until,
    registration_resend_count, registration_resend_window_started_at, registration_last_resent_at
) ON grupohubs.riders TO anon;
