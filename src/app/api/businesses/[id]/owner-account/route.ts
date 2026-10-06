import { NextResponse } from 'next/server';

import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { hashPassword } from '@/lib/auth-utils';
import { isSameOriginRequest } from '@/lib/security/same-origin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const PASSWORD_PATTERN = /^(?=.*[A-Z\d@$!%*?&]).{8,}$/;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

async function requireMasterAdmin() {
  const admin = await requireAdminOperationSession();
  if (admin.roleId !== 'role-admin') throw new AdminSessionError('Admin access required', 403);
}

async function getBusinessOwner(businessId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('user_id, phone_whatsapp')
    .eq('id', businessId)
    .maybeSingle();

  if (businessError) return { error: json({ error: 'Unable to load business owner' }, 503) };
  if (!business?.user_id) return { error: json({ error: 'Business owner not found' }, 404) };

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, status')
    .eq('id', business.user_id)
    .maybeSingle();

  if (userError) return { error: json({ error: 'Unable to load business owner' }, 503) };
  if (!user) return { error: json({ error: 'Business owner not found' }, 404) };

  return { supabase, business, user };
}

function authError(error: unknown) {
  if (error instanceof AdminSessionError) {
    return json({ error: error.status === 401 ? 'Authentication required' : 'Forbidden' }, error.status);
  }
  return json({ error: 'Unable to manage business owner account' }, 503);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireMasterAdmin();
    const { id } = await context.params;
    if (!id || id.length > 128) return json({ error: 'Invalid business ID' }, 400);

    const result = await getBusinessOwner(id);
    if (result.error) return result.error;

    return json({
      owner: {
        name: result.user.name,
        email: result.user.email,
        phone: result.business.phone_whatsapp,
        status: result.user.status,
      },
    });
  } catch (error) {
    return authError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return json({ error: 'Same-origin request required' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (
    !body || typeof body !== 'object' || Array.isArray(body) ||
    Object.keys(body).sort().join(',') !== 'password,passwordConfirmation'
  ) {
    return json({ error: 'Password and confirmation are required' }, 400);
  }

  const { password, passwordConfirmation } = body as { password: unknown; passwordConfirmation: unknown };
  if (typeof password !== 'string' || typeof passwordConfirmation !== 'string') {
    return json({ error: 'Invalid password' }, 400);
  }
  if (password !== passwordConfirmation) return json({ error: 'Passwords do not match' }, 400);
  if (!PASSWORD_PATTERN.test(password)) {
    return json({ error: 'La contraseña debe tener al menos 8 caracteres y una mayúscula, un número o un símbolo.' }, 400);
  }

  try {
    await requireMasterAdmin();
    const { id } = await context.params;
    if (!id || id.length > 128) return json({ error: 'Invalid business ID' }, 400);

    const result = await getBusinessOwner(id);
    if (result.error) return result.error;

    const passwordHash = await hashPassword(password);
    const { error } = await result.supabase
      .from('users')
      .update({ password: passwordHash })
      .eq('id', result.user.id);

    if (error) return json({ error: 'Unable to update business owner password' }, 503);
    return json({ message: 'La contraseña del usuario asociado se actualizó correctamente.' });
  } catch (error) {
    return authError(error);
  }
}
