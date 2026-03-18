

'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const defaultResponse = {
  dailyRevenue: 0,
  dailyRiderEarnings: 0,
  dailyOrders: 0,
  monthlyOrders: 0,
  averageTicketToday: 0,
  activeOrders: 0,
  totalRiders: 0,
  activeRiders: 0,
  totalBusinesses: 0,
  activeBusinesses: 0,
  orderStatusSummary: {
    pending_acceptance: 0,
    accepted: 0,
    cooking: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
    failed: 0,
  },
  topBusinesses: [],
  topRiders: [],
  topCustomers: [],
  revenueLast7Days: [],
  ordersLast7Days: [],
};

const ACTIVE_ORDER_STATUSES = new Set(['pending_acceptance', 'accepted', 'cooking', 'out_for_delivery']);

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date: Date) => {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
};

const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

const incrementMap = <T extends string>(
  map: Map<T, { count: number; name: string }>,
  key: T,
  name: string
) => {
  const current = map.get(key);
  if (current) {
    current.count += 1;
    return;
  }

  map.set(key, { count: 1, name });
};

async function buildDashboardStats(
  supabase: any,
  businessId: string | null
) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const tomorrowStart = endOfDay(today);
  const sevenDaysStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
  const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));

  let todayOrdersQuery = supabase
    .from('orders')
    .select(`
      id,
      order_total,
      status,
      created_at,
      business_id,
      customer_id,
      rider_id,
      business:businesses(id, name),
      customer:customers(id, first_name, last_name),
      rider:riders(id, first_name, last_name)
    `)
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString());

  let last7DaysOrdersQuery = supabase
    .from('orders')
    .select('id, order_total, status, created_at')
    .gte('created_at', sevenDaysStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString());

  if (businessId) {
    todayOrdersQuery = todayOrdersQuery.eq('business_id', businessId);
    last7DaysOrdersQuery = last7DaysOrdersQuery.eq('business_id', businessId);
  }

  const monthOrdersQuery = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString());

  const totalRidersQuery = supabase
    .from('riders')
    .select('id', { count: 'exact', head: true });

  const activeRidersQuery = supabase
    .from('riders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved');

  const totalBusinessesQuery = supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true });

  const activeBusinessesQuery = supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ACTIVE');

  const [
    { data: todayOrders, error: todayOrdersError },
    { data: last7DaysOrders, error: last7DaysOrdersError },
    { count: monthlyOrdersCount, error: monthlyOrdersError },
    { count: totalRidersCount, error: totalRidersError },
    { count: activeRidersCount, error: activeRidersError },
    { count: totalBusinessesCount, error: totalBusinessesError },
    { count: activeBusinessesCount, error: activeBusinessesError },
  ] = await Promise.all([
    todayOrdersQuery,
    last7DaysOrdersQuery,
    monthOrdersQuery,
    totalRidersQuery,
    activeRidersQuery,
    totalBusinessesQuery,
    activeBusinessesQuery,
  ]);

  if (todayOrdersError) throw todayOrdersError;
  if (last7DaysOrdersError) throw last7DaysOrdersError;
  if (monthlyOrdersError) throw monthlyOrdersError;
  if (totalRidersError) throw totalRidersError;
  if (activeRidersError) throw activeRidersError;
  if (totalBusinessesError) throw totalBusinessesError;
  if (activeBusinessesError) throw activeBusinessesError;

  const ordersToday = todayOrders || [];
  const ordersLast7Days = last7DaysOrders || [];
  const deliveredToday = ordersToday.filter((order: any) => order.status === 'delivered');

  const topBusinessesMap = new Map<string, { count: number; name: string }>();
  const topRidersMap = new Map<string, { count: number; name: string }>();
  const topCustomersMap = new Map<string, { count: number; name: string }>();
  const orderStatusSummary = { ...defaultResponse.orderStatusSummary };

  for (const order of ordersToday) {
    const status = order.status as keyof typeof orderStatusSummary;
    if (status in orderStatusSummary) {
      orderStatusSummary[status] += 1;
    }

    if (order.business_id && order.business?.name) {
      incrementMap(topBusinessesMap, order.business_id, order.business.name);
    }

    if (order.customer_id && order.customer) {
      incrementMap(
        topCustomersMap,
        order.customer_id,
        `${order.customer.first_name} ${order.customer.last_name}`.trim()
      );
    }

    if (order.rider_id && order.rider) {
      incrementMap(
        topRidersMap,
        order.rider_id,
        `${order.rider.first_name} ${order.rider.last_name}`.trim()
      );
    }
  }

  const revenueByDate = new Map<string, number>();
  const ordersByDate = new Map<string, number>();

  for (let index = 0; index < 7; index += 1) {
    const currentDate = startOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - index));
    const key = formatDateKey(currentDate);
    revenueByDate.set(key, 0);
    ordersByDate.set(key, 0);
  }

  for (const order of ordersLast7Days) {
    const key = formatDateKey(new Date(order.created_at));
    ordersByDate.set(key, (ordersByDate.get(key) || 0) + 1);
    if (order.status === 'delivered') {
      revenueByDate.set(key, (revenueByDate.get(key) || 0) + Number(order.order_total || 0));
    }
  }

  const dailyRevenue = deliveredToday.reduce((total: number, order: any) => total + Number(order.order_total || 0), 0);
  const averageTicketToday = deliveredToday.length > 0 ? dailyRevenue / deliveredToday.length : 0;

  return {
    dailyRevenue,
    dailyRiderEarnings: 0,
    dailyOrders: ordersToday.length,
    monthlyOrders: monthlyOrdersCount || 0,
    averageTicketToday,
    activeOrders: ordersToday.filter((order: any) => ACTIVE_ORDER_STATUSES.has(order.status)).length,
    totalRiders: totalRidersCount || 0,
    activeRiders: activeRidersCount || 0,
    totalBusinesses: totalBusinessesCount || 0,
    activeBusinesses: activeBusinessesCount || 0,
    orderStatusSummary,
    topBusinesses: Array.from(topBusinessesMap.entries())
      .map(([business_id, value]) => ({
        business_id,
        business_name: value.name,
        order_count: value.count,
      }))
      .sort((left, right) => right.order_count - left.order_count)
      .slice(0, 5),
    topRiders: Array.from(topRidersMap.entries())
      .map(([rider_id, value]) => ({
        rider_id,
        rider_name: value.name,
        order_count: value.count,
      }))
      .sort((left, right) => right.order_count - left.order_count)
      .slice(0, 5),
    topCustomers: Array.from(topCustomersMap.entries())
      .map(([customer_id, value]) => ({
        customer_id,
        customer_name: value.name,
        order_count: value.count,
      }))
      .sort((left, right) => right.order_count - left.order_count)
      .slice(0, 5),
    revenueLast7Days: Array.from(revenueByDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, ingresos]) => ({ date, ingresos })),
    ordersLast7Days: Array.from(ordersByDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, pedidos]) => ({ date, pedidos })),
  };
}

export async function GET(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} }, db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA! } }
  );

  const { searchParams } = new URL(request.url);
  const business_id = searchParams.get('business_id') || null;

  try {
    try {
      const rpcName = business_id ? 'get_business_dashboard_stats' : 'get_daily_dashboard_stats';
      const rpcParams = business_id ? { p_business_id: business_id } : {};
      const { data: statsData, error: statsError } = await supabase.rpc(rpcName, rpcParams);

      if (statsError) {
        throw statsError;
      }

      const stats = Array.isArray(statsData) ? statsData[0] : statsData;
      if (stats) {
        return NextResponse.json({
          dailyRevenue: stats.daily_revenue || 0,
          dailyRiderEarnings: stats.daily_rider_earnings || 0,
          dailyOrders: stats.daily_orders || 0,
          monthlyOrders: stats.monthly_orders || 0,
          averageTicketToday: stats.average_ticket_today || 0,
          activeOrders: stats.active_orders || 0,
          totalRiders: stats.total_riders || 0,
          activeRiders: stats.active_riders || 0,
          totalBusinesses: stats.total_businesses || 0,
          activeBusinesses: stats.active_businesses || 0,
          orderStatusSummary: stats.order_status_summary_json || defaultResponse.orderStatusSummary,
          topBusinesses: stats.top_businesses_json || [],
          topRiders: stats.top_riders_json || [],
          topCustomers: stats.top_customers_json || [],
          revenueLast7Days: stats.revenue_last_7_days_json || [],
          ordersLast7Days: stats.orders_last_7_days_json || [],
        });
      }
    } catch (rpcError) {
      console.error('Dashboard RPC fallback activated:', rpcError);
    }

    return NextResponse.json(await buildDashboardStats(supabase, business_id));

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
