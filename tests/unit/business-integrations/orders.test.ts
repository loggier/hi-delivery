import { describe, expect, it } from 'vitest';
import {
  calculateCents,
  decodeOrderCursor,
  encodeOrderCursor,
  extractBearerToken,
  orderListQuerySchema,
  toPublicOrder,
} from '@/lib/business-integrations/orders';

describe('business integration order helpers', () => {
  it('extracts only a well-formed bearer credential', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull();
    expect(extractBearerToken('Bearer hid_live_secret')).toBe('hid_live_secret');
  });

  it('encodes and validates an opaque cursor containing only created_at and id', () => {
    const cursor = encodeOrderCursor({ created_at: '2026-10-01T00:00:00.000Z', id: 'ord-1' });
    expect(decodeOrderCursor(cursor)).toEqual({ created_at: '2026-10-01T00:00:00.000Z', id: 'ord-1' });
    expect(decodeOrderCursor(`${cursor.slice(0, -1)}!`)).toBeNull();
    expect(decodeOrderCursor(Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(cursor, 'base64url').toString()), business_id: 'x' })).toString('base64url'))).toBeNull();
  });

  it('validates allowed filters and caps list size at 100', () => {
    expect(orderListQuerySchema.safeParse({ status: 'pending_acceptance', limit: '100' }).success).toBe(true);
    expect(orderListQuerySchema.safeParse({ status: 'made_up' }).success).toBe(false);
    expect(orderListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(orderListQuerySchema.safeParse({ created_from: 'not-a-date' }).success).toBe(false);
    expect(orderListQuerySchema.safeParse({ created_from: '2026-10-02', created_to: '2026-10-01' }).success).toBe(false);
  });

  it('uses integer cents and rejects imprecise or invalid money', () => {
    expect(calculateCents('12.34')).toBe(1234);
    expect(calculateCents(0.1 + 0.2)).toBe(30);
    expect(() => calculateCents('1.001')).toThrow();
    expect(() => calculateCents(-1)).toThrow();
    expect(() => calculateCents(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('returns only the documented order fields', () => {
    const dto = toPublicOrder({
      id: 'ord-1', business_id: 'biz-1', customer_id: 'cust-1', rider_id: 'rider-1', status: 'accepted',
      pickup_address: { address: 'Shop' }, delivery_address: { address: 'Home' }, customer_name: 'Alex', customer_phone: '555',
      subtotal: '10.00', delivery_fee: '2.00', order_total: '12.00', items_description: 'Food', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T01:00:00Z',
      rider_latitude: 1, rider_longitude: 2, assignment_attempt_count: 8, key_hash: 'secret', business_name: 'private', customer_email: 'private',
    });
    expect(dto).toEqual({ id: 'ord-1', status: 'accepted', pickup_address: { address: 'Shop' }, delivery_address: { address: 'Home' }, subtotal: 10, delivery_fee: 2, order_total: 12, items_description: 'Food', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T01:00:00Z' });
    expect(JSON.stringify(dto)).not.toMatch(/rider|customer|business|hash|assignment/i);
  });
});
