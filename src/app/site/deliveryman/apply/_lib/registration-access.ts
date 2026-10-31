import 'server-only';

import { getRegistrationTokenState } from '@/lib/rider-registration-token';

export type RegistrationPageAccess =
  | { kind: 'active'; token: string }
  | { kind: 'submitted' }
  | { kind: 'invalid' };

type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * Valida el token de la URL antes de renderizar cualquier formulario del wizard.
 * - active: se muestra el paso.
 * - submitted: el repartidor ya envió su solicitud.
 * - invalid: token ausente, inválido, vencido o `?id=` legado.
 */
export async function resolveRegistrationPageAccess(
  searchParams: Promise<PageSearchParams>,
): Promise<RegistrationPageAccess> {
  const params = await searchParams;
  const raw = params.token;
  const token = typeof raw === 'string' ? raw.trim() : '';

  const result = await getRegistrationTokenState(token);
  if (result.state === 'active') return { kind: 'active', token };
  if (result.state === 'submitted') return { kind: 'submitted' };
  return { kind: 'invalid' };
}
