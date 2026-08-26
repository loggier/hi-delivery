import { createServerClient } from '@supabase/ssr';

export function resolveSupabaseSchema(
  serverSchema = process.env.SUPABASE_SCHEMA,
  publicSchema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA,
): string {
  return serverSchema || publicSchema || 'grupohubs';
}

export function createSupabaseAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get: () => undefined, set: () => {}, remove: () => {} },
      db: { schema: resolveSupabaseSchema() },
    },
  );
}
