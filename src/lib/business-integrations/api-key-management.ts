import 'server-only';

import { requireBusinessIntegrationOwnerSession } from '@/lib/auth/admin-session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface BusinessIntegrationOwner {
  userId: string;
  businessId: string;
}

export async function requireBusinessIntegrationOwner(): Promise<BusinessIntegrationOwner> {
  const owner = await requireBusinessIntegrationOwnerSession();
  return { userId: owner.id, businessId: owner.businessId };
}

export async function listBusinessApiKeyMetadata(businessId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from('business_api_keys')
    .select('id, key_prefix, enabled, created_at, last_used_at')
    .eq('business_id', businessId)
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw new Error('Unable to read business API key metadata');
  return data;
}
