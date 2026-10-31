// Helpers de rol compartidos (cliente y servidor). Sin dependencias de servidor.

export const ADMIN_ROLE_ID = 'role-admin';
export const OWNER_ROLE_IDS: readonly string[] = ['role-owner', 'owen-business'];
const OWNER_ROLE_NAME = 'Dueño de Negocio';

export type RoleSubject = {
  role_id?: string | null;
  role?: { name?: string | null } | null;
} | null | undefined;

export type DashboardRole = 'rider' | 'owner' | 'hid-admin' | 'hid-other';

export function isRiderRole(user: RoleSubject): boolean {
  if (!user) return false;
  return (
    user.role_id === 'role-rider' ||
    /repartidor|rider|delivery/i.test(user.role?.name ?? '')
  );
}

export function isOwnerRole(user: RoleSubject): boolean {
  if (!user) return false;
  return (
    OWNER_ROLE_IDS.includes(user.role_id ?? '') ||
    (user.role?.name ?? '') === OWNER_ROLE_NAME
  );
}

export function isAdminRole(user: RoleSubject): boolean {
  return user?.role_id === ADMIN_ROLE_ID;
}

// Fuente única para decidir qué vista del dashboard corresponde.
// Cualquier rol que no sea repartidor, dueño o admin cae en 'hid-other'.
export function getDashboardRole(user: RoleSubject): DashboardRole {
  if (isRiderRole(user)) return 'rider';
  if (isOwnerRole(user)) return 'owner';
  if (isAdminRole(user)) return 'hid-admin';
  return 'hid-other';
}
