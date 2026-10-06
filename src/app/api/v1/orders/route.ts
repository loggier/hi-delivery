import { NextResponse } from 'next/server';
import { authenticateBusinessApi } from '@/lib/business-integrations/api-auth';
import { decodeOrderCursor, encodeOrderCursor, ORDER_WITH_BUSINESS_SELECT, orderListQuerySchema, toPublicOrder } from '@/lib/business-integrations/orders';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const MAX_RAW_QUERY_LENGTH = 2048;
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: NO_STORE }); }

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
  let query = createSupabaseAdminClient().from('orders').select(ORDER_WITH_BUSINESS_SELECT)
    .eq('business_id', auth.access.businessId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(filters.limit + 1);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.created_from) query = query.gte('created_at', filters.created_from);
  if (filters.created_to) query = query.lte('created_at', filters.created_to);
  if (filters.updated_since) query = query.gte('updated_at', filters.updated_since);
  if (filters.cursor) {
    const cursor = decodeOrderCursor(filters.cursor)!;
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }
  const { data, error } = await query;
  if (error) return json({ error: 'Unable to retrieve orders' }, 503);
  const rows = data ?? [];
  const hasMore = rows.length > filters.limit;
  const page = rows.slice(0, filters.limit);
  const last = page[page.length - 1];
  try {
    return json({ data: page.map((row: Record<string, unknown>) => toPublicOrder(row)), has_more: hasMore, next_cursor: hasMore && last ? encodeOrderCursor({ created_at: last.created_at as string, id: last.id as string }) : null });
  } catch {
    return json({ error: 'Unable to retrieve orders' }, 503);
  }
}
