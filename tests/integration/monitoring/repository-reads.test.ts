import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => supabase }));

import { createSupabaseSnapshotRepositories } from '@/lib/monitoring/snapshot-service';

function query(result: unknown) {
  const builder = {
    select: vi.fn(), maybeSingle: vi.fn(), not: vi.fn(), eq: vi.fn(), or: vi.fn(), in: vi.fn(), gte: vi.fn(), order: vi.fn(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result)),
  };
  builder.select.mockReturnValue(builder); builder.maybeSingle.mockReturnValue(builder); builder.not.mockReturnValue(builder); builder.eq.mockReturnValue(builder); builder.or.mockReturnValue(builder); builder.in.mockReturnValue(builder); builder.gte.mockReturnValue(builder); builder.order.mockReturnValue(builder);
  return builder;
}

describe('monitoring repository reads', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('marks null optional data unavailable instead of converting it to healthy empty data', async () => {
    supabase.from
      .mockReturnValueOnce(query({ data: [], error: null }))
      .mockReturnValueOnce(query({ data: null, error: null }));
    const result = await createSupabaseSnapshotRepositories().fetchRelevantRiders([]);
    expect(result.available).toBe(true);
    expect(result.schemaDegraded).toContain('irregular-reporting');
  });

  it('uses at most a complete read plus one required-column fallback for orders', async () => {
    supabase.from
      .mockReturnValueOnce(query({ data: null, error: { code: '42703', message: 'assignment_attempts_exhausted missing' } }))
      .mockReturnValueOnce(query({ data: [], error: null }));
    const result = await createSupabaseSnapshotRepositories().fetchActiveOrders();
    expect(result.data).toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});
