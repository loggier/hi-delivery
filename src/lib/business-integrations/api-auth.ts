import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractBearerToken } from '@/lib/business-integrations/orders';

export interface BusinessApiAccess { businessId: string; apiKeyId: string }
export type BusinessApiAuthResult =
  | { ok: true; access: BusinessApiAccess }
  | { ok: false; status: 401 | 403 | 429 | 503; error: 'Unauthorized' | 'Forbidden' | 'Rate limit exceeded' | 'Service unavailable' };

export async function authenticateBusinessApi(request: Request): Promise<BusinessApiAuthResult> {
  const token = extractBearerToken(request.headers.get('authorization'));
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' };

  const client = createSupabaseAdminClient();
  const digest = createHash('sha256').update(token, 'utf8').digest('hex');
  const { data: key, error: keyError } = await client.from('business_api_keys')
    .select('id,business_id,enabled,revoked_at').eq('key_digest', digest).eq('enabled', true).is('revoked_at', null).maybeSingle();
  if (keyError) return { ok: false, status: 503, error: 'Service unavailable' };
  if (!key) return { ok: false, status: 401, error: 'Unauthorized' };

  const { data: business, error: businessError } = await client.from('businesses')
    .select('id,status').eq('id', key.business_id).maybeSingle();
  if (businessError) return { ok: false, status: 503, error: 'Service unavailable' };
  if (!business) return { ok: false, status: 401, error: 'Unauthorized' };
  if (business.status !== 'active') return { ok: false, status: 403, error: 'Forbidden' };

  const { data: withinLimit, error: rateError } = await client.rpc('consume_business_api_rate_limit', { api_key_id_in: key.id });
  if (rateError) return { ok: false, status: 503, error: 'Service unavailable' };
  if (withinLimit === false) return { ok: false, status: 429, error: 'Rate limit exceeded' };

  void (async () => {
    try { await client.from('business_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id); } catch { /* last-used tracking is best-effort */ }
  })();
  return { ok: true, access: { businessId: key.business_id, apiKeyId: key.id } };
}
