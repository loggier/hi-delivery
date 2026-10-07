import { z } from 'zod';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ORDER_STATUSES = [
  'pending_acceptance', 'accepted', 'at_store', 'cooking', 'ready_for_pickup', 'picked_up',
  'on_the_way', 'arrived_at_destination', 'completed', 'delivered', 'cancelled', 'refunded', 'failed',
] as const;

export function extractBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer ([A-Za-z0-9_-]+)$/i);
  return match?.[1] ?? null;
}

export interface OrderCursor { created_at: string; id: string }
export interface OrderCursorContext {
  businessId: string;
  filters: { status?: typeof ORDER_STATUSES[number]; created_from?: string; created_to?: string; updated_since?: string };
}
function cursorSigningKey(): string {
  const secret = process.env.BUSINESS_API_CURSOR_SECRET;
  if (!secret || secret.length < 32) throw new Error('Business order cursor signing is unavailable');
  return createHmac('sha256', secret).update('business-orders-cursor:v1').digest('hex');
}

function canonicalCursorContext(context: OrderCursorContext): string {
  const filters = context.filters;
  return JSON.stringify({
    businessId: context.businessId,
    filters: {
      status: filters.status ?? null,
      created_from: filters.created_from ? new Date(filters.created_from).toISOString() : null,
      created_to: filters.created_to ? new Date(filters.created_to).toISOString() : null,
      updated_since: filters.updated_since ? new Date(filters.updated_since).toISOString() : null,
    },
  });
}

function signCursor(payload: string, context: OrderCursorContext): string {
  return createHmac('sha256', cursorSigningKey()).update(canonicalCursorContext(context)).update('.').update(payload).digest('base64url');
}

export function encodeOrderCursor(cursor: OrderCursor, context: OrderCursorContext): string {
  const payload = Buffer.from(JSON.stringify({ created_at: cursor.created_at, id: cursor.id }), 'utf8').toString('base64url');
  return `${payload}.${signCursor(payload, context)}`;
}

export function decodeOrderCursor(value: string, context: OrderCursorContext): OrderCursor | null {
  try {
    const parts = value.split('.');
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
    const [payload, providedSignature] = parts;
    const expectedSignature = signCursor(payload, context);
    const expected = Buffer.from(expectedSignature);
    const provided = Buffer.from(providedSignature);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
    const payloadBuffer = Buffer.from(payload, 'base64url');
    if (payloadBuffer.toString('base64url') !== payload) return null;
    const decoded: unknown = JSON.parse(payloadBuffer.toString('utf8'));
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return null;
    const cursor = decoded as Record<string, unknown>;
    if (Object.keys(cursor).length !== 2 || typeof cursor.created_at !== 'string' || !Number.isFinite(Date.parse(cursor.created_at)) || typeof cursor.id !== 'string' || !/^[A-Za-z0-9_-]{1,255}$/.test(cursor.id)) return null;
    return { created_at: cursor.created_at, id: cursor.id };
  } catch { return null; }
}

const dateInput = z.string().max(40).datetime({ offset: true });
export const orderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  created_from: dateInput.optional(),
  created_to: dateInput.optional(),
  updated_since: dateInput.optional(),
  limit: z.string().max(3).regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)).default('50'),
  cursor: z.string().max(512).optional(),
}).strict().superRefine((filters, context) => {
  if (filters.created_from && filters.created_to && Date.parse(filters.created_from) > Date.parse(filters.created_to)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['created_to'], message: 'created_to must not precede created_from' });
  }
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
    customer_name: row.customer_name ?? null,
    customer_phone: row.customer_phone ?? null,
    items: Array.isArray(row.items) ? row.items.map((item: Record<string, unknown>) => ({ description: item.item_description, quantity: item.quantity, unit_price: publicAmount(item.price) })) : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const PUBLIC_ORDER_SELECT = 'id,status,pickup_address,delivery_address,subtotal,delivery_fee,order_total,items_description,customer_name,customer_phone,created_at,updated_at';
export const ORDER_WITH_BUSINESS_SELECT = `${PUBLIC_ORDER_SELECT},business_id`;
export const ORDER_ITEMS_SELECT = 'order_id,item_description,quantity,price';

export function apiError(code: string, message: string, details?: unknown) {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

const moneyInput = z.union([z.number(), z.string().max(16)]).refine((value) => {
  const text = String(value);
  return /^\d+(?:\.\d{1,2})?$/.test(text) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1_000_000;
}, 'Invalid amount').transform((value) => {
  return Math.round(Number(value) * 100);
});

export const createOrderBodySchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    phone: z.string().trim().min(1).max(40).transform((phone, context) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith('52'))) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid Mexican phone' });
        return z.NEVER;
      }
      return `+52${digits.slice(-10)}`;
    }),
    email: z.string().trim().email().max(254).optional(),
  }).strict(),
  delivery_address: z.object({
    street: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(120),
    state: z.string().trim().min(1).max(120),
    postal_code: z.string().trim().min(1).max(20),
    neighborhood: z.string().trim().max(120).optional(),
    references: z.string().trim().max(500).optional(),
    text: z.string().trim().max(500).optional(),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    coordinates: z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) }).strict().optional(),
  }).strict().superRefine((address, context) => {
    if ((address.latitude === undefined) !== (address.longitude === undefined)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['longitude'], message: 'Latitude and longitude must be provided together' });
    }
    if (address.latitude === undefined && address.coordinates === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['coordinates'], message: 'Customer coordinates are required to calculate shipping' });
    }
    if (address.coordinates && address.latitude !== undefined
      && (address.coordinates.lat !== address.latitude || address.coordinates.lng !== address.longitude)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['coordinates'], message: 'Customer coordinates must match' });
    }
  }),
  delivery_fee: moneyInput.optional(),
  items: z.array(z.object({ description: z.string().trim().min(1).max(500), quantity: z.number().int().min(1).max(1000), unit_price: moneyInput }).strict()).min(1).max(50),
  notes: z.string().max(2000).optional(),
}).strict().transform((body, context) => {
  const subtotalCents = body.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 100_000_000) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Order total exceeds limit' });
    return z.NEVER;
  }
  return { ...body, subtotalCents, totalCents };
});

function sortCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, entry]) => [key, sortCanonical(entry)]));
  }
  return value;
}

export function canonicalOrderRequest(value: z.infer<typeof createOrderBodySchema>): string {
  return JSON.stringify({
    customer: { name: value.customer.name, phone: value.customer.phone, email: value.customer.email ?? null },
    delivery_address: sortCanonical(value.delivery_address),
    items: value.items.map(({ description, quantity, unit_price }) => ({ description, quantity, unit_price })),
    notes: value.notes ?? null,
  });
}

export function getOrderDestinationCoordinates(value: z.infer<typeof createOrderBodySchema>['delivery_address']) {
  const latitude = value.latitude ?? value.coordinates?.lat;
  const longitude = value.longitude ?? value.coordinates?.lng;
  if (latitude === undefined || longitude === undefined) return null;
  return { latitude, longitude };
}

export function hashOrderRequest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
