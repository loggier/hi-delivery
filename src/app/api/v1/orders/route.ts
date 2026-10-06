import { NextResponse } from 'next/server';
import { authenticateBusinessApi } from '@/lib/business-integrations/api-auth';
import { decodeOrderCursor, encodeOrderCursor, ORDER_WITH_BUSINESS_SELECT, orderListQuerySchema, toPublicOrder } from '@/lib/business-integrations/orders';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createOrderBodySchema, canonicalOrderRequest, hashOrderRequest } from '@/lib/business-integrations/orders';
import { sendOrderEventPushes } from '@/lib/push-order-events';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const MAX_RAW_QUERY_LENGTH = 2048;
const MAX_CREATE_BODY_BYTES = 64 * 1024;
function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) { return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } }); }

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.search.length > MAX_RAW_QUERY_LENGTH) return json({ error: 'Invalid query parameters' }, 400);
  const searchParams = url.searchParams;
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (Object.prototype.hasOwnProperty.call(params, key)) return json({ error: 'Invalid query parameters' }, 400);
    params[key] = value;
  }
  const parsed = orderListQuerySchema.safeParse(params);
  if (!parsed.success) return json({ error: 'Invalid query parameters' }, 400);
  const filters = parsed.data;
  const auth = await authenticateBusinessApi(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const cursorContext = { businessId: auth.access.businessId, filters };
  const decodedCursor = filters.cursor ? decodeOrderCursor(filters.cursor, cursorContext) : null;
  if (filters.cursor && !decodedCursor) return json({ error: 'Invalid query parameters' }, 400);
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
  if (error) return json({ error: 'Unable to retrieve orders' }, 503);
  const rows = data ?? [];
  const hasMore = rows.length > filters.limit;
  const page = rows.slice(0, filters.limit);
  const last = page[page.length - 1];
  try {
    return json({ data: page.map((row: Record<string, unknown>) => toPublicOrder(row)), has_more: hasMore, next_cursor: hasMore && last ? encodeOrderCursor({ created_at: last.created_at as string, id: last.id as string }, cursorContext) : null });
  } catch {
    return json({ error: 'Unable to retrieve orders' }, 503);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateBusinessApi(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const key = request.headers.get('idempotency-key');
  if (!key || !key.trim() || key.length > 255) return json({ error: 'Invalid Idempotency-Key' }, 400);
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_CREATE_BODY_BYTES) return json({ error: 'Request body too large' }, 413);
  let raw: string;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_CREATE_BODY_BYTES) return json({ error: 'Request body too large' }, 413);
    raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch { return json({ error: 'Invalid request body' }, 400); }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid request body' }, 400); }
  const parsed = createOrderBodySchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Invalid order details' }, 400);
  const value = parsed.data;
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
      delivery_fee_in: value.delivery_fee / 100,
      notes_in: value.notes ?? null,
      items_in: value.items.map((item) => ({ item_description: item.description, quantity: item.quantity, price: item.unit_price / 100 })),
    });
  } catch { return json({ error: 'Unable to create order' }, 503); }
  if (result?.error) {
    const { code, message } = result.error as { code?: unknown; message?: unknown };
    if (code === 'P0001' && typeof message === 'string' && message.includes('IDEMPOTENCY_CONFLICT')) return json({ error: 'Idempotency key conflict' }, 409);
    if (code === '22023' && typeof message === 'string' && message.includes('INVALID_NORMALIZED_MX_PHONE')) return json({ error: 'Invalid order details' }, 400);
    return json({ error: 'Unable to create order' }, 503);
  }
  const payload = result?.data as { order?: Record<string, unknown>; created?: boolean } | null;
  if (!payload?.order || typeof payload.created !== 'boolean') return json({ error: 'Unable to create order' }, 503);
  if (payload.created) {
    try { await sendOrderEventPushes({ orderId: String(payload.order.id), type: 'dispatch_wave' }); } catch { /* Dispatch push is best-effort after commit. */ }
  }
  try {
    return json({ data: toPublicOrder(payload.order) }, payload.created ? 201 : 200, payload.created ? {} : { 'Idempotency-Replayed': 'true' });
  } catch { return json({ error: 'Unable to create order' }, 503); }
}
