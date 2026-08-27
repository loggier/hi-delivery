import type {
  DetectedCondition,
  MonitoringConditionMetadata,
  MonitoringConditionType,
  MonitoringIncident,
  MonitoringIncidentStatus,
  MonitoringPriority,
} from './types';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const CONDITION_TYPES: readonly MonitoringConditionType[] = [
  'unassigned',
  'gps-stale',
  'stopped-in-transit',
  'dispatch-exhausted',
  'late-delivery',
  'outside-zone',
  'repeated-rejections',
  'irregular-reporting',
];
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

type RpcCondition = {
  condition_key: string;
  incident_type: MonitoringConditionType;
  priority: MonitoringPriority;
  status: 'open';
  detected_at: string;
  order_id: string | null;
  rider_id: string | null;
  condition_metadata: MonitoringConditionMetadata;
};

export interface SupabaseIncidentClient {
  rpc(functionName: string, params: Record<string, unknown>): unknown;
}

type OperationQuery = {
  select(value: string): OperationQuery;
  eq(column: string, value: unknown): OperationQuery;
  maybeSingle(): OperationQuery;
  update(values: Record<string, unknown>): OperationQuery;
  then<TResult1 = IncidentDbResult, TResult2 = never>(onfulfilled?: ((value: IncidentDbResult) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2>;
};

export type IncidentOperation = 'attend';

export async function requestCloseMonitoringIncident(input: { incident: MonitoringIncident; reason: string; actorId: string; now?: string }, suppliedClient?: SupabaseIncidentClient): Promise<{ status: MonitoringIncidentStatus; closed: boolean }> {
  const client = suppliedClient ?? createSupabaseAdminClient() as unknown as SupabaseIncidentClient;
  // The RPC owns the row lock, current-condition evaluation, and CAS. The client never pre-checks activity.
  const result = await client.rpc('request_close_monitoring_incident', {
    p_incident_id: input.incident.id,
    p_condition_key: input.incident.conditionKey,
    p_expected_status: input.incident.status,
    p_expected_last_detected_at: input.incident.lastDetectedAt,
    p_condition_active: null,
    p_actor_user_id: input.actorId,
    p_reason: input.reason,
    p_now: input.now ?? new Date().toISOString(),
  }) as IncidentDbResult;
  if (result.error?.code === 'P0009' || result.error?.code === '40001') throw new Error('stale incident');
  if (result.error?.code === 'P0002') throw new Error('missing incident');
  if (result.error) throw new Error('Unable to close monitoring incident');
  if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) throw new Error('stale incident');
  const response = Array.isArray(result.data) ? result.data[0] : result.data;
  if (isRecord(response) && (response.status === 'open' || response.status === 'attending' || response.status === 'resolved') && typeof response.closed === 'boolean') return { status: response.status, closed: response.closed };
  const updated = mapIncidentRow(response);
  return { status: updated.status, closed: updated.status === 'resolved' };
}

export async function getMonitoringIncidentForOperation(id: number): Promise<MonitoringIncident | null> {
  const client = createSupabaseAdminClient() as unknown as { from(table: string): OperationQuery };
  const result = await client.from('monitoring_incidents').select('id,condition_key,incident_type,priority,status,order_id,rider_id,first_detected_at,last_detected_at,attending_at,resolved_at,condition_metadata').eq('id', id).maybeSingle();
  if (result.error) throw new Error('Unable to load monitoring incident');
  return result.data === null ? null : mapIncidentRow(result.data);
}

export async function transitionMonitoringIncident(input: { incident: MonitoringIncident; action: IncidentOperation; actorId: string }): Promise<{ status: MonitoringIncidentStatus; closed: boolean }> {
  const { incident, action, actorId } = input;
  if (incident.status === 'resolved') throw new Error('stale incident');
  if (action === 'attend') {
    if (incident.status === 'attending') return { status: 'attending', closed: false };
    const updated = await updateIncident(incident.id, incident.status, incident.lastDetectedAt, { status: 'attending', attending_at: new Date().toISOString(), last_acted_by_user_id: actorId });
    if (!updated) throw new Error('stale incident');
    return { status: 'attending', closed: false };
  }
  return { status: 'attending', closed: false };
}

async function updateIncident(id: number, expectedStatus: MonitoringIncidentStatus, expectedLastDetectedAt: string, values: Record<string, unknown>): Promise<MonitoringIncident | null> {
  const client = createSupabaseAdminClient() as unknown as { from(table: string): OperationQuery };
  const result = await client.from('monitoring_incidents').update(values).eq('id', id).eq('status', expectedStatus).eq('last_detected_at', expectedLastDetectedAt).select('id,condition_key,incident_type,priority,status,order_id,rider_id,first_detected_at,last_detected_at,attending_at,resolved_at,condition_metadata').maybeSingle();
  if (result.error) throw new Error('Unable to update monitoring incident');
  return result.data === null ? null : mapIncidentRow(result.data);
}

export interface IncidentStore {
  reconcileBatch(
    conditions: readonly DetectedCondition[],
    evaluatedTypes: readonly MonitoringConditionType[],
    now: string,
  ): Promise<MonitoringIncident[]>;
}

export async function reconcileMonitoringIncidents(
  store: IncidentStore,
  conditions: readonly DetectedCondition[],
  evaluatedTypes: readonly MonitoringConditionType[],
  now: Date,
): Promise<MonitoringIncident[]> {
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid monitoring reconciliation timestamp');
  }

  const normalizedTypes = normalizeEvaluatedTypes(evaluatedTypes);
  const normalizedConditions = deduplicateConditions(conditions);
  const incidents = await store.reconcileBatch(
    normalizedConditions,
    normalizedTypes,
    now.toISOString(),
  );

  return sortIncidents(incidents);
}

export function createSupabaseIncidentStore(client: SupabaseIncidentClient): IncidentStore {
  return {
    async reconcileBatch(
      conditions: readonly DetectedCondition[],
      evaluatedTypes: readonly MonitoringConditionType[],
      now: string,
    ): Promise<MonitoringIncident[]> {
      assertIsoTimestamp(now, 'Invalid monitoring incident timestamp');
      const result = (await client.rpc('reconcile_monitoring_incidents', {
        p_conditions: conditions.map(toRpcCondition),
        p_evaluated_types: [...evaluatedTypes],
        p_now: now,
      })) as IncidentDbResult;

      if (result.error !== null) {
        throw new Error('Failed to reconcile monitoring incidents');
      }
      if (!Array.isArray(result.data)) {
        throw new Error('Invalid monitoring incident response');
      }

      return result.data.map(mapIncidentRow);
    },
  };
}

function normalizeEvaluatedTypes(
  evaluatedTypes: readonly MonitoringConditionType[],
): MonitoringConditionType[] {
  const normalized: MonitoringConditionType[] = [];
  const seen = new Set<MonitoringConditionType>();

  for (const type of evaluatedTypes) {
    if (!isConditionType(type)) {
      throw new Error('Invalid evaluated monitoring incident type');
    }
    if (!seen.has(type)) {
      seen.add(type);
      normalized.push(type);
    }
  }

  return normalized;
}

function deduplicateConditions(
  conditions: readonly DetectedCondition[],
): DetectedCondition[] {
  const conditionsByKey = new Map<string, DetectedCondition>();

  for (const rawCondition of conditions) {
    assertCondition(rawCondition);
    const condition = {
      ...rawCondition,
      metadata: sanitizeMetadata(rawCondition.metadata),
    };
    const existing = conditionsByKey.get(condition.key);

    if (existing === undefined) {
      conditionsByKey.set(condition.key, condition);
      continue;
    }
    if (!hasCompatibleIdentity(existing, condition)) {
      throw new Error('Incompatible duplicate monitoring condition');
    }

    const priorityComparison = priorityRank(condition.priority) - priorityRank(existing.priority);
    if (
      priorityComparison < 0 ||
      (priorityComparison === 0 &&
        canonicalMetadata(condition.metadata) < canonicalMetadata(existing.metadata))
    ) {
      conditionsByKey.set(condition.key, condition);
    }
  }

  return [...conditionsByKey.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function assertCondition(condition: DetectedCondition): void {
  assertIsoTimestamp(condition.detectedAt, 'Invalid monitoring condition timestamp');
  if (
    typeof condition.key !== 'string' ||
    condition.key.trim() === '' ||
    !isConditionType(condition.type) ||
    !isPriority(condition.priority) ||
    (condition.orderId !== null && typeof condition.orderId !== 'string') ||
    (condition.riderId !== null && typeof condition.riderId !== 'string') ||
    !isMetadata(condition.metadata)
  ) {
    throw new Error('Invalid monitoring condition');
  }
}

function hasCompatibleIdentity(
  left: DetectedCondition,
  right: DetectedCondition,
): boolean {
  return (
    left.type === right.type &&
    left.orderId === right.orderId &&
    left.riderId === right.riderId
  );
}

function toRpcCondition(condition: DetectedCondition): RpcCondition {
  return {
    condition_key: condition.key,
    incident_type: condition.type,
    priority: condition.priority,
    status: 'open',
    detected_at: condition.detectedAt,
    order_id: condition.orderId,
    rider_id: condition.riderId,
    condition_metadata: sanitizeMetadata(condition.metadata),
  };
}

function canonicalMetadata(metadata: MonitoringConditionMetadata): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(metadata).sort(([left], [right]) => left.localeCompare(right))),
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

  const id = requiredNumber(value.id);
  const firstDetectedAt = requiredTimestamp(value.first_detected_at);
  const lastDetectedAt = requiredTimestamp(value.last_detected_at);
  const attendingAt = nullableTimestamp(value.attending_at);
  const resolvedAt = nullableTimestamp(value.resolved_at);
  if (
    !Number.isSafeInteger(id) ||
    Date.parse(lastDetectedAt) < Date.parse(firstDetectedAt)
  ) {
    throw new Error('Invalid monitoring incident response');
  }

  return {
    id,
    conditionKey: requiredString(value.condition_key),
    type: conditionType(value.incident_type),
    priority: priority(value.priority),
    status: status(value.status),
    orderId: nullableString(value.order_id),
    riderId: nullableString(value.rider_id),
    firstDetectedAt,
    lastDetectedAt,
    attendingAt,
    resolvedAt,
    metadata: metadata(value.condition_metadata),
  };
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

function isConditionType(value: unknown): value is MonitoringConditionType {
  return CONDITION_TYPES.some((type) => type === value);
}

function isPriority(value: unknown): value is MonitoringPriority {
  return value === 'P1' || value === 'P2' || value === 'P3';
}

function conditionType(value: unknown): MonitoringConditionType {
  if (isConditionType(value)) return value;
  throw new Error('Invalid monitoring incident response');
}

function priority(value: unknown): MonitoringPriority {
  if (isPriority(value)) return value;
  throw new Error('Invalid monitoring incident response');
}

function status(value: unknown): MonitoringIncidentStatus {
  if (value === 'open' || value === 'attending' || value === 'resolved') return value;
  throw new Error('Invalid monitoring incident response');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMetadata(value: unknown): value is MonitoringConditionMetadata {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) =>
        item === null ||
        typeof item === 'string' ||
        (typeof item === 'number' && Number.isFinite(item)) ||
        typeof item === 'boolean',
    )
  );
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

function requiredTimestamp(value: unknown): string {
  const timestamp = requiredString(value);
  assertIsoTimestamp(timestamp, 'Invalid monitoring incident response');
  return timestamp;
}

function nullableTimestamp(value: unknown): string | null {
  if (value === null) return null;
  return requiredTimestamp(value);
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  return requiredString(value);
}

function metadata(value: unknown): MonitoringConditionMetadata {
  if (!isMetadata(value)) throw new Error('Invalid monitoring incident response');
  return sanitizeMetadata(value);
}
