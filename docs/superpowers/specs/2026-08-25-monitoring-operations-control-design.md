# Monitoring Operations Control Design

**Date:** 2026-08-25
**Status:** Approved design
**Scope:** Web admin panel `/monitoring`

## Objective

Turn `/monitoring` into an operations desk capable of supervising hundreds of riders and active orders. The monitorist should work by exception: the panel surfaces the small set of cases that require attention instead of requiring manual inspection of every rider.

The order is the operational priority. Riders are the resources assigned to fulfill those orders.

## Success Criteria

- A monitorist can understand the current operation in less than 10 seconds.
- Critical incidents are ordered ahead of routine information.
- Selecting a KPI or incident synchronizes the list, map, active orders, and detail panel.
- Sensitive changes require confirmation, a reason, server-side authorization, and an audit record.
- The panel remains usable if Supabase Realtime disconnects.
- An operational snapshot completes in less than 2 seconds with a test dataset of at least 500 riders and 1,000 active orders.

## Layout

### Compact Operations Summary

The top of the page contains eight compact, clickable KPI cards:

1. **Open orders:** orders in non-terminal operational statuses.
2. **Unassigned:** `pending_acceptance` orders without `rider_id`.
3. **On the way:** orders in `picked_up`, `on_the_way`, or `arrived_at_destination`.
4. **At risk:** active orders matching at least one critical risk rule.
5. **Riders online:** riders with a location report from the last 10 minutes that are available for orders or have an active order.
6. **Available:** online riders without an active order.
7. **Occupied:** riders with one or more active orders.
8. **No signal:** riders marked available or occupied without a location report from the last 10 minutes.

Clicking a card applies its filter to incidents, map markers, and the active-order list. Normal metrics use neutral styling. Warning and critical metrics use amber and red only when attention is required.

### Main Workspace

The live workspace uses three coordinated areas:

- **Incident queue:** ordered by severity and age.
- **Map:** clustered rider markers and the orders related to the current filter or incident.
- **Context panel:** selected order, rider, incident reason, timestamps, and available actions.

An active-order list remains available below the workspace with filters for zone, state, risk, and rider. On narrower displays, the context panel becomes a drawer so the map and incident queue remain usable.

## Operational Rules

### Order Statuses

Open orders use the canonical non-terminal lifecycle statuses. Terminal statuses are `completed`, `delivered`, `cancelled`, `refunded`, and `failed`. The existing legacy equivalence between `completed` and `delivered` is preserved, and legacy active values such as `out_for_delivery` remain operationally visible when present.

### Initial Risk Thresholds

- **Unassigned critical:** no rider after 7 minutes.
- **Active-order GPS critical:** assigned rider has no location report after 10 minutes.
- **Stopped in transit critical:** rider has not moved meaningfully for 15 minutes while the order is in transit.
- **Dispatch exhausted:** assignment attempts are exhausted or `assignment_exhausted_at` is present.
- **Late delivery:** the active order exceeds its expected delivery time when that value is available.

Thresholds must be stored in `system_settings` and read by the server. They must not be hardcoded in the React page. Missing optional schema fields must degrade safely and preserve existing legacy dispatch fallbacks.

### Incident Priority

- **P1 Critical:** an active order is blocked or likely to fail, including dispatch exhaustion, prolonged lack of assignment, missing GPS during fulfillment, prolonged stop in transit, or late delivery.
- **P2 Attention:** a rider is outside the expected zone, has repeated rejections, has irregular location reporting, or is stopped without an immediately critical order impact.
- **P3 Informational:** an inactive rider, a rider without an order, or another condition that does not currently threaten fulfillment.

Within each priority, older incidents appear first.

## Actions

### Immediate Actions

The following actions do not alter operational state and do not require confirmation:

- Center the map on a rider or order.
- Open rider details.
- Open order details.
- Request a fresh location report.
- Start a phone call.
- Open WhatsApp.

### Confirmed Actions

The following actions require a confirmation dialog and a short reason:

- Pause rider availability.
- Change the rider's zone.
- Reassign an order.

The confirmation must state the exact rider, order when applicable, current value, and resulting value. Order reassignment must use the existing dispatch flow and preserve legacy RPC/direct-update fallbacks until the production schema is confirmed.

Push and WhatsApp remain best-effort and never block the primary database change. A failed primary action must not be shown as successful.

## Incident Lifecycle

Incidents use these states:

- `open`: the condition exists and has not been handled.
- `attending`: the monitorist is reviewing or acting on it.
- `resolved`: the condition disappeared and the server confirmed that it is no longer active.

The first release assumes one monitorist, so incidents are not assigned to individual operators. The model must still retain the acting user ID for audit purposes.

The server reconciles detected conditions with persisted incidents. An active condition creates or updates its incident. A condition that no longer exists is resolved automatically with `condition_cleared` as the resolution source. A monitorist may request closure with a reason, but a condition that remains active stays `attending` rather than disappearing. If a resolved condition recurs later, it inserts a new incident cycle instead of rewriting the previous history.

## Data Model

### `monitoring_incidents`

The versioned SQL migration adds a table containing:

- Incident ID and deterministic condition key.
- Incident type and priority.
- Optional rider ID and order ID.
- Status.
- First detected and last detected timestamps.
- Attending and resolved timestamps.
- Acting user ID.
- Resolution source and optional reason.
- Structured, non-sensitive condition metadata.

The condition key and active status need indexes that support deduplication and priority/age queries. A partial unique index permits only one `open` or `attending` row per condition key while retaining all resolved cycles.

### `monitoring_action_log`

The versioned SQL migration adds an append-only audit table containing:

- Action ID and action type.
- Acting user ID.
- Optional rider ID, order ID, and incident ID.
- Required reason for sensitive actions.
- Result (`success` or `failed`) and a safe error category.
- Before and after values for changed operational fields.
- Creation timestamp.

Tokens, password hashes, credentials, full push payloads, and precise location history must not be written to this log.

Database changes must be documented in `CODEX.md` or the equivalent database documentation.

## Server Interfaces

### Operational Snapshot

A protected monitoring snapshot endpoint returns:

- Server timestamp and data-health status.
- Current KPI counts.
- Ordered active incidents.
- Active orders needed by the current filter.
- Relevant rider summaries and current positions.
- Effective thresholds used for the calculation.

The endpoint queries only active operational data and must not load all historical orders. It performs incident reconciliation server-side.

### Operational Actions

Protected action endpoints validate:

- A server-verifiable authenticated session.
- An authorized administrative role.
- Required entity IDs and reason.
- Current database state before applying the change.

Sensitive actions must not trust the client-side `hid-session` value by itself. If the existing authentication flow cannot prove the role server-side, secure operation authorization is a prerequisite to enabling state-changing controls.

## Update Strategy

- Rider marker positions continue to update through Supabase Realtime.
- KPI and incident snapshots refresh every 15 seconds.
- A successful or failed operational action triggers an immediate snapshot refresh.
- High-frequency rider location events must not trigger a complete snapshot request each time.
- The UI displays the server snapshot timestamp and connection health.
- If Realtime disconnects, the panel displays `Datos degradados` and continues snapshot polling.
- When Realtime recovers, the UI reconciles with the next authoritative snapshot.

## Error Handling

- Snapshot failure retains the last successful data and clearly marks it stale.
- Action failure keeps the incident visible and displays a specific, non-sensitive message.
- Notification failure is shown as a communication warning, separate from primary action success.
- Missing optional dispatch or location columns disable only the dependent rule or action and do not break the panel.
- Concurrent data changes are detected server-side; stale actions are rejected and the panel refreshes the selected case.

## Testing

### Unit Tests

- Every KPI definition.
- Every incident rule and priority.
- Boundary conditions at 7, 10, and 15 minutes.
- Incident recurrence and automatic resolution.
- Canonical and legacy order terminal statuses.

### API Tests

- Snapshot filtering and aggregation.
- Authorization and role rejection.
- Confirmation-reason validation.
- Audit records for successful and failed actions.
- Missing optional schema fields and dispatch fallbacks.

### UI Tests

- KPI click filters incidents, map, and active orders.
- Incident selection opens the matching context.
- Confirmation dialogs identify affected entities and resulting changes.
- Realtime degradation and recovery states.
- Responsive context drawer behavior.

### Scale Test

Use at least 500 riders and 1,000 active orders. Verify snapshot response below 2 seconds, clustered map usability, stable rendering, and no request storm from location updates.

## Delivery Sequence

1. Add server-verifiable operation authorization if it is not already available.
2. Add settings, incident, and audit migrations with indexes and documentation.
3. Implement and test incident rules and the operational snapshot endpoint.
4. Add the compact KPI strip and synchronized filters.
5. Add the incident queue and coordinated map/context selection.
6. Add immediate actions.
7. Add confirmed state-changing actions and audit history.
8. Run scale, failure-mode, lint, typecheck, and focused E2E verification.

## Out of Scope

- Multiple-monitorist assignment, ownership, and handoff.
- Automated disciplinary actions against riders.
- Rider performance ranking or compensation metrics.
- Automatic order cancellation.
- Removal of existing legacy dispatch fallbacks.
