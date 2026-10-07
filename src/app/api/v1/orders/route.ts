import { NextResponse } from 'next/server';
import { authenticateBusinessApi } from '@/lib/business-integrations/api-auth';
import { apiError, decodeOrderCursor, encodeOrderCursor, getOrderDestinationCoordinates, ORDER_ITEMS_SELECT, ORDER_WITH_BUSINESS_SELECT, orderListQuerySchema, toPublicOrder } from '@/lib/business-integrations/orders';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createOrderBodySchema, canonicalOrderRequest, hashOrderRequest } from '@/lib/business-integrations/orders';
import { calculateBusinessShippingQuote } from '@/lib/business-integrations/shipping';
import { sendOrderEventPushes } from '@/lib/push-order-events';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const MAX_RAW_QUERY_LENGTH = 2048;
const MAX_CREATE_BODY_BYTES = 64 * 1024;
function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) { return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } }); }

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.search.length > MAX_RAW_QUERY_LENGTH) return json(apiError('invalid_parameters', 'Invalid query parameters'), 400);
  const searchParams = url.searchParams;
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(params, key)) return json(apiError('invalid_parameters', 'Invalid query parameters'), 400);
    params[key] = value;
  }
  const parsed = orderListQuerySchema.safeParse(params);
  if (!parsed.success) return json(apiError('invalid_parameters', 'Invalid query parameters'), 400);
  const filters = parsed.data;
  const auth = await authenticateBusinessApi(request);
  if (!auth.ok) return json(apiError(auth.code, auth.error), auth.status);
  const cursorContext = { businessId: auth.access.businessId, filters };
  const decodedCursor = filters.cursor ? decodeOrderCursor(filters.cursor, cursorContext) : null;
  if (filters.cursor && !decodedCursor) return json(apiError('invalid_parameters', 'Invalid query parameters'), 400);
  let query = createSupabaseAdminClient().from('orders').select(ORDER_WITH_BUSINESS_SELECT)
    .eq('business_id', auth.access.businessId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(filters.limit + 1);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.created_from) query = query.gte('created_at', filters.created_from);
  if (filters.created_to) query = query.lte('created_at', filters.created_to);
  if (filters.updated_since) query = query.gte('updated_at', filters.updated_since);
  if (filters.cursor) {
    query = query.or(`created_at.lt.${decodedCursor!.created_at},and(created_at.eq.${decodedCursor!.created_at},id.lt.${decodedCursor!.id})`);
  }
  const { data, error } = await query;
  if (error) return json(apiError('service_unavailable', 'Unable to retrieve orders'), 503);
  const rows = data ?? [];
  const hasMore = rows.length > filters.limit;
  const page = rows.slice(0, filters.limit);
  const last = page[page.length - 1];
  try {
    const ids = page.map((row: Record<string, unknown>) => String(row.id));
    if (ids.length) {
      const { data: items, error: itemsError } = await createSupabaseAdminClient().from('order_items').select(ORDER_ITEMS_SELECT).in('order_id', ids);
      if (itemsError) return json(apiError('service_unavailable', 'Unable to retrieve orders'), 503);
      const byOrder = new Map<string, unknown[]>();
      for (const item of items ?? []) byOrder.set(String(item.order_id), [...(byOrder.get(String(item.order_id)) ?? []), item]);
      for (const row of page) (row as Record<string, unknown>).items = byOrder.get(String(row.id)) ?? [];
    }
    return json({ data: page.map((row: Record<string, unknown>) => toPublicOrder(row)), has_more: hasMore, next_cursor: hasMore && last ? encodeOrderCursor({ created_at: last.created_at as string, id: last.id as string }, cursorContext) : null });
  } catch {
    return json(apiError('service_unavailable', 'Unable to retrieve orders'), 503);
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_CREATE_BODY_BYTES) return json(apiError('body_too_large', 'Request body too large'), 413);
  let raw: string;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_CREATE_BODY_BYTES) return json(apiError('body_too_large', 'Request body too large'), 413);
    raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch { return json(apiError('invalid_body', 'Invalid request body'), 400); }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json(apiError('invalid_body', 'Invalid request body'), 400); }
  const parsed = createOrderBodySchema.safeParse(body);
  if (!parsed.success) return json(apiError('invalid_body', 'Invalid order details'), 400);
  const value = parsed.data;
  const auth = await authenticateBusinessApi(request);
  if (!auth.ok) return json(apiError(auth.code, auth.error), auth.status);
  const key = request.headers.get('idempotency-key');
  if (!key || !key.trim() || key.length > 255) return json(apiError('invalid_idempotency_key', 'Invalid Idempotency-Key'), 400);
  const destination = getOrderDestinationCoordinates(value.delivery_address);
  if (!destination) return json(apiError('invalid_body', 'Customer coordinates are required to calculate shipping'), 400);

  let shippingQuote;
  try {
    shippingQuote = await calculateBusinessShippingQuote(auth.access.businessId, destination);
  } catch {
    return json(apiError('service_unavailable', 'Unable to calculate shipping'), 503);
  }
  const totalCents = value.subtotalCents + shippingQuote.delivery_fee_cents;
  if (!Number.isSafeInteger(totalCents) || totalCents > 100_000_000) {
    return json(apiError('invalid_body', 'Order total exceeds limit'), 400);
  }

  const canonical = canonicalOrderRequest(value);
  let result;
  try {
    result = await createSupabaseAdminClient().rpc('create_business_api_order', {
      business_id_in: auth.access.businessId,
      idempotency_key_hash_in: hashOrderRequest(key),
      canonical_request_hash_in: hashOrderRequest(canonical),
      customer_name_in: value.customer.name,
      customer_phone_in: value.customer.phone,
      customer_email_in: value.customer.email ?? null,
      normalized_mx_phone_in: value.customer.phone,
      delivery_address_in: value.delivery_address,
      delivery_fee_in: shippingQuote.delivery_fee,
      notes_in: value.notes ?? null,
      items_in: value.items.map((item) => ({ product_id: null, item_description: item.description, quantity: item.quantity, price: item.unit_price / 100 })),
    });
  } catch { return json(apiError('service_unavailable', 'Unable to create order'), 503); }
  if (result?.error) {
    const { code, message } = result.error as { code?: unknown; message?: unknown };
    if (code === 'P0001' && typeof message === 'string' && message.includes('IDEMPOTENCY_CONFLICT')) return json(apiError('idempotency_conflict', 'Idempotency key conflict'), 409);
    if (code === '22023' && typeof message === 'string' && message.includes('INVALID_NORMALIZED_MX_PHONE')) return json(apiError('invalid_body', 'Invalid order details'), 400);
    return json(apiError('service_unavailable', 'Unable to create order'), 503);
  }
  const payload = result?.data as { order?: Record<string, unknown>; created?: boolean } | null;
  if (!payload?.order || typeof payload.created !== 'boolean') return json(apiError('service_unavailable', 'Unable to create order'), 503);
  const persistedCents = (amount: unknown) => {
    const text = String(amount);
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Invalid persisted amount');
    const cents = Math.round(Number(text) * 100);
    if (!Number.isSafeInteger(cents)) throw new Error('Invalid persisted amount');
    return cents;
  };
  try {
    const storedSubtotal = persistedCents(payload.order.subtotal);
    const storedDeliveryFee = persistedCents(payload.order.delivery_fee);
    const storedOrderTotal = persistedCents(payload.order.order_total);
    if (storedSubtotal !== value.subtotalCents
      || storedOrderTotal !== storedSubtotal + storedDeliveryFee
      || (payload.created && storedDeliveryFee !== shippingQuote.delivery_fee_cents)) {
      return json(apiError('service_unavailable', 'Unable to create order'), 503);
    }
  } catch { return json(apiError('service_unavailable', 'Unable to create order'), 503); }
  if (payload.created) {
    try { await sendOrderEventPushes({ orderId: String(payload.order.id), type: 'dispatch_wave' }); } catch { /* Dispatch push is best-effort after commit. */ }
  }
  try {
    return json({ data: toPublicOrder(payload.order) }, payload.created ? 201 : 200, payload.created ? {} : { 'Idempotency-Replayed': 'true' });
  } catch { return json(apiError('service_unavailable', 'Unable to create order'), 503); }
}
