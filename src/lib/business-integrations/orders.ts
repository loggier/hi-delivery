import { z } from 'zod';

export const ORDER_STATUSES = [
  'pending_acceptance', 'accepted', 'at_store', 'cooking', 'ready_for_pickup', 'picked_up',
  'on_the_way', 'arrived_at_destination', 'completed', 'delivered', 'cancelled', 'refunded', 'failed',
] as const;

export function extractBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer ([A-Za-z0-9_-]+)$/i);
  return match?.[1] ?? null;
}

export interface OrderCursor { created_at: string; id: string }
export function encodeOrderCursor(cursor: OrderCursor): string {
  return Buffer.from(JSON.stringify({ created_at: cursor.created_at, id: cursor.id }), 'utf8').toString('base64url');
}

export function decodeOrderCursor(value: string): OrderCursor | null {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
    const decoded: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return null;
    const cursor = decoded as Record<string, unknown>;
    if (Object.keys(cursor).length !== 2 || typeof cursor.created_at !== 'string' || !Number.isFinite(Date.parse(cursor.created_at)) || typeof cursor.id !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(cursor.id)) return null;
    return { created_at: cursor.created_at, id: cursor.id };
  } catch { return null; }
}

const dateInput = z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Invalid date');
export const orderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  created_from: dateInput.optional(),
  created_to: dateInput.optional(),
  updated_since: dateInput.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
}).strict().superRefine((filters, context) => {
  if (filters.created_from && filters.created_to && Date.parse(filters.created_from) > Date.parse(filters.created_to)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['created_to'], message: 'created_to must not precede created_from' });
  }
  if (filters.cursor && !decodeOrderCursor(filters.cursor)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['cursor'], message: 'Invalid cursor' });
});

export function calculateCents(value: number | string): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || !/^\d+(?:\.\d{1,2})?$/.test(String(value)) && typeof value === 'string') throw new Error('Invalid amount');
  const cents = Math.round(numeric * 100);
  if (!Number.isSafeInteger(cents)) throw new Error('Invalid amount');
  return cents;
}

function publicAmount(value: unknown): number {
  const cents = calculateCents(value as string | number);
  return cents / 100;
}

export function toPublicOrder(row: Record<string, unknown>) {
  return {
    id: row.id,
    status: row.status,
    pickup_address: row.pickup_address,
    delivery_address: row.delivery_address,
    subtotal: publicAmount(row.subtotal),
    delivery_fee: publicAmount(row.delivery_fee),
    order_total: publicAmount(row.order_total),
    items_description: row.items_description ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const PUBLIC_ORDER_SELECT = 'id,status,pickup_address,delivery_address,subtotal,delivery_fee,order_total,items_description,created_at,updated_at';
export const ORDER_WITH_BUSINESS_SELECT = `${PUBLIC_ORDER_SELECT},business_id`;
