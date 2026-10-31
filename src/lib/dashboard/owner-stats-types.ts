// Contrato de respuesta de /api/dashboard-stats para el dueño de negocio.
// Sin datos personales de clientes, teléfonos, GPS ni documentos.

export const ORDER_STATUS_KEYS = [
  'pending_acceptance',
  'accepted',
  'at_store',
  'cooking',
  'ready_for_pickup',
  'picked_up',
  'out_for_delivery',
  'on_the_way',
  'arrived_at_destination',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
  'failed',
] as const;

export type OrderStatusKey = (typeof ORDER_STATUS_KEYS)[number];
export type OrderStatusSummary = Record<OrderStatusKey, number>;

export interface OwnerDayTotals {
  sales: number;
  orders: number;
  averageTicket: number;
}

export interface OwnerDashboardStats {
  generatedAt: string;
  today: OwnerDayTotals;
  // Mismo día de la semana anterior (hace 7 días), para comparar tarjetas.
  previousWeekday: OwnerDayTotals;
  // Pedidos de ayer hasta la misma hora actual.
  yesterdaySameHourOrders: number;
  queue: {
    unassignedCount: number;
    oldestUnassignedMinutes: number | null;
    readyForPickupCount: number;
    failedToday: number;
  };
  orderStatusSummary: OrderStatusSummary;
  revenueLast7Days: { date: string; ingresos: number }[];
  ordersLast7Days: { date: string; pedidos: number }[];
  cancellation: {
    cancelled: number;
    total: number;
    // Porcentaje 0-100 de los últimos 7 días; null si no hubo pedidos.
    ratePercent: number | null;
  };
  // null cuando no hay datos de picked_up_at / completed_at.
  deliveryTime: {
    medianMinutes: number;
    p90Minutes: number;
    sample: number;
  } | null;
}
