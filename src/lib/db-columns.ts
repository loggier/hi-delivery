/**
 * Columnas que el panel puede leer con la clave pública (rol anon/authenticated) de `riders` y `users`.
 * Cualquier columna sensible se excluye aquí: el navegador nunca debe recibir contraseñas, hashes,
 * tokens de notificaciones ni tokens de registro. Las escrituras no pasan por estas listas.
 *
 * Para permitir una columna nueva hay que añadirla a la lista completa y justificarlo en CODEX.md.
 */

const RIDER_COLUMNS_ALL = [
  'id', 'user_id', 'first_name', 'last_name', 'mother_last_name', 'email', 'phone_e164', 'password_hash',
  'status', 'birth_date', 'rider_type', 'zone_id', 'address', 'ine_front_url', 'ine_back_url',
  'proof_of_address_url', 'license_front_url', 'license_back_url', 'vehicle_type', 'ownership', 'brand',
  'year', 'model', 'color', 'plate', 'license_valid_until', 'moto_photos', 'circulation_card_front_url',
  'circulation_card_back_url', 'insurer', 'policy_number', 'policy_valid_until', 'policy_first_page_url',
  'has_helmet', 'has_uniform', 'has_box', 'avatar_1x1_url', 'avatar1x1_url', 'created_at', 'updated_at',
  'is_active_for_orders', 'last_latitude', 'last_longitude', 'last_speed', 'last_course',
  'last_location_update', 'push_token', 'push_platform', 'push_token_updated_at',
  'last_location_received_at', 'last_location_event_id', 'last_location_sequence', 'tracking_session_id',
  'tracking_available_until', 'registration_token_hash', 'registration_token_expires_at',
  'registration_resend_count', 'registration_resend_window_started_at', 'registration_last_resent_at',
  'registration_last_resent_by',
] as const;

/** Excluidas de la lectura pública de riders. */
export const RIDER_EXCLUDED_COLUMNS = [
  'password_hash',
  'push_token',
  'push_platform',
  'push_token_updated_at',
  'registration_token_hash',
  'registration_token_expires_at',
  'registration_last_resent_by',
] as const;

const USER_COLUMNS_ALL = [
  'id', 'name', 'email', 'password', 'avatar_url', 'role_id', 'status', 'created_at',
  'web_push_token', 'web_push_token_updated_at',
] as const;

/** Excluidas de la lectura pública de users. */
export const USER_EXCLUDED_COLUMNS = [
  'password',
  'web_push_token',
  'web_push_token_updated_at',
] as const;

const riderExcluded = new Set<string>(RIDER_EXCLUDED_COLUMNS);
const userExcluded = new Set<string>(USER_EXCLUDED_COLUMNS);

export const RIDER_SAFE_COLUMNS: readonly string[] = RIDER_COLUMNS_ALL.filter((column) => !riderExcluded.has(column));
export const USER_SAFE_COLUMNS: readonly string[] = USER_COLUMNS_ALL.filter((column) => !userExcluded.has(column));

/** Select seguro para `riders` (PostgREST). */
export const RIDER_SAFE_SELECT = RIDER_SAFE_COLUMNS.join(',');
/** Select seguro para `users` (PostgREST). */
export const USER_SAFE_SELECT = USER_SAFE_COLUMNS.join(',');
