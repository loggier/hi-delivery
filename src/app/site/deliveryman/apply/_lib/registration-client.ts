/**
 * Cliente del wizard de repartidores. El acceso se hace con el token de registro
 * (`?token=` en la URL), nunca con el UUID del repartidor.
 */

export const INVALID_REGISTRATION_LINK_MESSAGE = 'El enlace de registro no es válido o ya venció. Inicia tu registro de nuevo.';

export type RegistrationRiderData = {
  mother_last_name?: string | null;
  birth_date?: string | null;
  zone_id?: string | null;
  address?: string | null;
  ownership?: string | null;
  brand?: string | null;
  year?: number | null;
  model?: string | null;
  color?: string | null;
  plate?: string | null;
  license_valid_until?: string | null;
  insurer?: string | null;
  policy_number?: string | null;
  policy_valid_until?: string | null;
  has_helmet?: boolean | null;
  has_uniform?: boolean | null;
  has_box?: boolean | null;
};

export type RegistrationRiderPayload = {
  riderId: string;
  status: string;
  rider: RegistrationRiderData;
};

/** Obtiene riderId, estado y datos de precarga a partir del token. Lanza error si el enlace no es válido. */
export async function fetchRegistrationRider(token: string): Promise<RegistrationRiderPayload> {
  const response = await fetch(`/api/riders/by-token?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => ({}))) as Partial<RegistrationRiderPayload> & { message?: string };

  if (!response.ok || !result.riderId) {
    throw new Error(result.message || INVALID_REGISTRATION_LINK_MESSAGE);
  }

  return {
    riderId: result.riderId,
    status: result.status ?? '',
    rider: result.rider ?? {},
  };
}

/** Header de autorización para las escrituras del wizard. */
export function registrationAuthHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** URL de un paso del wizard con el token. */
export function buildRegistrationStepUrl(step: string, token: string): string {
  return `/site/deliveryman/apply/${step}?token=${encodeURIComponent(token)}`;
}
