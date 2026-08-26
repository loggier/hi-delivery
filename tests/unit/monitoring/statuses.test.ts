import { describe, expect, it } from 'vitest';

import {
  IN_TRANSIT_ORDER_STATUSES,
  isInTransitStatus,
  isOpenOrderStatus,
  isTerminalOrderStatus,
  TERMINAL_ORDER_STATUSES,
} from '@/lib/monitoring/statuses';

describe('monitoring order statuses', () => {
  it('classifies current and legacy open statuses', () => {
    expect(isOpenOrderStatus('pending_acceptance')).toBe(true);
    expect(isOpenOrderStatus('out_for_delivery')).toBe(true);
    expect(isOpenOrderStatus('completed')).toBe(false);
    expect(isOpenOrderStatus('delivered')).toBe(false);
  });

  it('classifies terminal statuses from one readonly list', () => {
    expect(TERMINAL_ORDER_STATUSES).toEqual([
      'completed',
      'delivered',
      'cancelled',
      'refunded',
      'failed',
    ]);
    expect(isTerminalOrderStatus('completed')).toBe(true);
    expect(isTerminalOrderStatus('delivered')).toBe(true);
    expect(isTerminalOrderStatus('accepted')).toBe(false);
  });

  it('includes canonical and legacy in-transit statuses', () => {
    expect(IN_TRANSIT_ORDER_STATUSES).toContain('picked_up');
    expect(IN_TRANSIT_ORDER_STATUSES).toContain('out_for_delivery');
    expect(isInTransitStatus('picked_up')).toBe(true);
    expect(isInTransitStatus('out_for_delivery')).toBe(true);
    expect(isInTransitStatus('accepted')).toBe(false);
  });
});
