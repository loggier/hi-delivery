
'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { startOfToday, endOfToday } from 'date-fns';

type OrderStatus = 'pending_acceptance' | 'accepted' | 'cooking' | 'out_for_delivery' | 'delivered' | 'cancelled';

export async function GET(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} }, db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA! } }
  );

  const { searchParams } = new URL(request.url);
  const business_id = searchParams.get('business_id') || null;

  try {
    const todayStart = startOfToday().toISOString();
    const todayEnd = endOfToday().toISOString();

    let query = supabase.from('orders').select('order_total, delivery_fee, status, business_id, rider_id, customer_id, business:businesses(name), rider:riders(first_name, last_name), customer:customers(first_name, last_name)').gte('created_at', todayStart).lte('created_at', todayEnd);

    if (business_id) {
      query = query.eq('business_id', business_id);
    }
    
    const { data: orders, error } = await query;
    
    if (error) {
        console.error('Error fetching orders for dashboard stats:', error);
        throw error;
    }

    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    
    const dailyRevenue = deliveredOrders.reduce((sum, order) => sum + order.order_total, 0);
    const dailyRiderEarnings = deliveredOrders.reduce((sum, order) => sum + order.delivery_fee, 0);
    const dailyOrders = orders.length;
    const averageTicketToday = deliveredOrders.length > 0 ? dailyRevenue / deliveredOrders.length : 0;
    
    const activeOrders = orders.filter(o => ['accepted', 'cooking', 'out_for_delivery'].includes(o.status)).length;

    const orderStatusSummary: { [key in OrderStatus]: number } = {
        pending_acceptance: 0,
        accepted: 0,
        cooking: 0,
        out_for_delivery: 0,
        delivered: 0,
        cancelled: 0,
    };
    orders.forEach(order => {
        if(order.status in orderStatusSummary) {
            orderStatusSummary[order.status as OrderStatus]++;
        }
    });

    const getTopFive = (key: 'business' | 'rider' | 'customer') => {
        const counts = new Map<string, { id: string; name: string; count: number }>();
        orders.forEach(order => {
            const entity = order[key];
            if (entity && 'id' in entity && entity.id) {
                const name = 'name' in entity ? entity.name : `${entity.first_name || ''} ${entity.last_name || ''}`.trim();
                if (counts.has(entity.id)) {
                    counts.get(entity.id)!.count++;
                } else {
                    counts.set(entity.id, { id: entity.id, name: name, count: 1 });
                }
            }
        });
        return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5)
            .map(item => ({
                [`${key}_id`]: item.id,
                [`${key}_name`]: item.name,
                order_count: item.count,
            }));
    };

    const topBusinesses = business_id ? [] : getTopFive('business');
    const topRiders = getTopFive('rider');
    const topCustomers = getTopFive('customer');

    const responsePayload = {
      dailyRevenue,
      dailyRiderEarnings,
      dailyOrders,
      averageTicketToday,
      activeOrders,
      orderStatusSummary,
      topBusinesses,
      topRiders,
      topCustomers,
    };
    
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
