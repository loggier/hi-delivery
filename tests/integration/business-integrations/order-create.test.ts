import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock, authMock, pushMock } = vi.hoisted(() => ({ rpcMock: vi.fn(), authMock: vi.fn(), pushMock: vi.fn() }));
vi.mock('@/lib/business-integrations/api-auth', () => ({ authenticateBusinessApi: authMock }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: rpcMock }) }));
vi.mock('@/lib/push-order-events', () => ({ sendOrderEventPushes: pushMock }));
import { POST } from '@/app/api/v1/orders/route';
import { createHash } from 'node:crypto';

const order = { id: 'ord-1', status: 'pending_acceptance', pickup_address: {}, delivery_address: { street: 'Calle Uno' }, subtotal: '20.00', delivery_fee: '5.00', order_total: '25.00', items_description: '2 x Tacos', created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z', customer_phone: '+525551234567' };
const validBody = { customer: { name: 'Ada Lovelace', phone: '55 5123 4567', email: 'ada@example.test' }, delivery_address: { street: 'Calle Uno', city: 'CDMX', state: 'CDMX', postal_code: '06000', latitude: 19.43, longitude: -99.13 }, delivery_fee: 5, items: [{ description: 'Tacos', quantity: 2, unit_price: 10 }], notes: 'Sin cebolla' };
const req = (body: unknown = validBody, key: string | null = 'request-001') => new Request('http://localhost/api/v1/orders', { method: 'POST', headers: { authorization: 'Bearer secret', ...(key === null ? {} : { 'Idempotency-Key': key }), 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('POST /api/v1/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, access: { businessId: 'biz-1', apiKeyId: 'key-1' } });
    rpcMock.mockResolvedValue({ data: { order, created: true }, error: null });
    pushMock.mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('creates scoped orders through the idempotency RPC and sends a best-effort dispatch push', async () => {
    const response = await POST(req());
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('create_business_api_order', {
      business_id_in: 'biz-1', customer_name_in: 'Ada Lovelace', customer_phone_in: '+525551234567',
      normalized_mx_phone_in: '+525551234567', customer_email_in: 'ada@example.test', delivery_fee_in: 5,
      idempotency_key_hash_in: createHash('sha256').update('request-001').digest('hex'),
      canonical_request_hash_in: createHash('sha256').update(JSON.stringify({
        customer: { name: 'Ada Lovelace', phone: '+525551234567', email: 'ada@example.test' },
        delivery_address: { city: 'CDMX', latitude: 19.43, longitude: -99.13, postal_code: '06000', state: 'CDMX', street: 'Calle Uno' },
        delivery_fee: 500,
        items: [{ description: 'Tacos', quantity: 2, unit_price: 1000 }],
        notes: 'Sin cebolla',
      })).digest('hex'),
      delivery_address_in: validBody.delivery_address, notes_in: 'Sin cebolla',
      items_in: [{ product_id: null, item_description: 'Tacos', quantity: 2, price: 10 }],
    });
    const args = rpcMock.mock.calls[0][1];
    expect(args.idempotency_key_hash_in).not.toBe('request-001');
    expect(args.idempotency_key_hash_in).toMatch(/^[a-f0-9]{64}$/);
    expect(args.canonical_request_hash_in).toMatch(/^[a-f0-9]{64}$/);
    expect(pushMock).toHaveBeenCalledWith({ orderId: 'ord-1', type: 'dispatch_wave' });
    const data = (await response.json()).data;
    expect(data).not.toHaveProperty('customer_phone');
  });

  it('returns 200 on replay without sending another push', async () => {
    rpcMock.mockResolvedValue({ data: { order, created: false }, error: null });
    const response = await POST(req());
    expect(response.status).toBe(200);
    expect(response.headers.get('idempotency-replayed')).toBe('true');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('maps idempotency conflicts safely', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'IDEMPOTENCY_CONFLICT private' } });
    const response = await POST(req());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Idempotency key conflict' });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...validBody, business_id: 'attacker' }], [{ ...validBody, status: 'accepted' }],
    [{ ...validBody, order_total: 0 }], [{ ...validBody, subtotal: 0 }],
    [{ ...validBody, items: [] }], [{ ...validBody, items: Array.from({ length: 51 }, () => validBody.items[0]) }],
    [{ ...validBody, delivery_fee: -1 }], [{ ...validBody, delivery_fee: 1.001 }],
    [{ ...validBody, items: [{ description: 'x', quantity: 1, unit_price: 1.001 }] }],
    [{ ...validBody, customer: { ...validBody.customer, phone: '123' } }],
    [{ ...validBody, delivery_address: {} }],
    [{ ...validBody, delivery_address: { city: 'CDMX', state: 'CDMX', postal_code: '06000' } }],
    [{ ...validBody, delivery_address: { ...validBody.delivery_address, latitude: 91 } }],
    [{ ...validBody, delivery_address: { ...validBody.delivery_address, longitude: -181 } }],
  ])('rejects invalid or caller-controlled payloads before RPC', async (body) => {
    expect((await POST(req(body))).status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('requires authentication and an idempotency key', async () => {
    authMock.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    expect((await POST(req())).status).toBe(401);
    authMock.mockResolvedValue({ ok: true, access: { businessId: 'biz-1', apiKeyId: 'key-1' } });
    expect((await POST(req(validBody, null))).status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('bounds raw request size before parsing and hides unexpected database errors', async () => {
    const oversized = new Request('http://localhost/api/v1/orders', { method: 'POST', headers: { authorization: 'Bearer secret', 'Idempotency-Key': 'x', 'content-type': 'application/json' }, body: ' '.repeat(70_000) });
    expect((await POST(oversized)).status).toBe(413);
    rpcMock.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'private database diagnostic' } });
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private database diagnostic');
  });

  it('does not fail successful order creation when push rejects', async () => {
    pushMock.mockRejectedValue(new Error('push failure'));
    expect((await POST(req())).status).toBe(201);
  });

  it('uses exact cents for decimal values and rejects persisted totals that differ', async () => {
    const decimalBody = { ...validBody, delivery_fee: 0.1, items: [
      { description: 'A', quantity: 1, unit_price: 0.1 },
      { description: 'B', quantity: 1, unit_price: 0.2 },
    ] };
    rpcMock.mockResolvedValue({ data: { created: true, order: { ...order, subtotal: '0.30', delivery_fee: '0.10', order_total: '0.40' } }, error: null });
    expect((await POST(req(decimalBody))).status).toBe(201);
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ delivery_fee_in: 0.1, items_in: [
      { product_id: null, item_description: 'A', quantity: 1, price: 0.1 },
      { product_id: null, item_description: 'B', quantity: 1, price: 0.2 },
    ] });
    pushMock.mockClear();
    rpcMock.mockResolvedValue({ data: { created: true, order: { ...order, subtotal: '0.31', delivery_fee: '0.10', order_total: '0.41' } }, error: null });
    const mismatch = await POST(req(decimalBody));
    expect(mismatch.status).toBe(503);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('rejects malformed addresses before authentication or RPC', async () => {
    authMock.mockClear();
    const response = await POST(req({ ...validBody, delivery_address: { street: 'Calle Uno' } }));
    expect(response.status).toBe(400);
    expect(authMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
