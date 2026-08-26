import type { OrderStatus } from '@/types';

export type MonitoringPriority = 'P1' | 'P2' | 'P3';

export type MonitoringIncidentStatus = 'open' | 'attending' | 'resolved';

export type MonitoringSnapshotHealth = {
  schema: 'healthy' | 'degraded';
  disabledRules: string[];
};

export type MonitoringUiHealth = {
  realtime: 'connected' | 'degraded';
  snapshot: 'fresh' | 'stale';
  disabledRules: string[];
};

export type MonitoringThresholds = {
  unassignedCriticalMinutes: number;
  gpsStaleCriticalMinutes: number;
  stoppedInTransitMinutes: number;
  meaningfulMovementMeters: number;
  source: 'settings' | 'fallback';
};

export type MonitoringKpis = {
  openOrders: number;
  unassigned: number;
  onTheWay: number;
  atRisk: number;
  ridersOnline: number;
  available: number;
  occupied: number;
  noSignal: number;
};

export type MonitoringOrder = {
  id: string;
  status: OrderStatus;
  riderId: string | null;
  createdAt: string | null;
  expectedDeliveryAt: string | null;
  assignmentExhaustedAt: string | null;
  assignmentAttemptsExhausted?: boolean;
  isOutsideZone?: boolean;
  hasRepeatedRejections?: boolean;
};

export type MonitoringRider = {
  id: string;
  activeForOrders: boolean;
  lastLocationReceivedAt: string | null;
  lastLocationUpdate: string | null;
  hasIrregularReporting?: boolean;
};

export type RiderMovementWindow = {
  riderId: string;
  windowStartedAt: string | null;
  windowEndedAt: string | null;
  distanceMeters: number | null;
};

export type MonitoringConditionType =
  | 'unassigned'
  | 'gps-stale'
  | 'stopped-in-transit'
  | 'dispatch-exhausted'
  | 'late-delivery'
  | 'outside-zone'
  | 'repeated-rejections'
  | 'irregular-reporting';

export type MonitoringConditionMetadata = Readonly<
  Record<string, string | number | boolean | null>
>;

export type DetectedCondition = {
  key: string;
  type: MonitoringConditionType;
  priority: MonitoringPriority;
  orderId: string | null;
  riderId: string | null;
  detectedAt: string;
  metadata: MonitoringConditionMetadata;
};

export type MonitoringIncident = {
  id: number;
  conditionKey: string;
  type: MonitoringConditionType;
  priority: MonitoringPriority;
  status: MonitoringIncidentStatus;
  orderId: string | null;
  riderId: string | null;
  firstDetectedAt: string;
  lastDetectedAt: string;
  attendingAt: string | null;
  resolvedAt: string | null;
  metadata: MonitoringConditionMetadata;
};

export type MonitoringRiskFilter =
  | 'all'
  | 'atRisk'
  | 'unassigned'
  | 'onTheWay'
  | 'available'
  | 'occupied'
  | 'noSignal';

export type MonitoringFilter = {
  zoneId?: string;
  risk?: MonitoringRiskFilter;
  riderId?: string;
  orderStatus?: OrderStatus;
  search?: string;
};

export type MonitoringSnapshot = {
  serverTimestamp: string;
  dataHealth: MonitoringSnapshotHealth;
  thresholds: MonitoringThresholds;
  orders: MonitoringOrder[];
  riders: MonitoringRider[];
  incidents: MonitoringIncident[];
  kpis: MonitoringKpis;
};

export type MonitoringRuleInput = {
  orders: readonly MonitoringOrder[];
  riders: readonly MonitoringRider[];
  movementByRiderId: Readonly<Record<string, RiderMovementWindow | undefined>>;
};
