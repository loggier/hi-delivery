# Rider Order Access Isolation Implementation Plan

> **For agentic workers:** Implement server authorization before changing client presentation. Do not use a UI filter as an access-control boundary.

**Goal:** Ensure a rider can retrieve and mutate only orders assigned to their rider ID and eligible unassigned orders explicitly dispatched to them.

**Architecture:** Extend the existing HMAC rider access-token system with a distinct orders scope. The web server derives the rider ID from that verified token and uses the service-role client for scoped reads/actions. Flutter uses a dedicated order API client, removes broad `orders` Realtime subscriptions, and only renders server-authorized responses. Existing location-write tokens and dispatch fallbacks remain compatible.

**Tech Stack:** Next.js App Router, Supabase service role, HMAC-SHA256 scoped tokens, Zod, Flutter/Dart HTTP client, secure storage.

## Files and responsibilities

### Web

- `src/lib/rider-location-token.ts`: add a distinct rider-orders access token type and verifier without broadening the location-ingest scope.
- `src/app/api/rider-auth/token/route.ts`: issue an orders token after the existing phone/password verification.
- `src/app/api/rider-auth/refresh/route.ts`: renew location and orders tokens for the same rider/device.
- `src/app/api/rider-orders/route.ts`: active, pending, history, and earnings reads, all scoped to token rider ID.
- `src/app/api/rider-orders/[id]/route.ts`: safe fetch of assigned order or eligible unassigned dispatched order.
- `src/app/api/rider-orders/actions/route.ts`: accept, reject, status progression, completion, and failure report with server-derived rider ID and CAS predicates.
- `supabase/migrations/20261001090000_rider_order_access.sql`: remove any known broad anonymous `orders` policy only after confirming the admin-web read path remains supported; document deployment dependency and policy compatibility.

### Flutter

- `lib/services/session_manager.dart`: secure storage for orders access token and expiry.
- `lib/services/rider_auth_service.dart`: persist/renew orders token alongside existing location token.
- `lib/services/rider_orders_api.dart`: authenticated API client with one refresh-and-retry on 401.
- `lib/services/order_assignment_service.dart`: route list/detail/accept/reject/advance operations through API.
- `lib/screens/orders_screen.dart`: remove global `orders` and `order_rejections` subscriptions; use scoped refresh.
- `lib/screens/home_screen.dart`: replace pending-status-wide Realtime with polling of eligible unassigned orders.
- `lib/widgets/order_details_sheet.dart`: remove whole-table subscription; refresh via scoped detail endpoint.
- `lib/screens/history_screen.dart`, `earnings_screen.dart`: read only rider-scoped server data.
- `lib/screens/map_screen.dart`: preserve own-rider status updates through the scoped action API.

## Security invariants

1. No endpoint accepts `riderId` as authority from query/body; it is always derived from the verified orders token.
2. `active` and `history` rows require `orders.rider_id = token.riderId`.
3. `pending` rows require `status = pending_acceptance`, `rider_id IS NULL`, no prior rejection, not exhausted/expired, and rider membership in the active wave (or legacy notified list fallback).
4. Detail reads apply the same assigned-or-eligible-pending rule; missing/foreign rows return 404.
5. Mutations re-read and conditionally update current status/rider assignment in the same server operation; stale requests return 409.
6. No rider client subscribes to all orders or all rejections. Client-side filtering is defense-in-depth only.
7. Existing `rider_location:write` tokens remain limited to location ingestion.
8. Never log tokens, full order rows, customer phone/address, or coordinates.

## Implementation sequence

1. Add and issue the distinct orders token; keep existing location token behavior unchanged.
2. Implement scoped read endpoints, including legacy dispatch membership fallbacks.
3. Implement scoped action endpoints with server-side CAS and existing RPC/direct dispatch compatibility.
4. Add Flutter token persistence, refresh, and order API client.
5. Replace each direct order read/mutation and broad Realtime subscription.
6. Review anon/RLS policies and web-admin compatibility before applying any policy that changes access to `orders`.
7. Review all remaining Flutter `orders` table references and confirm each is server-authorized or has a rider predicate.
8. Format and perform syntax/analyzer checks as requested; do not stage unrelated local files or keystores.

## Deployment and rollout

1. Deploy web endpoints/token issuance first.
2. Install the Flutter build that stores the orders token.
3. Verify a rider can see their assigned orders and only pending unassigned orders dispatched to them.
4. Verify a second rider's assigned order returns 404 even when its ID is supplied directly.
5. Review actual production RLS policies before revoking anonymous web access; the current web admin uses custom auth and browser Supabase reads, so a broad-policy change must not silently break admin operations.

## Validation

- Verify syntax and formatting of changed files.
- Verify API boundaries manually for missing token, foreign order ID, unassigned eligible order, expired dispatch, rejected rider, and stale mutation.
- Run Flutter analyzer and focused server checks only when requested; never claim tests passed if not run.
