# Monitoring Operations Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir `/monitoring` en una mesa de control escalable que resuma pedidos y riders, priorice incidencias y permita acciones administrativas seguras y auditadas.

**Architecture:** Una sesión web revocable en cookie `HttpOnly` autoriza APIs server-side. Un servicio de snapshot consulta sólo operación activa, calcula KPIs y condiciones mediante funciones puras, reconcilia incidentes persistidos y devuelve una vista autoritativa cada 15 segundos; Supabase Realtime queda limitado a parches de posición. La UI se divide en componentes coordinados por una selección y filtro únicos, mientras las acciones sensibles releen estado, exigen motivo y escriben auditoría.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase/PostgreSQL, TanStack Query, Zod, shadcn/ui, Google Maps, Vitest, Testing Library y Playwright.

---

## File Structure

### New files

- `supabase/migrations/20260825100000_admin_web_sessions.sql`: sesiones web opacas y revocables.
- `supabase/migrations/20260825101000_monitoring_operations_control.sql`: thresholds, incidentes, auditoría e índices.
- `src/lib/auth/admin-session.ts`: emisión, validación y revocación de sesión server-side.
- `src/lib/monitoring/types.ts`: contrato compartido de snapshot, filtros, incidentes y acciones.
- `src/lib/monitoring/statuses.ts`: estados abiertos, terminales y en tránsito.
- `src/lib/monitoring/rules.ts`: detección pura de condiciones operativas.
- `src/lib/monitoring/kpis.ts`: agregación pura de los ocho KPIs.
- `src/lib/monitoring/incident-repository.ts`: persistencia y reconciliación de ciclos.
- `src/lib/monitoring/snapshot-service.ts`: lectura operacional y construcción del snapshot.
- `src/lib/monitoring/dispatch-service.ts`: RPCs y fallback legacy de reasignación.
- `src/lib/monitoring/action-service.ts`: ejecución segura y auditoría de acciones.
- `src/app/api/auth/sign-out/route.ts`: revocación de sesión web.
- `src/app/api/monitoring/snapshot/route.ts`: snapshot protegido.
- `src/app/api/monitoring/history/route.ts`: historial de recorrido protegido y acotado.
- `src/app/api/monitoring/actions/route.ts`: acciones inmediatas y sensibles.
- `src/app/api/monitoring/incidents/[id]/route.ts`: transición `attending` y solicitud de cierre.
- `src/app/(admin)/monitoring/_hooks/use-monitoring-snapshot.ts`: polling autoritativo.
- `src/app/(admin)/monitoring/_hooks/use-monitoring-realtime.ts`: parches de ubicación y salud Realtime.
- `src/app/(admin)/monitoring/_hooks/use-monitoring-controller.ts`: filtro y selección coordinada.
- `src/app/(admin)/monitoring/_components/*`: resumen, cola, mapa, contexto, tabla, diálogos e historial.
- `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`: infraestructura de pruebas.
- `tests/unit/monitoring/*`, `tests/integration/monitoring/*`, `tests/ui/monitoring/*`, `tests/scale/monitoring/*`, `tests/e2e/monitoring.spec.ts`: cobertura funcional y de escala.

### Existing files to modify

- `src/app/api/auth/sign-in/route.ts`: crear cookie de sesión al autenticar.
- `src/store/auth-store.ts`: cerrar también la sesión server-side.
- `src/app/api/push/location-request/route.ts`: exigir sesión administrativa.
- `src/app/(admin)/monitoring/page.tsx`: convertir en composición del operations desk.
- `src/app/(admin)/monitoring/live-map.tsx`: migrar comportamiento reutilizable al mapa controlado.
- `src/app/(admin)/orders/[id]/page.tsx`: consumir dispatch server-side compartido.
- `src/types/index.d.ts`: thresholds de `SystemSettings` y exports de monitoring si los consumidores existentes lo requieren.
- `package.json`, `package-lock.json`: scripts y dependencias de pruebas.
- `CODEX.md`: migraciones, seguridad, reglas y fallbacks.

---

### Task 1: Add Executable Test Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Test: `src/lib/__tests__/shipping-address-url.test.ts`

- [ ] **Step 1: Install the test dependencies**

Run:

```bash
npm install --save-dev vitest jsdom @vitejs/plugin-react vite-tsconfig-paths @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

Expected: `package.json` and `package-lock.json` include the packages without changing runtime dependencies.

- [ ] **Step 2: Add repeatable scripts**

Add these scripts to `package.json`:

```json
"test": "vitest run",
"test:unit": "vitest run tests/unit",
"test:integration": "vitest run tests/integration",
"test:ui": "vitest run tests/ui",
"test:scale": "vitest run tests/scale",
"test:e2e": "playwright test"
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
  },
});
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Configure Playwright against the existing dev port**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:9002',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:9002',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5: Verify the existing unit test is executable**

Run:

```bash
npm run test -- src/lib/__tests__/shipping-address-url.test.ts
```

Expected: existing shipping URL tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts playwright.config.ts
git commit -m "test: add web test infrastructure"
```

---

### Task 2: Add Revocable Server-Verified Web Sessions

**Files:**
- Create: `supabase/migrations/20260825100000_admin_web_sessions.sql`
- Create: `src/lib/auth/admin-session.ts`
- Create: `src/app/api/auth/sign-out/route.ts`
- Modify: `src/app/api/auth/sign-in/route.ts`
- Modify: `src/store/auth-store.ts`
- Test: `tests/unit/auth/admin-session.test.ts`
- Test: `tests/unit/auth/admin-session-authorization.test.ts`

- [ ] **Step 1: Write failing session token tests**

Create `tests/unit/auth/admin-session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hashSessionToken, newSessionToken } from '@/lib/auth/admin-session';

describe('admin web session tokens', () => {
  it('creates an opaque token and stores only its deterministic hash', () => {
    const token = newSessionToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken(token)).toHaveLength(64);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run tests/unit/auth/admin-session.test.ts
```

Expected: FAIL because `src/lib/auth/admin-session.ts` does not exist.

- [ ] **Step 3: Add the server-only session table**

Create `supabase/migrations/20260825100000_admin_web_sessions.sql` with:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS grupohubs.admin_web_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  user_id varchar(255) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS admin_web_sessions_active_user_idx
  ON grupohubs.admin_web_sessions (user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

REVOKE ALL ON TABLE grupohubs.admin_web_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE grupohubs.admin_web_sessions_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE grupohubs.admin_web_sessions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE grupohubs.admin_web_sessions_id_seq TO service_role;

COMMENT ON TABLE grupohubs.admin_web_sessions IS
  'Revocable server-side sessions for the web admin panel. Raw tokens are never stored.';

COMMIT;
```

- [ ] **Step 4: Implement session issuance and authorization**

Create `src/lib/auth/admin-session.ts` with exports:

```ts
import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const ADMIN_SESSION_COOKIE = 'hid-admin-session';
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export type AdminOperationUser = {
  id: string;
  roleId: string;
  status: string;
};

export class AdminSessionError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
  }
}

export function newSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAdminWebSession(userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('admin_web_sessions').insert({
    token_hash: hashSessionToken(token),
    user_id: userId,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error('No se pudo crear la sesión web.');

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function requireAdminOperationSession(): Promise<AdminOperationUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) throw new AdminSessionError(401, 'Sesión requerida.');

  const supabase = createSupabaseAdminClient();
  const { data: session } = await supabase
    .from('admin_web_sessions')
    .select('user_id, expires_at, revoked_at')
    .eq('token_hash', hashSessionToken(token))
    .maybeSingle();
  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
    throw new AdminSessionError(401, 'La sesión expiró.');
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, role_id, status')
    .eq('id', session.user_id)
    .maybeSingle();
  if (!user || user.status !== 'ACTIVE') {
    throw new AdminSessionError(403, 'Usuario administrativo inactivo.');
  }
  if (user.role_id !== 'role-admin') {
    throw new AdminSessionError(403, 'Permisos administrativos requeridos.');
  }
  return { id: user.id, roleId: user.role_id, status: user.status };
}

export async function revokeCurrentAdminWebSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await createSupabaseAdminClient()
      .from('admin_web_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashSessionToken(token));
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
```

- [ ] **Step 5: Issue and revoke the cookie**

In `src/app/api/auth/sign-in/route.ts`, replace the local Supabase client construction with `createSupabaseAdminClient()` and call:

```ts
await createAdminWebSession(fullUser.id);
```

immediately before the successful response. Create `src/app/api/auth/sign-out/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { revokeCurrentAdminWebSession } from '@/lib/auth/admin-session';

export async function POST() {
  await revokeCurrentAdminWebSession();
  return NextResponse.json({ ok: true });
}
```

Update `logout` in `src/store/auth-store.ts` to invoke `fetch('/api/auth/sign-out', { method: 'POST' })` best-effort before clearing local state. Keep `hid-session` temporarily as display state, never as API authorization.

- [ ] **Step 6: Verify authorization behavior**

Create `tests/unit/auth/admin-session-authorization.test.ts` by mocking `next/headers` and `createSupabaseAdminClient`. Assert: missing cookie throws `AdminSessionError(401)`, missing/revoked/expired rows throw `401`, inactive/non-admin users throw `403`, and an active `role-admin` returns its database identity. Route-level `401/403` behavior is covered when the snapshot route exists in Task 6. Run:

```bash
npx vitest run tests/unit/auth/admin-session.test.ts tests/unit/auth/admin-session-authorization.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260825100000_admin_web_sessions.sql src/lib/auth/admin-session.ts src/app/api/auth/sign-in/route.ts src/app/api/auth/sign-out/route.ts src/store/auth-store.ts tests/unit/auth/admin-session.test.ts tests/unit/auth/admin-session-authorization.test.ts
git commit -m "feat: add verified admin web sessions"
```

---

### Task 3: Add Monitoring Persistence and Settings

**Files:**
- Create: `supabase/migrations/20260825101000_monitoring_operations_control.sql`
- Modify: `src/types/index.d.ts`
- Modify: `CODEX.md`

- [ ] **Step 1: Add the monitoring migration**

Create `supabase/migrations/20260825101000_monitoring_operations_control.sql` as one transaction. It must:

```sql
ALTER TABLE grupohubs.system_settings
  ADD COLUMN IF NOT EXISTS monitoring_unassigned_critical_minutes integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS monitoring_gps_stale_critical_minutes integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS monitoring_stopped_in_transit_minutes integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS monitoring_meaningful_movement_meters integer NOT NULL DEFAULT 50;
```

Add positive-value checks using idempotent `DO $$ ... $$` blocks. Create `monitoring_incidents` with `condition_key`, `incident_type`, `priority`, optional rider/order IDs, lifecycle timestamps, actor, resolution and object metadata. Create:

```sql
CREATE UNIQUE INDEX monitoring_incidents_active_condition_uidx
  ON grupohubs.monitoring_incidents (condition_key)
  WHERE status IN ('open', 'attending');

CREATE INDEX monitoring_incidents_active_priority_age_idx
  ON grupohubs.monitoring_incidents (priority, first_detected_at, id)
  WHERE status IN ('open', 'attending');
```

Create append-only `monitoring_action_log` with sensitive-reason and failed-error checks. Revoke access from `PUBLIC`, `anon`, and `authenticated`; grant only required `service_role` access. Add a `BEFORE UPDATE OR DELETE` trigger that raises `monitoring_action_log is append-only`.

- [ ] **Step 2: Add operational indexes without assuming missing enum values**

Add:

```sql
CREATE INDEX IF NOT EXISTS orders_monitoring_unassigned_created_idx
  ON grupohubs.orders (created_at, id)
  WHERE rider_id IS NULL AND status = 'pending_acceptance';

CREATE INDEX IF NOT EXISTS orders_monitoring_rider_status_idx
  ON grupohubs.orders (rider_id, status)
  WHERE rider_id IS NOT NULL;
```

Do not add `pg_cron`, dispatch RPC definitions, or `expected_delivery_at` in this migration.

- [ ] **Step 3: Update TypeScript settings**

Extend `SystemSettings` in `src/types/index.d.ts` with:

```ts
monitoring_unassigned_critical_minutes?: number;
monitoring_gps_stale_critical_minutes?: number;
monitoring_stopped_in_transit_minutes?: number;
monitoring_meaningful_movement_meters?: number;
```

- [ ] **Step 4: Document the schema contract**

Add a dated section to `CODEX.md` recording the two migration names, defaults `7/10/15/50`, server-only access, append-only audit, backend reconciliation, no `pg_cron`, disabled late-delivery rule without a persisted expected time, and preservation of dispatch fallbacks.

- [ ] **Step 5: Validate and commit**

Run:

```bash
git diff --check
npm run typecheck
```

Expected: no whitespace or TypeScript errors.

```bash
git add supabase/migrations/20260825101000_monitoring_operations_control.sql src/types/index.d.ts CODEX.md
git commit -m "db: add monitoring operations schema"
```

---

### Task 4: Implement the Pure Monitoring Domain

**Files:**
- Create: `src/lib/monitoring/types.ts`
- Create: `src/lib/monitoring/statuses.ts`
- Create: `src/lib/monitoring/rules.ts`
- Create: `src/lib/monitoring/kpis.ts`
- Test: `tests/unit/monitoring/statuses.test.ts`
- Test: `tests/unit/monitoring/rules.test.ts`
- Test: `tests/unit/monitoring/kpis.test.ts`

- [ ] **Step 1: Write failing status and threshold tests**

Cover:

```ts
expect(isOpenOrderStatus('pending_acceptance')).toBe(true);
expect(isOpenOrderStatus('out_for_delivery')).toBe(true);
expect(isOpenOrderStatus('completed')).toBe(false);
expect(isInTransitStatus('picked_up')).toBe(true);
```

Use an injected `now = new Date('2026-08-25T12:00:00Z')`. Assert unassigned is not critical at `6:59` and becomes critical at `7:00`; GPS becomes critical at `10:00`; stopped-in-transit becomes critical at `15:00` only when displacement is below 50 meters.

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx vitest run tests/unit/monitoring/statuses.test.ts tests/unit/monitoring/rules.test.ts tests/unit/monitoring/kpis.test.ts
```

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Define stable contracts**

In `src/lib/monitoring/types.ts`, define:

```ts
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
```

Also define normalized `MonitoringOrder`, `MonitoringRider`, `DetectedCondition`, `MonitoringIncident`, `MonitoringFilter`, and `MonitoringSnapshot`. `MonitoringSnapshot` carries `MonitoringSnapshotHealth`; the client hook combines it with query and channel state into `MonitoringUiHealth`. Keep precise history points out of `MonitoringSnapshot`.

- [ ] **Step 4: Implement canonical status helpers**

In `statuses.ts`, export immutable sets containing all current `OrderStatus` values, including legacy `out_for_delivery`. Implement `isOpenOrderStatus`, `isInTransitStatus`, and `isTerminalOrderStatus` without duplicating arrays in UI files.

- [ ] **Step 5: Implement deterministic rules and KPIs**

`detectMonitoringConditions(input, thresholds, now)` returns deterministic keys such as:

```ts
`unassigned:${order.id}`
`gps-stale:${order.id}:${rider.id}`
`stopped-in-transit:${order.id}:${rider.id}`
`dispatch-exhausted:${order.id}`
```

Prefer `last_location_received_at` and fall back to `last_location_update`. Disable `late_delivery` when `expected_delivery_at` is absent. `computeMonitoringKpis` must count each order/rider once and treat occupied riders without fresh GPS as both `occupied` and `noSignal`.

- [ ] **Step 6: Run domain tests**

```bash
npx vitest run tests/unit/monitoring
npm run typecheck
```

Expected: all domain tests and typecheck pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/monitoring tests/unit/monitoring
git commit -m "feat: add monitoring risk domain"
```

---

### Task 5: Reconcile Persistent Incident Cycles

**Files:**
- Create: `src/lib/monitoring/incident-repository.ts`
- Test: `tests/unit/monitoring/incidents.test.ts`
- Test: `tests/integration/monitoring/incident-repository.test.ts`

- [ ] **Step 1: Write failing lifecycle tests**

Test these exact cases:

```ts
it('inserts one active incident for a new condition');
it('updates last_detected_at without resetting first_detected_at');
it('resolves conditions no longer detected with condition_cleared');
it('creates a new row when a resolved condition recurs');
it('keeps an active condition attending when close is requested');
```

- [ ] **Step 2: Implement repository boundaries**

Export:

```ts
export interface IncidentStore {
  listActive(): Promise<MonitoringIncident[]>;
  insertCondition(condition: DetectedCondition, now: string): Promise<void>;
  touchCondition(id: number, condition: DetectedCondition, now: string): Promise<void>;
  resolveCondition(id: number, now: string): Promise<void>;
}

export async function reconcileMonitoringIncidents(
  store: IncidentStore,
  conditions: DetectedCondition[],
  now: Date,
): Promise<MonitoringIncident[]>;
```

Use the partial unique index as the final concurrency guard. On PostgreSQL unique conflict, reload the active row and touch it instead of returning a 500.

- [ ] **Step 3: Verify lifecycle behavior**

```bash
npx vitest run tests/unit/monitoring/incidents.test.ts tests/integration/monitoring/incident-repository.test.ts
```

Expected: all five lifecycle cases pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/monitoring/incident-repository.ts tests/unit/monitoring/incidents.test.ts tests/integration/monitoring/incident-repository.test.ts
git commit -m "feat: reconcile monitoring incidents"
```

---

### Task 6: Build the Protected Operational Snapshot

**Files:**
- Create: `src/lib/monitoring/snapshot-service.ts`
- Create: `src/app/api/monitoring/snapshot/route.ts`
- Test: `tests/integration/monitoring/snapshot-route.test.ts`
- Test: `tests/integration/monitoring/schema-fallbacks.test.ts`

- [ ] **Step 1: Write failing route tests**

Test `POST /api/monitoring/snapshot` for:

- `401` without a server session.
- `403` for non-admin role.
- `400` for malformed filters.
- `200` with `{ serverTimestamp, dataHealth, thresholds, kpis, incidents, orders, riders }`.
- Fallback thresholds and `dataHealth.disabledRules` when optional columns are missing.
- No historical terminal orders in repository results.

- [ ] **Step 2: Define and validate the request**

Use a Zod schema with optional `zoneId`, `risk`, `riderId`, `orderStatus`, and `search`, each trimmed and bounded. The route must call `requireAdminOperationSession()` before creating the service-role client.

- [ ] **Step 3: Implement snapshot queries**

`buildMonitoringSnapshot({ filter, now })` must:

1. Read the single settings row and normalize defaults `7/10/15/50`.
2. Query only non-terminal operational orders.
3. Query riders who are available or referenced by those orders.
4. Query only the minimum history window for riders attached to in-transit orders.
5. Detect conditions and reconcile incidents.
6. Compute unfiltered KPIs, then apply the requested view filter to rows.
7. Return a server timestamp and disabled rules.

Do not catch all database errors as schema drift. Only known PostgREST missing-column/schema-cache errors activate optional fallbacks; other errors produce `500`.

- [ ] **Step 4: Return safe API errors**

Map `AdminSessionError` to its `401/403`, Zod failures to `400`, and unexpected failures to:

```json
{ "message": "No se pudo actualizar la operación." }
```

Log only a safe error category, never tokens, rider coordinates, or complete rows.

- [ ] **Step 5: Verify snapshot behavior**

```bash
npx vitest run tests/integration/monitoring/snapshot-route.test.ts tests/integration/monitoring/schema-fallbacks.test.ts
npm run typecheck
```

Expected: route, fallback, and type tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/monitoring/snapshot-service.ts src/app/api/monitoring/snapshot/route.ts tests/integration/monitoring
git commit -m "feat: add monitoring operations snapshot"
```

---

### Task 7: Add Snapshot, Realtime, and Controller Hooks

**Files:**
- Create: `src/app/(admin)/monitoring/_hooks/use-monitoring-snapshot.ts`
- Create: `src/app/(admin)/monitoring/_hooks/use-monitoring-realtime.ts`
- Create: `src/app/(admin)/monitoring/_hooks/use-monitoring-controller.ts`
- Test: `tests/ui/monitoring/realtime-health.test.tsx`
- Test: `tests/unit/monitoring/filters.test.ts`

- [ ] **Step 1: Write failing hook tests**

Assert that snapshot polling uses `15_000` ms, preserves the last successful payload after an error, and marks it stale. Assert that Realtime status changes from connected to degraded without triggering a snapshot per location event. Assert KPI selection replaces the active filter and incident selection sets one selected entity.

- [ ] **Step 2: Implement `useMonitoringSnapshot`**

Use TanStack Query with:

```ts
useQuery({
  queryKey: ['monitoring-snapshot', filter],
  queryFn: () => fetchMonitoringSnapshot(filter),
  refetchInterval: 15_000,
  placeholderData: (previous) => previous,
  retry: 1,
});
```

The fetch uses `POST`, `credentials: 'same-origin'`, `cache: 'no-store'`, and throws a typed error containing only status and safe message.

- [ ] **Step 3: Implement location-only Realtime patches**

Subscribe only to `riders`. Publish `{ riderId, latitude, longitude, speed, course, receivedAt }` patches and connection health. Do not subscribe to all orders and do not invalidate the snapshot on every patch.

- [ ] **Step 4: Implement one controller state**

The controller owns `filter`, `selectedEntity`, and methods `selectKpi`, `selectIncident`, `selectOrder`, `selectRider`, and `clearSelection`. Avoid duplicated selected rider state inside the map.

- [ ] **Step 5: Verify hooks**

```bash
npx vitest run tests/unit/monitoring/filters.test.ts tests/ui/monitoring/realtime-health.test.tsx
```

Expected: polling, stale retention, Realtime degradation, and controller tests pass.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/monitoring/_hooks" tests/unit/monitoring/filters.test.ts tests/ui/monitoring/realtime-health.test.tsx
git commit -m "feat: add monitoring data controller"
```

---

### Task 8: Build the Compact Operations Summary

**Files:**
- Create: `src/app/(admin)/monitoring/_components/monitoring-kpi-card.tsx`
- Create: `src/app/(admin)/monitoring/_components/operations-summary.tsx`
- Create: `src/app/(admin)/monitoring/_components/data-health-banner.tsx`
- Create: `src/app/(admin)/monitoring/_components/monitoring-filters.tsx`
- Test: `tests/ui/monitoring/operations-summary.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Render all eight labels and values. Click `Sin asignar` and assert `onSelect('unassigned')`. Assert only warning/critical cards use amber/red styling. Assert stale and degraded banners expose the snapshot age and do not hide existing values.

- [ ] **Step 2: Implement accessible KPI buttons**

Use actual `<button>` elements or `Button` wrappers, not clickable `<div>` elements. Each card receives:

```ts
type MonitoringKpiCardProps = {
  label: string;
  value: number;
  tone: 'neutral' | 'warning' | 'critical';
  selected: boolean;
  onClick: () => void;
};
```

Render a responsive grid: eight columns on wide desktop, four on medium screens, and two on mobile.

- [ ] **Step 3: Implement data-health and filters**

The banner says `Datos degradados` when Realtime is disconnected and `Datos desactualizados` after snapshot failure. Filters cover priority, zone, order status, and bounded search. Display `Actualizado hace …` using the server timestamp.

- [ ] **Step 4: Verify the summary UI**

```bash
npx vitest run tests/ui/monitoring/operations-summary.test.tsx
```

Expected: rendering, filters, tones, and accessibility assertions pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/monitoring/_components" tests/ui/monitoring/operations-summary.test.tsx
git commit -m "feat: add compact monitoring summary"
```

---

### Task 9: Build the Incident Queue and Context Controls

**Files:**
- Create: `src/app/(admin)/monitoring/_components/incident-queue.tsx`
- Create: `src/app/(admin)/monitoring/_components/context-panel.tsx`
- Create: `src/app/(admin)/monitoring/_components/context-drawer.tsx`
- Create: `src/app/(admin)/monitoring/_components/sensitive-action-dialog.tsx`
- Create: `src/app/api/monitoring/incidents/[id]/route.ts`
- Test: `tests/ui/monitoring/sensitive-action-dialog.test.tsx`
- Test: `tests/integration/monitoring/incidents-route.test.ts`

- [ ] **Step 1: Write failing ordering and dialog tests**

Assert P1 before P2 before P3, then oldest `firstDetectedAt` first. Assert the sensitive dialog displays entity, before/after values, disables confirmation for a blank reason, and trims a valid reason. Assert `request_close` leaves a still-active condition in `attending`.

- [ ] **Step 2: Implement the incident route**

Validate a discriminated body:

```ts
z.discriminatedUnion('action', [
  z.object({ action: z.literal('attend') }),
  z.object({ action: z.literal('request_close'), reason: z.string().trim().min(3).max(300) }),
]);
```

Require admin session, reload the incident and current condition, update only valid transitions, derive the actor from the cookie, and return `409` when the incident changed concurrently.

- [ ] **Step 3: Implement desktop and mobile context**

Use the same context content in a fixed desktop panel and a shadcn `Sheet` on narrow screens. Immediate actions are map focus, rider/order links, location request, phone and WhatsApp. Sensitive actions open the reason dialog.

- [ ] **Step 4: Verify queue and context**

```bash
npx vitest run tests/ui/monitoring/sensitive-action-dialog.test.tsx tests/integration/monitoring/incidents-route.test.ts
```

Expected: ordering, transitions, required reason, and responsive shared content pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/monitoring/_components" "src/app/api/monitoring/incidents/[id]/route.ts" tests/ui/monitoring/sensitive-action-dialog.test.tsx tests/integration/monitoring/incidents-route.test.ts
git commit -m "feat: add monitoring incident controls"
```

---

### Task 10: Coordinate the Operations Map and Active Orders

**Files:**
- Create: `src/app/(admin)/monitoring/_components/operations-map.tsx`
- Create: `src/app/(admin)/monitoring/_components/active-orders-table.tsx`
- Create: `src/app/(admin)/monitoring/_components/rider-history-panel.tsx`
- Create: `src/app/api/monitoring/history/route.ts`
- Modify: `src/app/(admin)/monitoring/live-map.tsx`
- Test: `tests/ui/monitoring/operations-map.test.tsx`
- Test: `tests/integration/monitoring/history-route.test.ts`

- [ ] **Step 1: Write failing controlled-selection tests**

Assert that selecting an incident focuses its rider/order, selecting a marker calls the parent callback, a realtime patch changes only the matching marker, and user camera interaction prevents automatic `fitBounds` until reset.

- [ ] **Step 2: Extract the reusable map behavior**

Keep the stable loader ID:

```ts
id: 'hi-delivery-monitoring-google-maps'
```

Keep clustering, heading, history polyline and playback. Replace internal `selectedRider` with a controlled `selectedEntity`. Validate coordinates by `typeof value === 'number'`, not truthiness. Memoize static options and stop animating all riders on every frame; interpolate only changed rider IDs.

- [ ] **Step 3: Add order context without clutter**

Show pickup/delivery markers only for filtered or selected orders. Clusters represent riders at low zoom. A selected incident may draw the related order path, but the map must not render all order paths simultaneously.

- [ ] **Step 4: Protect and extract history**

Create `POST /api/monitoring/history` with an admin-session guard and a Zod body containing `riderId`, `startAt`, and `endAt`. Reject reversed ranges and ranges longer than seven days, order by `recorded_at`, and cap the response at 5,000 points. Move existing history playback into `rider-history-panel.tsx` and replace its direct browser Supabase query with this endpoint. The active-orders table shows order ID, status, rider, zone, elapsed time, and risk; selecting a row updates the shared controller.

- [ ] **Step 5: Verify and commit**

```bash
npx vitest run tests/ui/monitoring/operations-map.test.tsx tests/integration/monitoring/history-route.test.ts
npm run typecheck
```

Expected: selection, coordinate, camera, and patch tests pass.

```bash
git add "src/app/(admin)/monitoring/_components" "src/app/(admin)/monitoring/live-map.tsx" src/app/api/monitoring/history/route.ts tests/ui/monitoring/operations-map.test.tsx tests/integration/monitoring/history-route.test.ts
git commit -m "feat: coordinate monitoring map and orders"
```

---

### Task 11: Compose the Operations Desk

**Files:**
- Create: `src/app/(admin)/monitoring/_components/monitoring-operations-desk.tsx`
- Modify: `src/app/(admin)/monitoring/page.tsx`
- Test: `tests/ui/monitoring/operations-desk.test.tsx`
- Test: `tests/ui/monitoring/responsive-context.test.tsx`

- [ ] **Step 1: Write the end-to-end component test**

With a mocked snapshot, assert:

1. Eight KPIs render.
2. Clicking `En riesgo` filters incidents and orders.
3. Clicking an incident selects the same rider/order in map and context.
4. A location patch changes the marker without clearing the selection.
5. Snapshot failure retains values and displays stale state.

- [ ] **Step 2: Compose the approved three-area layout**

`MonitoringOperationsDesk` owns hooks and composes summary, filters, queue, map, context and active orders. Keep business rules out of this component. Preserve the existing live/history mode.

- [ ] **Step 3: Reduce `page.tsx` to an entry point**

The final page should be:

```tsx
"use client";

import { MonitoringOperationsDesk } from './_components/monitoring-operations-desk';

export default function MonitoringPage() {
  return <MonitoringOperationsDesk />;
}
```

- [ ] **Step 4: Verify desktop and mobile layouts**

```bash
npx vitest run tests/ui/monitoring/operations-desk.test.tsx tests/ui/monitoring/responsive-context.test.tsx
npm run lint
npm run typecheck
```

Expected: UI tests, lint, and typecheck pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/monitoring" tests/ui/monitoring
git commit -m "feat: build monitoring operations desk"
```

---

### Task 12: Protect Immediate Actions and Audit Sensitive Actions

**Files:**
- Create: `src/lib/monitoring/action-service.ts`
- Create: `src/lib/monitoring/dispatch-service.ts`
- Create: `src/app/api/monitoring/actions/route.ts`
- Modify: `src/app/api/push/location-request/route.ts`
- Modify: `src/app/(admin)/orders/[id]/page.tsx`
- Test: `tests/integration/monitoring/actions-route.test.ts`
- Test: `tests/integration/monitoring/action-audit.test.ts`

- [ ] **Step 1: Write failing authorization, concurrency, and audit tests**

Cover `request_location`, `pause_rider`, `change_rider_zone`, and `reassign_order`. Assert sensitive actions require a 3–300 character reason, use the actor from the cookie, reject stale state with `409`, write success/failure audit rows, and never include coordinates, tokens, or password fields.

- [ ] **Step 2: Extract dispatch with all current fallbacks**

Move the logic currently in `tryDispatchOrderRpc`, `handleRedispatchFallback`, `handleRedispatch`, and `handleManualAssign` from `orders/[id]/page.tsx` into `dispatch-service.ts`. Preserve RPC attempts in this order:

```ts
{ order_id_in: orderId }
{ p_order_id: orderId }
{ order_id: orderId }
```

Only treat known missing-function/signature errors as fallback triggers. Preserve settings, radius, zone, capacity, rejection and notification behavior. Re-read order state before mutation and return a conflict for incompatible state changes.

- [ ] **Step 3: Implement a discriminated action route**

Use Zod variants:

```ts
request_location: { riderId }
pause_rider: { riderId, expectedActive, reason }
change_rider_zone: { riderId, expectedZoneId, zoneId, reason }
reassign_order: { orderId, expectedRiderId, riderId, reason }
```

Require admin session for every variant. For immediate location requests, return primary action success separately from best-effort push delivery.

- [ ] **Step 4: Write append-only audit entries**

For every sensitive attempt, insert one `monitoring_action_log` row with actor, entity IDs, sanitized before/after fields, reason, result and a safe error category. If primary mutation succeeds but push fails, keep `result = success` and return a communication warning.

- [ ] **Step 5: Protect the existing location-request endpoint**

Add `requireAdminOperationSession()` to `src/app/api/push/location-request/route.ts`, or replace direct UI use with the monitoring action route and retain the old endpoint only for authenticated compatibility.

- [ ] **Step 6: Move order details onto the shared server action**

Replace direct browser dispatch mutations in `orders/[id]/page.tsx` with the protected action endpoint. Preserve existing confirmations and refresh behavior.

- [ ] **Step 7: Verify actions**

```bash
npx vitest run tests/integration/monitoring/actions-route.test.ts tests/integration/monitoring/action-audit.test.ts
npm run lint
npm run typecheck
```

Expected: authorization, conflict, fallback, audit, lint, and typecheck pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/monitoring/action-service.ts src/lib/monitoring/dispatch-service.ts src/app/api/monitoring/actions/route.ts src/app/api/push/location-request/route.ts "src/app/(admin)/orders/[id]/page.tsx" tests/integration/monitoring
git commit -m "feat: add audited monitoring actions"
```

---

### Task 13: Verify Scale, Failure Modes, and User Flow

**Files:**
- Create: `tests/scale/monitoring/snapshot-scale.test.ts`
- Create: `tests/e2e/monitoring.spec.ts`
- Modify: `CODEX.md` if observed behavior differs from documentation

- [ ] **Step 1: Add the deterministic scale fixture**

Generate 500 normalized riders and 1,000 active orders in memory with fixed timestamps and IDs. Measure only domain/snapshot construction with mocked repository I/O; assert completion below 2 seconds and stable KPI totals.

- [ ] **Step 2: Add the monitoring E2E flow**

Test authenticated admin flow:

1. Open `/monitoring`.
2. Confirm eight KPI cards and live timestamp.
3. Filter `Sin asignar`.
4. Select a critical incident.
5. Confirm map/context identify the same rider/order.
6. Request location.
7. Open a sensitive action, verify blank reason is rejected, and cancel without mutation.
8. Emulate mobile width and verify the context opens as a drawer.

Use seeded test data or route fixtures; never point destructive E2E actions at production.

- [ ] **Step 3: Verify degradation behavior**

In component/integration tests, disconnect the mocked Realtime channel and fail one snapshot. Assert `Datos degradados`, retained last values, age indicator, and successful recovery on the next snapshot.

- [ ] **Step 4: Run the complete verification suite**

```bash
npm run test:unit
npm run test:integration
npm run test:ui
npm run test:scale
npx playwright install chromium
npm run test:e2e
npm run lint
npm run typecheck
git diff --check
```

Expected: all tests pass, scale test is below 2 seconds, lint/typecheck report no errors, and diff check is clean. Do not use `npm run build` as a substitute because `next.config.ts` ignores lint and TypeScript build errors.

- [ ] **Step 5: Review security and privacy manually**

Confirm:

- No sensitive API accepts actor/user role from request body.
- No state-changing API trusts `hid-session`.
- No audit row contains credentials, hashes, tokens, full push payloads, or precise location history.
- Push and WhatsApp failures never roll back a successful primary mutation.
- Legacy dispatch fallbacks remain present and covered.
- No monitoring migration depends on `pg_cron`.

- [ ] **Step 6: Commit**

```bash
git add tests/scale/monitoring/snapshot-scale.test.ts tests/e2e/monitoring.spec.ts CODEX.md
git commit -m "test: verify monitoring operations control"
```

---

## Deployment Order

1. Apply `20260825100000_admin_web_sessions.sql` and `20260825101000_monitoring_operations_control.sql` to the configured Supabase schema.
2. Set no new secret: opaque session tokens are random and only hashes are stored.
3. Deploy the web application after migrations succeed.
4. Sign in again once so the browser receives the new `HttpOnly` cookie.
5. Verify snapshot health and disabled rules before enabling sensitive controls for operations.
6. Monitor `401`, `403`, `409`, snapshot latency, incident volume, and communication warnings without logging personal location data.

## Explicit Deferrals

- Multi-monitorist assignment and handoff.
- Automatic cancellation or disciplinary actions.
- Rider rankings and compensation metrics.
- A late-delivery rule until an expected delivery timestamp is persisted per order.
- Removal of any legacy dispatch fallback.
- `pg_cron` or a database scheduler.
