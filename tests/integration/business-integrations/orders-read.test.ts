import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, clientMock, rpcMock } = vi.hoisted(() => ({ fromMock: vi.fn(), clientMock: vi.fn(), rpcMock: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: clientMock }));
import { GET as listOrders } from '@/app/api/v1/orders/route';
import { GET as getOrder } from '@/app/api/v1/orders/[id]/route';

const order = { id: 'ord-1', status: 'accepted', pickup_address: {}, delivery_address: {}, subtotal: '10.00', delivery_fee: '2.00', order_total: '12.00', items_description: null, created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z', business_id: 'biz-a' };
let keyResult: { data: unknown; error: unknown };
let businessResult: { data: unknown; error: unknown };
let rateResult: { data: unknown; error: unknown };
let orderResult: { data: unknown; error: unknown };
let query: Record<string, ReturnType<typeof vi.fn>>;

function request(url = 'http://localhost/api/v1/orders', token: string | null = 'hid_live_opaque_secret') {
  return new Request(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
}
function makeQuery() {
  query = {};
  for (const method of ['select', 'eq', 'is', 'update', 'order', 'limit', 'gte', 'lte', 'or', 'maybeSingle']) query[method] = vi.fn(() => query);
  query.then = vi.fn((resolve: (result: unknown) => unknown) => Promise.resolve(orderResult).then(resolve));
  query.maybeSingle.mockImplementation(async () => orderResult);
  return query;
}

describe('business order reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    keyResult = { data: { id: 'key-a', business_id: 'biz-a', enabled: true, revoked_at: null }, error: null };
    businessResult = { data: { id: 'biz-a', status: 'active' }, error: null };
    rateResult = { data: true, error: null };
    orderResult = { data: [order], error: null };
    fromMock.mockImplementation((table: string) => {
      const q = makeQuery();
      if (table === 'business_api_keys') q.maybeSingle.mockImplementation(async () => keyResult);
      else if (table === 'businesses') q.maybeSingle.mockImplementation(async () => businessResult);
      else if (table === 'orders') q.maybeSingle.mockImplementation(async () => orderResult);
      return q;
    });
    rpcMock.mockImplementation(async () => rateResult);
    clientMock.mockReturnValue({ from: fromMock, rpc: rpcMock });
  });

  it.each([null, 'wrong'])('returns same generic unauthorized response for absent or invalid keys', async (token) => {
    if (token) keyResult = { data: null, error: null };
    const response = await listOrders(request(undefined, token));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('returns a generic unauthorized response for disabled and revoked keys', async () => {
    keyResult = { data: null, error: null };
    const response = await listOrders(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('rejects inactive businesses and rate-limit overflow', async () => {
    businessResult = { data: { id: 'biz-a', status: 'suspended' }, error: null };
    expect((await listOrders(request())).status).toBe(403);
    businessResult = { data: { id: 'biz-a', status: 'active' }, error: null };
    rateResult = { data: false, error: null };
    expect((await listOrders(request())).status).toBe(429);
  });

  it('lists with database-derived business scope, deterministic pagination and no-store DTOs', async () => {
    orderResult = { data: [order, { ...order, id: 'ord-2' }], error: null };
    const response = await listOrders(request('http://localhost/api/v1/orders?status=accepted&limit=1'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.data).toHaveLength(1); expect(body.has_more).toBe(true); expect(body.next_cursor).toBeTruthy();
    const orderQuery = fromMock.mock.results.find((_x, index) => fromMock.mock.calls[index][0] === 'orders')!.value;
    expect(orderQuery.eq).toHaveBeenCalledWith('business_id', 'biz-a');
    expect(orderQuery.eq).toHaveBeenCalledWith('status', 'accepted');
    expect(orderQuery.order.mock.calls).toEqual([['created_at', { ascending: false }], ['id', { ascending: false }]]);
    expect(body.data[0]).not.toHaveProperty('business_id');
  });

  it('uses indistinguishable 404 responses for foreign and missing order IDs', async () => {
    orderResult = { data: null, error: null };
    const response = await getOrder(request('http://localhost/api/v1/orders/foreign'), { params: Promise.resolve({ id: 'foreign' }) });
    expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: 'Order not found' });
    const q = fromMock.mock.results.find((_x, index) => fromMock.mock.calls[index][0] === 'orders')!.value;
    expect(q.eq).toHaveBeenCalledWith('id', 'foreign'); expect(q.eq).toHaveBeenCalledWith('business_id', 'biz-a');
  });
});
