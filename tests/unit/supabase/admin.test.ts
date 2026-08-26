import { describe, expect, it } from 'vitest';

import { resolveSupabaseSchema } from '@/lib/supabase/admin';

describe('resolveSupabaseSchema', () => {
  it('prefers the server-only schema', () => {
    expect(resolveSupabaseSchema('private_schema', 'public_schema')).toBe('private_schema');
  });

  it('falls back to the public schema', () => {
    expect(resolveSupabaseSchema(undefined, 'public_schema')).toBe('public_schema');
  });

  it('defaults to the canonical schema', () => {
    expect(resolveSupabaseSchema(undefined, undefined)).toBe('grupohubs');
  });
});
