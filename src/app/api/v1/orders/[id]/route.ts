import { NextResponse } from 'next/server';
import { authenticateBusinessApi } from '@/lib/business-integrations/api-auth';
import { PUBLIC_ORDER_SELECT, toPublicOrder } from '@/lib/business-integrations/orders';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: NO_STORE }); }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateBusinessApi(request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const { id } = await context.params;
  const { data, error } = await createSupabaseAdminClient().from('orders').select(PUBLIC_ORDER_SELECT)
    .eq('id', id).eq('business_id', auth.access.businessId).maybeSingle();
  if (error) return json({ error: 'Unable to retrieve order' }, 503);
  if (!data) return json({ error: 'Order not found' }, 404);
  return json({ data: toPublicOrder(data) });
}
