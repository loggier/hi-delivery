export const RIDER_ORDER_SELECT = [
  'id', 'business:business_id(name, phone_whatsapp)', 'pickup_address', 'delivery_address',
  'customer_name', 'customer_phone', 'items_description', 'subtotal', 'delivery_fee',
  'order_total', 'estimated_earnings', 'distance', 'status', 'created_at', 'updated_at',
  'rider_id', 'ticket_photo_url', 'ticket_photo_urls', 'delivery_proof_url',
  'notified_riders', 'active_notified_riders', 'rejected_riders',
  'notification_expires_at', 'assignment_exhausted_at', 'dispatch_attempt_count',
].join(',');

export const RIDER_ACTIVE_ORDER_STATUSES = [
  'accepted', 'at_store', 'cooking', 'ready_for_pickup', 'picked_up',
  'out_for_delivery', 'on_the_way', 'arrived_at_destination',
];

export const RIDER_TERMINAL_ORDER_STATUSES = ['completed', 'delivered', 'cancelled', 'refunded', 'failed'];

export function asRiderStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

export function isEligibleUnassignedOrder(order: Record<string, unknown>, riderId: string, now: number) {
  if (order.status !== 'pending_acceptance' || order.rider_id !== null) return false;
  if (asRiderStringList(order.rejected_riders).includes(riderId)) return false;
  if (order.assignment_exhausted_at) return false;
  const expiry = order.notification_expires_at ? Date.parse(String(order.notification_expires_at)) : null;
  if (expiry !== null && (!Number.isFinite(expiry) || expiry <= now)) return false;
  const activeWave = asRiderStringList(order.active_notified_riders);
  const notified = asRiderStringList(order.notified_riders);
  return activeWave.length > 0 ? activeWave.includes(riderId) : notified.includes(riderId);
}

export function safeRiderOrder(order: Record<string, unknown>) {
  const {
    notified_riders: _notified,
    active_notified_riders: _activeNotified,
    rejected_riders: _rejected,
    notification_expires_at: _expires,
    assignment_exhausted_at: _exhausted,
    ...visible
  } = order;
  return visible;
}
