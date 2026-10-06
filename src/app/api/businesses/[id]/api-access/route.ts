import { NextResponse } from 'next/server';

import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { isSameOriginRequest } from '@/lib/security/same-origin';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function authError(error: unknown) {
  if (error instanceof AdminSessionError) {
    return json({ error: error.status === 401 ? 'Authentication required' : 'Forbidden' }, error.status);
  }
  return json({ error: 'Unable to update business API access' }, 503);
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
    Object.keys(body).length !== 1 || typeof (body as { enabled?: unknown }).enabled !== 'boolean'
  ) {
    return json({ error: 'enabled must be a boolean' }, 400);
  }

  try {
    const user = await requireAdminOperationSession();
    if (user.roleId !== 'role-admin') return json({ error: 'Forbidden' }, 403);

    const { id } = await context.params;
    if (!id || id.length > 128) return json({ error: 'Invalid business ID' }, 400);

    const { data, error } = await createSupabaseAdminClient()
      .from('businesses')
      .update({ api_enabled: (body as { enabled: boolean }).enabled })
      .eq('id', id)
      .select('id, api_enabled')
      .maybeSingle();

    if (error) return json({ error: 'Unable to update business API access' }, 503);
    if (!data) return json({ error: 'Business not found' }, 404);
    return json({ business: data });
  } catch (error) {
    return authError(error);
  }
}
