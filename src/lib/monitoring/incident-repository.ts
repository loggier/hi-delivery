import type {
  DetectedCondition,
  MonitoringConditionMetadata,
  MonitoringConditionType,
  MonitoringIncident,
  MonitoringIncidentStatus,
  MonitoringPriority,
} from './types';

const ACTIVE_STATUSES = ['open', 'attending'] as const;
const INCIDENT_COLUMNS = [
  'id',
  'condition_key',
  'incident_type',
  'priority',
  'status',
  'order_id',
  'rider_id',
  'first_detected_at',
  'last_detected_at',
  'attending_at',
  'resolved_at',
  'condition_metadata',
].join(',');
const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;
const SENSITIVE_METADATA_KEY_PATTERN =
  /(coordinate|latitude|longitude|(^|_)lat($|_)|(^|_)lng($|_)|token|credential|secret|password|history)/i;

type IncidentDbError = {
  code?: string;
  message?: string;
};

type IncidentDbResult = {
  data: unknown;
  error: IncidentDbError | null;
};

interface IncidentQuery extends PromiseLike<IncidentDbResult> {
  select(columns: string): IncidentQuery;
  insert(values: Record<string, unknown>): IncidentQuery;
  update(values: Record<string, unknown>): IncidentQuery;
  eq(column: string, value: unknown): IncidentQuery;
  in(column: string, values: readonly unknown[]): IncidentQuery;
  order(column: string, options: { ascending: boolean }): IncidentQuery;
  limit(value: number): IncidentQuery;
  maybeSingle(): IncidentQuery;
}

export interface SupabaseIncidentClient {
  from(table: string): unknown;
}

export interface IncidentStore {
  listActive(): Promise<MonitoringIncident[]>;
  findActiveByConditionKey(conditionKey: string): Promise<MonitoringIncident | null>;
  insertCondition(condition: DetectedCondition, now: string): Promise<void>;
  touchCondition(id: number, condition: DetectedCondition, now: string): Promise<void>;
  resolveCondition(id: number, now: string): Promise<void>;
}

export class IncidentConflictError extends Error {
  constructor() {
    super('Active monitoring incident already exists');
    this.name = 'IncidentConflictError';
  }
}

export async function reconcileMonitoringIncidents(
  store: IncidentStore,
  conditions: readonly DetectedCondition[],
  now: string,
): Promise<MonitoringIncident[]> {
  assertIsoTimestamp(now, 'Invalid monitoring reconciliation timestamp');

  const activeIncidents = await store.listActive();
  const activeByKey = new Map(
    activeIncidents.map((incident) => [incident.conditionKey, incident]),
  );
  const conditionsByKey = new Map(conditions.map((condition) => [condition.key, condition]));

  for (const incident of activeIncidents) {
    if (!conditionsByKey.has(incident.conditionKey)) {
      await store.resolveCondition(incident.id, now);
    }
  }

  for (const condition of conditionsByKey.values()) {
    const existing = activeByKey.get(condition.key);
    if (existing !== undefined) {
      await store.touchCondition(existing.id, condition, now);
      continue;
    }

    try {
      await store.insertCondition(condition, now);
    } catch (error: unknown) {
      if (!(error instanceof IncidentConflictError)) throw error;

      const concurrent = await store.findActiveByConditionKey(condition.key);
      if (concurrent === null) throw error;
      await store.touchCondition(concurrent.id, condition, now);
    }
  }

  return sortIncidents(await store.listActive());
}

export function createSupabaseIncidentStore(client: SupabaseIncidentClient): IncidentStore {
  return {
    async listActive(): Promise<MonitoringIncident[]> {
      const result = await query(client)
        .select(INCIDENT_COLUMNS)
        .in('status', ACTIVE_STATUSES)
        .order('priority', { ascending: true })
        .order('first_detected_at', { ascending: true })
        .order('id', { ascending: true });
      assertDbSuccess(result, 'Failed to list active monitoring incidents');

      if (!Array.isArray(result.data)) {
        throw new Error('Invalid monitoring incident response');
      }
      return result.data.map(mapIncidentRow);
    },

    async findActiveByConditionKey(conditionKey: string): Promise<MonitoringIncident | null> {
      const result = await query(client)
        .select(INCIDENT_COLUMNS)
        .eq('condition_key', conditionKey)
        .in('status', ACTIVE_STATUSES)
        .limit(1)
        .maybeSingle();
      assertDbSuccess(result, 'Failed to find active monitoring incident');

      return result.data === null ? null : mapIncidentRow(result.data);
    },

    async insertCondition(condition: DetectedCondition, now: string): Promise<void> {
      assertIsoTimestamp(now, 'Invalid monitoring incident timestamp');
      const result = await query(client).insert({
        condition_key: condition.key,
        incident_type: condition.type,
        priority: condition.priority,
        status: 'open',
        order_id: condition.orderId,
        rider_id: condition.riderId,
        first_detected_at: now,
        last_detected_at: now,
        condition_metadata: sanitizeMetadata(condition.metadata),
        created_at: now,
        updated_at: now,
      });

      if (result.error?.code === '23505') throw new IncidentConflictError();
      assertDbSuccess(result, 'Failed to insert monitoring incident');
    },

    async touchCondition(
      id: number,
      condition: DetectedCondition,
      now: string,
    ): Promise<void> {
      assertIsoTimestamp(now, 'Invalid monitoring incident timestamp');
      const result = await query(client)
        .update({
          last_detected_at: now,
          incident_type: condition.type,
          priority: condition.priority,
          condition_metadata: sanitizeMetadata(condition.metadata),
          updated_at: now,
        })
        .eq('id', id)
        .in('status', ACTIVE_STATUSES);
      assertDbSuccess(result, 'Failed to update monitoring incident');
    },

    async resolveCondition(id: number, now: string): Promise<void> {
      assertIsoTimestamp(now, 'Invalid monitoring incident timestamp');
      const result = await query(client)
        .update({
          status: 'resolved',
          resolved_at: now,
          resolution_source: 'condition_cleared',
          updated_at: now,
        })
        .eq('id', id)
        .in('status', ACTIVE_STATUSES);
      assertDbSuccess(result, 'Failed to resolve monitoring incident');
    },
  };
}

function query(client: SupabaseIncidentClient): IncidentQuery {
  return client.from('monitoring_incidents') as IncidentQuery;
}

function assertDbSuccess(result: IncidentDbResult, safeMessage: string): void {
  if (result.error !== null) throw new Error(safeMessage);
}

function assertIsoTimestamp(value: string, safeMessage: string): void {
  const match = ISO_TIMESTAMP_PATTERN.exec(value);
  if (match === null || !isValidIsoCalendarDate(match) || !Number.isFinite(Date.parse(value))) {
    throw new Error(safeMessage);
  }
}

function isValidIsoCalendarDate(match: RegExpExecArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offset = match[7];
  const date = new Date(Date.UTC(year, month - 1, day));
  const validOffset =
    offset === 'Z' ||
    (Number(offset.slice(1, 3)) <= 23 && Number(offset.slice(4, 6)) <= 59);

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    validOffset
  );
}

function sanitizeMetadata(metadata: MonitoringConditionMetadata): MonitoringConditionMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !SENSITIVE_METADATA_KEY_PATTERN.test(key)),
  );
}

function sortIncidents(incidents: MonitoringIncident[]): MonitoringIncident[] {
  return [...incidents].sort(
    (left, right) =>
      priorityRank(left.priority) - priorityRank(right.priority) ||
      Date.parse(left.firstDetectedAt) - Date.parse(right.firstDetectedAt) ||
      left.id - right.id,
  );
}

function priorityRank(priority: MonitoringPriority): number {
  return Number(priority.slice(1));
}

function mapIncidentRow(value: unknown): MonitoringIncident {
  if (!isRecord(value)) throw new Error('Invalid monitoring incident response');

  return {
    id: requiredNumber(value.id),
    conditionKey: requiredString(value.condition_key),
    type: conditionType(value.incident_type),
    priority: priority(value.priority),
    status: status(value.status),
    orderId: nullableString(value.order_id),
    riderId: nullableString(value.rider_id),
    firstDetectedAt: requiredString(value.first_detected_at),
    lastDetectedAt: requiredString(value.last_detected_at),
    attendingAt: nullableString(value.attending_at),
    resolvedAt: nullableString(value.resolved_at),
    metadata: metadata(value.condition_metadata),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Invalid monitoring incident response');
  }
  return value;
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid monitoring incident response');
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  return requiredString(value);
}

function conditionType(value: unknown): MonitoringConditionType {
  if (
    value === 'unassigned' ||
    value === 'gps-stale' ||
    value === 'stopped-in-transit' ||
    value === 'dispatch-exhausted' ||
    value === 'late-delivery' ||
    value === 'outside-zone' ||
    value === 'repeated-rejections' ||
    value === 'irregular-reporting'
  ) {
    return value;
  }
  throw new Error('Invalid monitoring incident response');
}

function priority(value: unknown): MonitoringPriority {
  if (value === 'P1' || value === 'P2' || value === 'P3') return value;
  throw new Error('Invalid monitoring incident response');
}

function status(value: unknown): MonitoringIncidentStatus {
  if (value === 'open' || value === 'attending' || value === 'resolved') return value;
  throw new Error('Invalid monitoring incident response');
}

function metadata(value: unknown): MonitoringConditionMetadata {
  if (!isRecord(value)) throw new Error('Invalid monitoring incident response');

  const entries = Object.entries(value);
  if (
    entries.some(
      ([, item]) =>
        item !== null &&
        typeof item !== 'string' &&
        typeof item !== 'number' &&
        typeof item !== 'boolean',
    )
  ) {
    throw new Error('Invalid monitoring incident response');
  }
  return sanitizeMetadata(value as MonitoringConditionMetadata);
}
