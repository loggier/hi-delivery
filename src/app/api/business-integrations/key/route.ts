import { NextResponse } from 'next/server';

import { AdminSessionError } from '@/lib/auth/admin-session';
import { createBusinessApiKey } from '@/lib/business-integrations/api-key';
import { listBusinessApiKeyMetadata, requireBusinessIntegrationOwner } from '@/lib/business-integrations/api-key-management';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function authError(error: unknown) {
  if (error instanceof AdminSessionError) return json({ error: error.message }, error.status);
  return json({ error: 'Unable to manage business API key' }, 500);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function metadata(data: any) {
  if (!data) return null;
  return {
    id: data.id,
    prefix: data.key_prefix,
    enabled: data.enabled,
    created_at: data.created_at,
    last_used_at: data.last_used_at,
  };
}

export async function GET() {
  try {
    const owner = await requireBusinessIntegrationOwner();
    return json({ key: metadata(await listBusinessApiKeyMetadata(owner.businessId)) });
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Same-origin request required' }, 403);
  try {
    const owner = await requireBusinessIntegrationOwner();
    const generated = createBusinessApiKey();
    const { data, error } = await createSupabaseAdminClient().rpc('rotate_business_api_key', {
      business_id_in: owner.businessId,
      new_digest_in: generated.digest,
      new_prefix_in: generated.displayPrefix,
      actor_user_id_in: owner.userId,
    });
    if (error || typeof data !== 'string') return json({ error: 'Unable to create business API key' }, 503);
    return json({ id: data, key: generated.secret, prefix: generated.displayPrefix, enabled: false }, 201);
  } catch (error) {
    return authError(error);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Same-origin request required' }, 403);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body' }, 400); }
  if (!body || typeof body !== 'object' || typeof (body as { enabled?: unknown }).enabled !== 'boolean') {
    return json({ error: 'enabled must be a boolean' }, 400);
  }
  try {
    const owner = await requireBusinessIntegrationOwner();
    const { data, error } = await createSupabaseAdminClient().from('business_api_keys')
      .update({ enabled: (body as { enabled: boolean }).enabled })
      .eq('business_id', owner.businessId).is('revoked_at', null)
      .select('id, key_prefix, enabled, created_at, last_used_at').maybeSingle();
    if (error) return json({ error: 'Unable to update business API key' }, 503);
    if (!data) return json({ error: 'No active business API key' }, 404);
    return json({ key: metadata(data) });
  } catch (error) {
    return authError(error);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Same-origin request required' }, 403);
  try {
    const owner = await requireBusinessIntegrationOwner();
    const { data, error } = await createSupabaseAdminClient().from('business_api_keys')
      .update({ enabled: false, revoked_at: new Date().toISOString() })
      .eq('business_id', owner.businessId).is('revoked_at', null)
      .select('id').maybeSingle();
    if (error) return json({ error: 'Unable to revoke business API key' }, 503);
    if (!data) return json({ error: 'No active business API key' }, 404);
    return json({ revoked: true });
  } catch (error) {
    return authError(error);
  }
}
