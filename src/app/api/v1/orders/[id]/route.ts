import { NextResponse } from 'next/server';
import { authenticateBusinessApi } from '@/lib/business-integrations/api-auth';
import { apiError, ORDER_ITEMS_SELECT, PUBLIC_ORDER_SELECT, toPublicOrder } from '@/lib/business-integrations/orders';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: NO_STORE }); }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateBusinessApi(request);
  if (!auth.ok) return json(apiError(auth.code, auth.error), auth.status);
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,255}$/.test(id)) return json(apiError('invalid_parameters', 'Invalid order id'), 400);
  const { data, error } = await createSupabaseAdminClient().from('orders').select(PUBLIC_ORDER_SELECT)
    .eq('id', id).eq('business_id', auth.access.businessId).maybeSingle();
  if (error) return json(apiError('service_unavailable', 'Unable to retrieve order'), 503);
  if (!data) return json(apiError('order_not_found', 'Order not found'), 404);
  const { data: items, error: itemsError } = await createSupabaseAdminClient().from('order_items').select(ORDER_ITEMS_SELECT).in('order_id', [String(data.id)]);
  if (itemsError) return json(apiError('service_unavailable', 'Unable to retrieve order'), 503);
  (data as Record<string, unknown>).items = items ?? [];
  try {
    return json({ data: toPublicOrder(data) });
  } catch {
    return json(apiError('service_unavailable', 'Unable to retrieve order'), 503);
  }
}
