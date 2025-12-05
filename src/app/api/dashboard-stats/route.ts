

'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} }, db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA! } }
  );

  const { searchParams } = new URL(request.url);
  const business_id = searchParams.get('business_id') || null;

  try {
    const rpcName = business_id ? 'get_business_dashboard_stats' : 'get_daily_dashboard_stats';
    const rpcParams = { p_business_id: business_id };
    
    const { data: statsData, error: statsError } = await supabase.rpc(rpcName, rpcParams);
    
    if (statsError) {
        console.error(`Error from ${rpcName} RPC:`, statsError);
        throw statsError;
    }

    const defaultResponse = {
        dailyRevenue: 0,
        dailyRiderEarnings: 0,
        dailyOrders: 0,
        averageTicketToday: 0,
        activeOrders: 0,
        orderStatusSummary: {
            pending_acceptance: 0, accepted: 0, cooking: 0, out_for_delivery: 0, delivered: 0, cancelled: 0, refunded: 0, failed: 0
        },
        topBusinesses: [],
        topRiders: [],
        topCustomers: [],
        revenueLast7Days: [],
        ordersLast7Days: [],
    };
    
    if (!statsData || statsData.length === 0 || !statsData[0]) {
        return NextResponse.json(defaultResponse);
    }

    const stats = statsData[0];

    // Adapt payload based on which RPC was called
    const responsePayload = {
      dailyRevenue: stats.daily_revenue || 0,
      dailyRiderEarnings: stats.daily_rider_earnings || 0,
      dailyOrders: stats.daily_orders || 0,
      averageTicketToday: stats.average_ticket_today || 0,
      activeOrders: stats.active_orders || 0,
      orderStatusSummary: stats.order_status_summary_json || defaultResponse.orderStatusSummary,
      topBusinesses: stats.top_businesses_json || [],
      topRiders: stats.top_riders_json || [],
      topCustomers: stats.top_customers_json || [],
      // These are specific to the business owner dashboard
      revenueLast7Days: stats.revenue_last_7_days_json || [],
      ordersLast7Days: stats.orders_last_7_days_json || [],
    };
    
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

