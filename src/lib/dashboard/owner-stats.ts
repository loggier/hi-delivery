import 'server-only';

import {
  ORDER_STATUS_KEYS,
  type OrderStatusSummary,
  type OwnerDashboardStats,
  type OwnerDayTotals,
} from '@/lib/dashboard/owner-stats-types';

type SupabaseLike = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export type OwnerSupplementaryStats = Pick<
  OwnerDashboardStats,
  'previousWeekday' | 'yesterdaySameHourOrders' | 'queue' | 'cancellation' | 'deliveryTime'
>;

export type OwnerRpcBaseStats = Pick<
  OwnerDashboardStats,
  'generatedAt' | 'today' | 'orderStatusSummary' | 'revenueLast7Days' | 'ordersLast7Days'
>;

type WindowOrder = {
  id: string;
  status: string;
  order_total: number | string | null;
  created_at: string;
};

const SUCCESSFUL_STATUSES = new Set(['completed', 'delivered']);
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MAX_REASONABLE_DELIVERY_MINUTES = 24 * 60;
// México no usa horario de verano desde 2022: el día local es fijo en UTC-06:00.
const MEXICO_UTC_OFFSET = '-06:00';
const MEXICO_TZ = 'America/Mexico_City';

const mexicoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MEXICO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Fecha calendario YYYY-MM-DD en hora de México.
function mexicoDateKey(date: Date): string {
  return mexicoDateFormatter.format(date);
}

function addDaysToKey(key: string, days: number): string {
  const value = new Date(`${key}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Inicio del día mexicano como instante absoluto.
function mexicoDayStart(key: string): Date {
  return new Date(`${key}T00:00:00${MEXICO_UTC_OFFSET}`);
}

function isInRange(order: WindowOrder, start: Date, end: Date): boolean {
  const time = Date.parse(order.created_at);
  return time >= start.getTime() && time < end.getTime();
}

function summarizeDay(orders: WindowOrder[]): OwnerDayTotals {
  const successful = orders.filter((order) => SUCCESSFUL_STATUSES.has(order.status));
  const sales = successful.reduce((total, order) => total + Number(order.order_total || 0), 0);
  return {
    sales,
    orders: orders.length,
    averageTicket: successful.length > 0 ? sales / successful.length : 0,
  };
}

function computeDeliveryTime(minutes: number[]): OwnerDashboardStats['deliveryTime'] {
  if (minutes.length === 0) return null;
  const sorted = [...minutes].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  const p90 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.9) - 1)];
  return {
    medianMinutes: Math.round(median),
    p90Minutes: Math.round(p90),
    sample: sorted.length,
  };
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? 'unknown');
  }
  return 'unknown';
}

// Mapea la fila de get_business_dashboard_stats_v2. Los nulos se normalizan
// a listas o ceros vacíos; la UI decide si mostrar estado vacío.
export function mapOwnerRpcBaseStats(row: Record<string, unknown>, now: Date): OwnerRpcBaseStats {
  const summary = Object.fromEntries(ORDER_STATUS_KEYS.map((key) => [key, 0])) as OrderStatusSummary;
  const rawSummary = (row.order_status_summary_json ?? {}) as Record<string, unknown>;
  for (const key of ORDER_STATUS_KEYS) {
    summary[key] = Number(rawSummary[key] ?? 0);
  }

  const revenueRows = Array.isArray(row.revenue_last_7_days_json) ? row.revenue_last_7_days_json : [];
  const orderRows = Array.isArray(row.orders_last_7_days_json) ? row.orders_last_7_days_json : [];

  return {
    generatedAt: now.toISOString(),
    today: {
      sales: Number(row.daily_revenue ?? 0),
      orders: Number(row.daily_orders ?? 0),
      averageTicket: Number(row.average_ticket_today ?? 0),
    },
    orderStatusSummary: summary,
    revenueLast7Days: revenueRows.map((item: { date: string; ingresos: number | string }) => ({
      date: String(item.date),
      ingresos: Number(item.ingresos ?? 0),
    })),
    ordersLast7Days: orderRows.map((item: { date: string; pedidos: number | string }) => ({
      date: String(item.date),
      pedidos: Number(item.pedidos ?? 0),
    })),
  };
}

// Estadísticas que la RPC no entrega: cola, comparación, cancelación y tiempo de entrega.
// Solo lecturas acotadas al negocio del dueño.
export async function buildOwnerSupplementaryStats(
  supabase: SupabaseLike,
  businessId: string,
  now: Date = new Date(),
): Promise<OwnerSupplementaryStats> {
  const todayKey = mexicoDateKey(now);
  const todayStart = mexicoDayStart(todayKey);
  const tomorrowStart = mexicoDayStart(addDaysToKey(todayKey, 1));
  const sevenDaysStart = mexicoDayStart(addDaysToKey(todayKey, -6));
  const lastWeekdayStart = mexicoDayStart(addDaysToKey(todayKey, -7));
  const lastWeekdayEnd = mexicoDayStart(addDaysToKey(todayKey, -6));
  const yesterdaySameHourEnd = new Date(now.getTime() - DAY_MS);
  const yesterdayStart = mexicoDayStart(addDaysToKey(todayKey, -1));

  const { data: windowRows, error: windowError } = await supabase
    .from('orders')
    .select('id, status, order_total, created_at')
    .eq('business_id', businessId)
    .gte('created_at', lastWeekdayStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString());
  if (windowError) throw windowError;
  const orders = (windowRows ?? []) as WindowOrder[];

  const [unassignedCountRes, oldestUnassignedRes, readyCountRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'pending_acceptance')
      .is('rider_id', null),
    supabase
      .from('orders')
      .select('created_at')
      .eq('business_id', businessId)
      .eq('status', 'pending_acceptance')
      .is('rider_id', null)
      .order('created_at', { ascending: true })
      .limit(1),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'ready_for_pickup'),
  ]);
  if (unassignedCountRes.error) throw unassignedCountRes.error;
  if (oldestUnassignedRes.error) throw oldestUnassignedRes.error;
  if (readyCountRes.error) throw readyCountRes.error;

  const oldestRow = (oldestUnassignedRes.data ?? [])[0] as { created_at: string } | undefined;
  const oldestUnassignedMinutes = oldestRow
    ? Math.max(0, Math.round((now.getTime() - Date.parse(oldestRow.created_at)) / MINUTE_MS))
    : null;

  // Tiempo de entrega: opcional. Si las columnas no existen, se oculta sin romper el resto.
  let deliveryTime: OwnerDashboardStats['deliveryTime'] = null;
  try {
    const { data: deliveryRows, error: deliveryError } = await supabase
      .from('orders')
      .select('picked_up_at, completed_at')
      .eq('business_id', businessId)
      .in('status', ['completed', 'delivered'])
      .not('picked_up_at', 'is', null)
      .gte('completed_at', sevenDaysStart.toISOString())
      .limit(1000);
    if (deliveryError) throw deliveryError;

    const minutes = (deliveryRows ?? [])
      .map((row: { picked_up_at: string; completed_at: string | null }) =>
        row.completed_at
          ? (Date.parse(row.completed_at) - Date.parse(row.picked_up_at)) / MINUTE_MS
          : Number.NaN,
      )
      .filter((value: number) =>
        Number.isFinite(value) && value > 0 && value <= MAX_REASONABLE_DELIVERY_MINUTES,
      );
    deliveryTime = computeDeliveryTime(minutes);
  } catch (error) {
    console.error('Dashboard del dueño: tiempo de entrega no disponible. Código:', errorCode(error));
  }

  const previousWeekdayOrders = orders.filter((order) => isInRange(order, lastWeekdayStart, lastWeekdayEnd));
  const yesterdayOrders = orders.filter((order) => isInRange(order, yesterdayStart, yesterdaySameHourEnd));
  const last7DaysOrders = orders.filter((order) => isInRange(order, sevenDaysStart, tomorrowStart));
  const todayOrders = orders.filter((order) => isInRange(order, todayStart, tomorrowStart));

  const cancelled = last7DaysOrders.filter((order) => order.status === 'cancelled').length;
  const total = last7DaysOrders.length;

  return {
    previousWeekday: summarizeDay(previousWeekdayOrders),
    yesterdaySameHourOrders: yesterdayOrders.length,
    queue: {
      unassignedCount: unassignedCountRes.count || 0,
      oldestUnassignedMinutes,
      readyForPickupCount: readyCountRes.count || 0,
      failedToday: todayOrders.filter((order) => order.status === 'failed').length,
    },
    cancellation: {
      cancelled,
      total,
      ratePercent: total > 0 ? Math.round((cancelled / total) * 1000) / 10 : null,
    },
    deliveryTime,
  };
}
