'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} }, db: { schema: 'grupohubs' } }
  );

  try {
    const { data: dailyStats, error: dailyStatsError } = await supabase.rpc('get_daily_dashboard_stats');

    if (dailyStatsError) {
        console.error('Error from get_daily_dashboard_stats RPC:', dailyStatsError);
        throw dailyStatsError;
    }
    
    // Si la función no devuelve filas (porque no hay pedidos hoy), devolvemos una estructura por defecto.
    if (!dailyStats || dailyStats.length === 0) {
        return NextResponse.json({
            daily_revenue: 0,
            daily_orders: 0,
            average_ticket_today: 0,
            active_orders: 0,
            order_status_summary: {
                unassigned: 0, accepted: 0, cooking: 0, outForDelivery: 0, delivered: 0, cancelled: 0, refunded: 0, failed: 0
            },
            top_businesses: [],
            top_riders: [],
            top_customers: [],
        });
    }

    const stats = dailyStats[0];

    // Los campos JSON pueden ser nulos si no hay datos que agregar, así que los parseamos de forma segura.
    const orderStatusSummary = stats.order_status_summary_json ? JSON.parse(stats.order_status_summary_json) : {};
    const topBusinesses = stats.top_businesses_json ? JSON.parse(stats.top_businesses_json) : [];
    const topRiders = stats.top_riders_json ? JSON.parse(stats.top_riders_json) : [];
    const topCustomers = stats.top_customers_json ? JSON.parse(stats.top_customers_json) : [];

    const responsePayload = {
      daily_revenue: stats.daily_revenue || 0,
      daily_orders: stats.daily_orders || 0,
      average_ticket_today: stats.average_ticket_today || 0,
      active_orders: stats.active_orders || 0,
      order_status_summary: {
        unassigned: orderStatusSummary.pending_acceptance || 0,
        accepted: orderStatusSummary.accepted || 0,
        cooking: orderStatusSummary.cooking || 0,
        outForDelivery: orderStatusSummary.out_for_delivery || 0,
        delivered: orderStatusSummary.delivered || 0,
        cancelled: orderStatusSummary.cancelled || 0,
        refunded: orderStatusSummary.refunded || 0,
        failed: orderStatusSummary.failed || 0
      },
      top_businesses: topBusinesses,
      top_riders: topRiders,
      top_customers: topCustomers,
    };
    
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
