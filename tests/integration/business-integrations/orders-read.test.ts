import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, clientMock, rpcMock } = vi.hoisted(() => ({ fromMock: vi.fn(), clientMock: vi.fn(), rpcMock: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: clientMock }));
import { GET as listOrders } from '@/app/api/v1/orders/route';
import { GET as getOrder } from '@/app/api/v1/orders/[id]/route';
import { encodeOrderCursor } from '@/lib/business-integrations/orders';

const sensitiveOrderFields = {
  business_id: 'biz-a', business_name: 'Private Business', customer_id: 'customer-1', customer_name: 'Private Customer',
  customer_phone: '5551234567', customer_email: 'private@example.test', rider_id: 'rider-1', rider_latitude: 19.43,
  rider_longitude: -99.13, rider_gps: { lat: 19.43, lng: -99.13 }, rider_location: { lat: 19.43, lng: -99.13 },
  assignment_attempt_count: 7, assignment_exhausted_at: '2026-10-01T00:00:00.000Z', dispatch_attempt_count: 4,
  active_notified_riders: ['rider-1'], notified_riders: ['rider-1'], rejected_riders: ['rider-2'],
  notification_expires_at: '2026-10-01T00:05:00.000Z', last_dispatch_at: '2026-10-01T00:00:00.000Z',
  key_hash: 'internal-hash', key_digest: 'internal-digest',
};
const order = { id: 'ord-1', status: 'accepted', pickup_address: {}, delivery_address: {}, subtotal: '10.00', delivery_fee: '2.00', order_total: '12.00', items_description: null, created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z', ...sensitiveOrderFields };
let keyResult: { data: unknown; error: unknown };
let businessResult: { data: unknown; error: unknown };
let rateResult: { data: unknown; error: unknown };
let orderResult: { data: unknown; error: unknown };
let lastUsedFailure: 'error' | 'reject' | null;
let query: Record<string, ReturnType<typeof vi.fn>>;

function request(url = 'http://localhost/api/v1/orders', token: string | null = 'hid_live_opaque_secret') {
  return new Request(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
}
function makeQuery() {
  query = {};
  for (const method of ['select', 'eq', 'is', 'update', 'order', 'limit', 'gte', 'lte', 'or', 'maybeSingle']) query[method] = vi.fn(() => query);
  query.then = vi.fn((resolve: (result: unknown) => unknown) => Promise.resolve(orderResult).then(resolve));
  query.update.mockImplementation(() => {
    query.then = vi.fn((resolve: (result: unknown) => unknown, reject?: (error: unknown) => unknown) => {
      if (lastUsedFailure === 'reject') return Promise.reject(new Error('private last-used update failure')).then(resolve, reject);
      return Promise.resolve(lastUsedFailure === 'error' ? { error: { message: 'private last-used update failure' } } : { error: null }).then(resolve);
    });
    return query;
  });
  query.maybeSingle.mockImplementation(async () => orderResult);
  return query;
}

describe('business order reads', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  beforeEach(() => {
    vi.stubEnv('BUSINESS_API_CURSOR_SECRET', 'integration-test-business-cursor-secret-at-least-32-chars');
    vi.clearAllMocks();
    keyResult = { data: { id: 'key-a', business_id: 'biz-a', enabled: true, revoked_at: null }, error: null };
    businessResult = { data: { id: 'biz-a', status: 'ACTIVE' }, error: null };
    rateResult = { data: true, error: null };
    orderResult = { data: [order], error: null };
    lastUsedFailure = null;
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

  it('returns a safe service-unavailable response when key lookup fails', async () => {
    keyResult = { data: null, error: { message: 'private key-table connection details' } };
    const response = await listOrders(request());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ error: 'Service unavailable' });
    expect(JSON.stringify(body)).not.toContain('private key-table connection details');
  });

  it('returns a safe service-unavailable response when business status lookup fails', async () => {
    businessResult = { data: null, error: { message: 'private business-table connection details' } };
    const response = await listOrders(request());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ error: 'Service unavailable' });
    expect(JSON.stringify(body)).not.toContain('private business-table connection details');
  });

  it('rejects inactive businesses and rate-limit overflow', async () => {
    businessResult = { data: { id: 'biz-a', status: 'PENDING_REVIEW' }, error: null };
    expect((await listOrders(request())).status).toBe(403);
    businessResult = { data: { id: 'biz-a', status: 'ACTIVE' }, error: null };
    rateResult = { data: false, error: null };
    expect((await listOrders(request())).status).toBe(429);
  });

  it('rejects lowercase active status under the uppercase database convention', async () => {
    businessResult = { data: { id: 'biz-a', status: 'active' }, error: null };
    const response = await listOrders(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
  });

  it.each(['error', 'reject'] as const)('does not block a valid read when last_used_at update %s', async (failure) => {
    lastUsedFailure = failure;
    const response = await listOrders(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty('data');
  });

  it('rejects duplicate query keys instead of silently choosing one', async () => {
    const response = await listOrders(request('http://localhost/api/v1/orders?limit=1&limit=2'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid query parameters' });
    expect(fromMock).not.toHaveBeenCalledWith('orders');
  });

  it('rejects oversized raw query strings before iterating params or touching auth/database', async () => {
    const rawQuery = `?${Array.from({ length: 100 }, (_, index) => `unknown${index}=xxxxxxxxxxxxxxxxxxxxxxxx`).join('&')}`;
    expect(rawQuery.length).toBeGreaterThan(2048);
    const entriesSpy = vi.spyOn(URLSearchParams.prototype, 'entries');
    const response = await listOrders(request(`http://localhost/api/v1/orders${rawQuery}`));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid query parameters' });
    expect(entriesSpy).not.toHaveBeenCalled();
    expect(clientMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('returns a safe service error when list DTO money is malformed', async () => {
    orderResult = { data: [{ ...order, subtotal: 'not-money' }], error: null };
    const response = await listOrders(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Unable to retrieve orders' });
  });

  it('returns a safe service error when detail DTO money is malformed', async () => {
    orderResult = { data: { ...order, order_total: 'not-money' }, error: null };
    const response = await getOrder(request('http://localhost/api/v1/orders/ord-1'), { params: Promise.resolve({ id: 'ord-1' }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Unable to retrieve order' });
  });

  it('lists with database-derived business scope, deterministic pagination and no-store DTOs', async () => {
    orderResult = { data: [order, { ...order, id: 'ord-2' }], error: null };
    const cursor = encodeOrderCursor({ created_at: '2026-09-30T23:00:00.000Z', id: 'ord-0' });
    const response = await listOrders(request(`http://localhost/api/v1/orders?status=accepted&created_from=2026-09-01T00%3A00%3A00.000Z&created_to=2026-10-01T00%3A00%3A00.000Z&updated_since=2026-09-15T00%3A00%3A00.000Z&limit=1&cursor=${encodeURIComponent(cursor)}`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.data).toHaveLength(1); expect(body.has_more).toBe(true); expect(body.next_cursor).toBeTruthy();
    const orderQuery = fromMock.mock.results.find((_x, index) => fromMock.mock.calls[index][0] === 'orders')!.value;
    expect(orderQuery.eq).toHaveBeenCalledWith('business_id', 'biz-a');
    expect(orderQuery.eq).toHaveBeenCalledWith('status', 'accepted');
    expect(orderQuery.gte).toHaveBeenCalledWith('created_at', '2026-09-01T00:00:00.000Z');
    expect(orderQuery.lte).toHaveBeenCalledWith('created_at', '2026-10-01T00:00:00.000Z');
    expect(orderQuery.gte).toHaveBeenCalledWith('updated_at', '2026-09-15T00:00:00.000Z');
    expect(orderQuery.or).toHaveBeenCalledWith('created_at.lt.2026-09-30T23:00:00.000Z,and(created_at.eq.2026-09-30T23:00:00.000Z,id.lt.ord-0)');
    expect(orderQuery.limit).toHaveBeenCalledWith(2);
    expect(orderQuery.order.mock.calls).toEqual([['created_at', { ascending: false }], ['id', { ascending: false }]]);
    for (const field of Object.keys(sensitiveOrderFields)) expect(body.data[0]).not.toHaveProperty(field);
  });

  it('uses indistinguishable 404 responses for foreign and missing order IDs', async () => {
    orderResult = { data: null, error: null };
    const response = await getOrder(request('http://localhost/api/v1/orders/foreign'), { params: Promise.resolve({ id: 'foreign' }) });
    expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: 'Order not found' });
    const q = fromMock.mock.results.find((_x, index) => fromMock.mock.calls[index][0] === 'orders')!.value;
    expect(q.eq).toHaveBeenCalledWith('id', 'foreign'); expect(q.eq).toHaveBeenCalledWith('business_id', 'biz-a');
  });

  it('sanitizes sensitive internal fields from detail DTOs', async () => {
    orderResult = { data: { ...order }, error: null };
    const response = await getOrder(request('http://localhost/api/v1/orders/ord-1'), { params: Promise.resolve({ id: 'ord-1' }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    for (const field of Object.keys(sensitiveOrderFields)) expect(body.data).not.toHaveProperty(field);
  });
});
