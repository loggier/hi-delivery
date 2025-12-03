'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { subDays, format } from 'date-fns';

export async function GET(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} }, db: { schema: 'grupohubs' } }
  );

  try {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);

    // KPIs
    const { count: activeBusinesses, error: businessesError } = await supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
    if (businessesError) throw businessesError;

    const { count: activeRiders, error: ridersError } = await supabase.from('riders').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    if (ridersError) throw ridersError;

    const { data: recentOrders, error: recentOrdersError } = await supabase.from('orders').select('order_total').gte('created_at', sevenDaysAgo.toISOString());
    if (recentOrdersError) throw recentOrdersError;

    const totalRevenue = recentOrders.reduce((sum, order) => sum + order.order_total, 0);
    const totalOrders = recentOrders.length;

    // Order Status Summary
    const { data: orderStatus, error: orderStatusError } = await supabase.rpc('get_order_status_summary');
    if (orderStatusError) throw orderStatusError;
    
    // Chart Data
    const { data: dailyOrders, error: dailyOrdersError } = await supabase.rpc('get_daily_order_counts', { start_date: sevenDaysAgo.toISOString() });
    if(dailyOrdersError) throw dailyOrdersError;

    const { data: dailyRevenue, error: dailyRevenueError } = await supabase.rpc('get_daily_revenue', { start_date: sevenDaysAgo.toISOString() });
    if(dailyRevenueError) throw dailyRevenueError;

    const ordersData = dailyOrders.map(d => ({ date: format(new Date(d.day), 'MMM d'), pedidos: d.order_count }));
    const revenueData = dailyRevenue.map(d => ({ date: format(new Date(d.day), 'MMM d'), ingresos: d.total_revenue }));
    
    // Latest changes - This part remains complex for a direct DB query, a simplified version is used
    const { data: latestBusinesses, error: latestBusinessesError } = await supabase.from('businesses').select('*').order('created_at', { ascending: false }).limit(2);
    if(latestBusinessesError) throw latestBusinessesError;
    const { data: latestRiders, error: latestRidersError } = await supabase.from('riders').select('*').order('created_at', { ascending: false }).limit(3);
    if(latestRidersError) throw latestRidersError;

    const latestChanges = [...(latestBusinesses || []), ...(latestRiders || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);


    const stats = {
      activeBusinesses,
      activeRiders,
      totalRevenue,
      totalOrders,
      orderStatusSummary: orderStatus[0],
      ordersData,
      revenueData,
      latestChanges,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
