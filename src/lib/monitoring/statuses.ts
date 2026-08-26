import type { OrderStatus } from '@/types';

export const TERMINAL_ORDER_STATUSES = [
  'completed',
  'delivered',
  'cancelled',
  'refunded',
  'failed',
] as const satisfies readonly OrderStatus[];

export const IN_TRANSIT_ORDER_STATUSES = [
  'picked_up',
  'out_for_delivery',
  'on_the_way',
  'arrived_at_destination',
] as const satisfies readonly OrderStatus[];

const terminalOrderStatusSet: ReadonlySet<OrderStatus> = new Set(TERMINAL_ORDER_STATUSES);
const inTransitOrderStatusSet: ReadonlySet<OrderStatus> = new Set(IN_TRANSIT_ORDER_STATUSES);

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return terminalOrderStatusSet.has(status);
}

export function isOpenOrderStatus(status: OrderStatus): boolean {
  return !isTerminalOrderStatus(status);
}

export function isInTransitStatus(status: OrderStatus): boolean {
  return inTransitOrderStatusSet.has(status);
}
