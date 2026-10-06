# Business Integrations API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each business one manageable API key and a documented, versioned API to list, inspect, and create only its own orders.

**Architecture:** Keep the new integration API separate from panel authentication and existing POS/Shipping routes. Store only a digest of a random API key, derive business scope server-side, and use a transaction-safe Postgres RPC for client resolution, idempotency, and order creation. Add an owner-only profile console and an OpenAPI-backed Stoplight-style reference.

**Tech Stack:** Next.js 15 App Router, TypeScript, Zod, Supabase/Postgres in schema `grupohubs`, Vitest, existing shadcn/ui and TanStack Query.

---

## Scope and implementation order

The feature has three coupled deliverables: key lifecycle, integration order API, and business-facing docs/profile. Each task below leaves a testable unit; do not ship external order routes before key management and business scoping tests pass.

Before editing, run `git status --short --branch` in the web worktree and preserve unrelated changes. Keep changes limited to the files listed below and update `CODEX.md` after implementation. Do not change `/api/auth/sign-in`, `users.password`, rider APIs, POS or Shipping contracts.

## File map

**Database**
- Create via `supabase migration new business_integrations_api` and edit the generated `supabase/migrations/<timestamp>_business_integrations_api.sql`:
  - `business_api_keys`: business FK, unique key digest, display prefix, enabled flag, creator, created/last-used/revoked timestamps; RLS on, no access for `PUBLIC`/`anon`/`authenticated`, service-role only.
  - `business_api_idempotency`: business ID, digest of idempotency header, canonical request hash, resulting order ID and timestamp; unique `(business_id, idempotency_key_hash)`.
  - `business_api_rate_limits`: UUID event rows with API-key ID and request timestamp; indexed by `(api_key_id, requested_at DESC)`.
  - `consume_business_api_rate_limit(...)`: serialized rolling 60-second event window, allowing at most 60 requests per key.
  - `rotate_business_api_key(...)`: revoke current non-revoked key and insert the replacement in one transaction, preventing partial rotations under the partial unique index.
  - `create_business_api_order(...)`: transaction-safe idempotency lock/check, find-or-create customer scoped by business/normalized phone, call `create_order_with_items`, persist idempotency mapping, and return the resulting order. Use invoker security and grant execution only to `service_role`; do not create an unauthenticated `SECURITY DEFINER` function.

**Server integration modules and routes**
- Create `src/lib/business-integrations/api-key.ts`: cryptographic generation, prefix/hash, constant generic auth failure, resolution of enabled key/business, last-used update.
- Create `src/lib/business-integrations/api-key-management.ts`: require a signed-in active owner, resolve linked business from `users.id`, accept `owen-business` and the existing `role-owner` alias, and enforce no caller-provided business scope.
- Create `src/lib/business-integrations/orders.ts`: Zod contracts, decimal monetary arithmetic, cursor encode/decode, explicit public order DTO, safe error mapping.
- Create `src/app/api/business-integrations/key/route.ts`: owner-only `GET`, `POST` (create or rotate; atomically revoke old key), `PATCH` (`{ enabled: boolean }`), and `DELETE` (revoke). Never return a digest.
- Create `src/lib/business-integrations/api-auth.ts`: parse Bearer header, authenticate enabled key, enforce active business, rate limit and update last-used without logging secrets.
- Create `src/app/api/v1/orders/route.ts`: `GET` list and `POST` create.
- Create `src/app/api/v1/orders/[id]/route.ts`: scoped `GET` detail; cross-business and missing IDs both return `404`.

**Profile and docs**
- Create `src/lib/business-integrations/openapi.ts`: the checked-in OpenAPI 3.1 contract for the three public routes, shared schemas, auth and error responses.
- Create `src/app/(admin)/profile/business-integrations-card.tsx`: key status, create/rotate confirmation, one-time secret display/copy, toggle and revoke controls.
- Create `src/app/(admin)/profile/business-api-reference.tsx`: Stoplight-style sidebar/content/code-sample reference driven by OpenAPI.
- Modify `src/app/(admin)/profile/page.tsx`: render these only for active business owner role (`owen-business` and alias `role-owner`) with a linked `business_id`.
- Modify `CODEX.md`: record endpoints, migration and deployment sequence.

**Tests**
- Create unit tests under `tests/unit/business-integrations/` for key digest/generation, decimal math, cursor validation, DTO sanitization, and OpenAPI completeness.
- Create route tests under `tests/integration/business-integrations/` for owner key management, auth failures, scope isolation, list/detail, rate limiting, and order creation/idempotency.
- Create UI tests under `tests/ui/business-integrations/` for owner-only rendering, one-time key display, enable/disable, and docs navigation/examples.
- Create `tests/unit/business-integrations/migration-contract.test.ts` to assert expected tables/indexes/grants/RPCs and prohibit plaintext-key columns or public execution grants.

---

### Task 1: Database primitives, atomic creation, idempotency and rate limiting

**Files:**
- Create: CLI-generated `supabase/migrations/<timestamp>_business_integrations_api.sql`
- Create: `tests/unit/business-integrations/migration-contract.test.ts`

- [ ] **Step 1: Write migration contract tests first**

Add tests that load the generated migration from `supabase/migrations` and assert it contains all three tables, RLS and service-role-only grants, unique business/idempotency indexes, the rolling-window rate-limit routine, transaction-safe order routine, and execute revocations. Assert there are no plaintext key columns or public function execute grants.

- [ ] **Step 2: Run the contract test and verify RED**

Run: `npm run test -- tests/unit/business-integrations/migration-contract.test.ts`
Expected: FAIL because the migration and test file do not exist yet.

- [ ] **Step 3: Generate the versioned migration using Supabase CLI**

Run: `supabase migration new business_integrations_api`
Expected: one new timestamped SQL file under `supabase/migrations/`. Do not use MCP `apply_migration` for local iteration; do not apply remotely during implementation.

- [ ] **Step 4: Implement private key, idempotency and rate-limit tables**

Use schema `grupohubs`; reference `businesses(id)` and key ID with foreign keys. Enable RLS. Revoke all from `PUBLIC`, `anon`, and `authenticated`; grant only needed operations to `service_role`. Keep API key metadata distinct from any plaintext secret. Add a partial unique index on `business_id WHERE revoked_at IS NULL` and a unique idempotency index on `(business_id, idempotency_key_hash)`.

- [ ] **Step 5: Implement atomic rate-limit counter**

The function acquires a transaction advisory lock per key, deletes that key's events older than 60 seconds, counts events in the rolling 60-second window, rejects without inserting when there are already 60, and otherwise inserts one event. Revoke execute from `PUBLIC`, `anon`, and `authenticated`; grant it only to `service_role`.

- [ ] **Step 6: Implement transactional order/idempotency RPC**

The RPC takes server-derived business ID, normalized idempotency digest, canonical request hash, validated customer/order fields and item JSON. Acquire `pg_advisory_xact_lock(hashtextextended(business_id || ':' || idempotency_digest, 0))`; look up the idempotency record; same hash returns the already-created order, different hash returns a recognizable conflict. On a new request, find a customer only by normalized phone plus the same business ID, otherwise insert it; call existing `create_order_with_items` with derived pickup address, server-calculated subtotal/total, `pending_acceptance`, null product IDs and item descriptions; then store the order ID and request hash. The RPC transaction must roll back the new customer/order/idempotency row together on failure. Use invoker security; grant execute only to `service_role`.

- [ ] **Step 7: Run migration contract tests and inspect SQL diff**

Run: `npm run test -- tests/unit/business-integrations/migration-contract.test.ts`
Expected: PASS. Review generated SQL for syntax, function signatures, grants, unique-index behavior and role/schema qualification before any database application.

- [ ] **Step 8: Implement and contract-test atomic key rotation RPC**

`rotate_business_api_key(business_id, new_digest, new_prefix, actor_user_id)` must revoke the currently live key and insert the new disabled key in one transaction. Restrict execution to `service_role`. Add assertions to the migration contract test for both revocation and replacement insert and its execute grants.

Run: `npm run test -- tests/unit/business-integrations/migration-contract.test.ts`
Expected: PASS with key-rotation RPC covered.

- [ ] **Step 9: Commit database primitives**

```bash
git add supabase/migrations tests/unit/business-integrations/migration-contract.test.ts
git commit -m "feat: add business integration database primitives"
```

### Task 2: API key generation, owner authorization and key lifecycle routes

**Files:**
- Create: `src/lib/business-integrations/api-key.ts`
- Create: `src/lib/business-integrations/api-key-management.ts`
- Create: `src/app/api/business-integrations/key/route.ts`
- Create: `tests/unit/business-integrations/api-key.test.ts`
- Create: `tests/integration/business-integrations/key-route.test.ts`
- Modify: `src/lib/auth/admin-session.ts` only if needed to share database-derived business identity without changing login behavior

- [ ] **Step 1: Write API-key unit tests first**

Cover 32-byte cryptographically random key generation, required `hid_live_` prefix, stable SHA-256 digest, display prefix that does not reveal the secret, and distinct digest for separate generated keys. Mock randomness only at the generator boundary.

- [ ] **Step 2: Run unit test and verify RED**

Run: `npm run test -- tests/unit/business-integrations/api-key.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement key utility**

Use `node:crypto` `randomBytes(32)` and SHA-256. Do not modify `/api/auth/sign-in` or its `users.password` flow.

- [ ] **Step 4: Write key-route tests first**

Test `GET` returns only key ID/prefix/enabled/created/last-used metadata, owner without business gets `403`, `POST` returns secret only once and persists only digest, `POST` rotation revokes old key, `PATCH` changes only enabled status, `DELETE` revokes, and admin/rider/unlinked owner cannot manage keys. Include `owen-business` role fixture.

The route's mocked session resolver must return database-derived `userId`, role and business link. Verify the route never trusts `business_id` from query/body.

- [ ] **Step 5: Run route test and verify RED**

Run: `npm run test -- tests/integration/business-integrations/key-route.test.ts`
Expected: FAIL before the route and helper implementation.

- [ ] **Step 6: Implement owner-only key lifecycle route**

Implement an owner resolver that validates active web session, active user, role ID `owen-business` or `role-owner`, and `businesses.user_id = session user id`; resolve the business from the database, never request input. Create `/api/business-integrations/key` methods: GET metadata, POST new/rotated credential, PATCH `{ enabled: boolean }`, DELETE revoke. POST calls `rotate_business_api_key` in one database transaction so a unique-index race cannot leave two valid credentials or disable the key without returning its replacement. Enforce same-origin `Origin` for cookie-authenticated mutations, return `Cache-Control: no-store`, and never log or return key digest.

- [ ] **Step 7: Run both key test files**

Run: `npm run test -- tests/unit/business-integrations/api-key.test.ts tests/integration/business-integrations/key-route.test.ts`
Expected: PASS, including no secret on GET and no owner/business scope from the request body.

- [ ] **Step 8: Commit key lifecycle**

```bash
git add src/lib/business-integrations/api-key.ts src/lib/business-integrations/api-key-management.ts src/app/api/business-integrations/key/route.ts tests/unit/business-integrations/api-key.test.ts tests/integration/business-integrations/key-route.test.ts src/lib/auth/admin-session.ts
git commit -m "feat: manage business integration API key"
```

### Task 3: Public API authentication, list and detail reads

**Files:**
- Create: `src/lib/business-integrations/api-auth.ts`
- Create: `src/lib/business-integrations/orders.ts`
- Create: `src/app/api/v1/orders/route.ts`
- Create: `src/app/api/v1/orders/[id]/route.ts`
- Create: `tests/unit/business-integrations/orders.test.ts`
- Create: `tests/integration/business-integrations/orders-read.test.ts`

- [ ] **Step 1: Write pure order-helper tests**

Cover Bearer extraction (missing, malformed, valid), opaque cursor encode/decode and tampering rejection, allowed statuses/date filters, maximum page size 100, two-decimal decimal calculations, and DTO allowlist that omits rider GPS, assignment internals, key hash and unrelated business/customer fields.

- [ ] **Step 2: Run helper test and verify RED**

Run: `npm run test -- tests/unit/business-integrations/orders.test.ts`
Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement pure validation, cursor and sanitizer helpers**

Define Zod schemas in `orders.ts`. Use a decimal-safe helper based on integer cents for values with at most two decimal places; reject excess precision, non-finite values, negatives and out-of-range amounts. Encode cursor as URL-safe base64 JSON containing only `(created_at, id)` and validate both before query use.

- [ ] **Step 4: Write public read-route tests first**

Test missing/invalid/disabled/revoked keys all return the same generic `401`; successful auth derives business ID from key row; inactive business returns `403`; rate limit returns `429`; list filters always include derived `business_id`; detail of business B queried with A's key returns the same `404` as missing ID; no-store headers are set.

- [ ] **Step 5: Run read route tests and verify RED**

Run: `npm run test -- tests/integration/business-integrations/orders-read.test.ts`
Expected: FAIL because public v1 routes do not exist.

- [ ] **Step 6: Implement API auth middleware/helper**

Hash Bearer key in server memory, fetch enabled non-revoked key by digest using `createSupabaseAdminClient()`, derive business ID from DB, check business status, call atomic rate-limit RPC, and attempt `last_used_at` update best-effort. Return a generic 401 for invalid/disabled/revoked keys. Never include credentials in errors/logs.

- [ ] **Step 7: Implement paginated list/detail handlers**

Use explicit PostgREST select strings. For list, scope `.eq('business_id', access.businessId)`, apply validated status/date filters, order by `created_at DESC, id DESC`, fetch `limit + 1`, and return `{ data, next_cursor, has_more }`. For detail, scope both `.eq('id', id)` and `.eq('business_id', access.businessId)`, returning 404 for either missing or cross-business records. Sanitize to stable public DTOs and add `Cache-Control: no-store`.

- [ ] **Step 8: Run helper and read-route tests**

Run: `npm run test -- tests/unit/business-integrations/orders.test.ts tests/integration/business-integrations/orders-read.test.ts`
Expected: PASS for same-business and cross-business cases.

- [ ] **Step 9: Commit read API**

```bash
git add src/lib/business-integrations/api-auth.ts src/lib/business-integrations/orders.ts src/app/api/v1/orders/route.ts 'src/app/api/v1/orders/[id]/route.ts' tests/unit/business-integrations/orders.test.ts tests/integration/business-integrations/orders-read.test.ts
git commit -m "feat: add scoped business order read API"
```

### Task 4: Idempotent external order creation

**Files:**
- Modify: generated `business_integrations_api` migration only if Task 1 RPC test/code review requires a correction; otherwise no schema changes
- Modify: `src/lib/business-integrations/orders.ts`
- Modify: `src/app/api/v1/orders/route.ts`
- Create: `tests/integration/business-integrations/order-create.test.ts`

- [ ] **Step 1: Write POST contract tests first**

Test valid body and required `Idempotency-Key`; reject missing/long key, unsupported fields (`business_id`, `rider_id`, `status`, `order_total`, `subtotal`), empty/too many items, invalid quantities, price precision over two decimals, negative delivery fee, invalid phone/address, and oversized body. Assert the route computes subtotal/total and passes only server-derived business ID to the RPC.

- [ ] **Step 2: Add idempotency/security cases and verify RED**

Test first call returns `201`; retry with same key and same canonical payload returns same order without second create; same key and different canonical payload returns `409`; customer lookup/create is business-scoped; database error returns safe `503/500` without SQL details; dispatch push is attempted best-effort only after successful create.

Run: `npm run test -- tests/integration/business-integrations/order-create.test.ts`
Expected: FAIL before POST implementation.

- [ ] **Step 3: Add the exact API creation schema and canonical hash**

Require `customer.name`, normalized `customer.phone`, `delivery_address`, `delivery_fee`, and 1–50 items `{ description, quantity, unit_price }`; accept optional email/notes. Strip unknown fields only if tests prove the forbidden identity/money/status fields are rejected (strict schema). Canonicalize parsed validated JSON deterministically and SHA-256 it for idempotency comparison.

- [ ] **Step 4: Implement transactional POST using RPC**

Require valid integration auth and `Idempotency-Key`. Derive pickup address from the linked business record; derive customer ID inside the transaction; use generated `ord-<uuid>`; set status to `pending_acceptance`; send item JSON `{ product_id: null, quantity, price: unit_price, item_description: description }`; pass all amount values computed server-side and a safe items description to `create_business_api_order`. Return public DTO and `201`; same-payload replay returns the existing order with `200` and `Idempotency-Replayed: true`; conflicting reuse returns `409`.

- [ ] **Step 5: Preserve order creation side effects**

The existing `create_order_with_items` invokes dispatch inside its transaction. After a newly created order commits, call `sendOrderEventPushes({ orderId, type: 'dispatch_wave' })` best-effort; do not send another dispatch notification for an idempotency replay. Keep push failures out of the order response and logs free of customer PII/key data.

- [ ] **Step 6: Run POST and all read tests**

Run: `npm run test -- tests/integration/business-integrations/order-create.test.ts tests/integration/business-integrations/orders-read.test.ts tests/unit/business-integrations/orders.test.ts`
Expected: PASS; verify status, exact monetary values and no cross-business access.

- [ ] **Step 7: Commit order creation**

```bash
git add src/lib/business-integrations/orders.ts src/app/api/v1/orders/route.ts tests/integration/business-integrations/order-create.test.ts supabase/migrations
git commit -m "feat: create orders through business integration API"
```

### Task 5: OpenAPI contract, owner profile controls and Stoplight-style docs

**Files:**
- Create: `src/lib/business-integrations/openapi.ts`
- Create: `src/app/(admin)/profile/business-integrations-card.tsx`
- Create: `src/app/(admin)/profile/business-api-reference.tsx`
- Modify: `src/app/(admin)/profile/page.tsx`
- Create: `tests/unit/business-integrations/openapi.test.ts`
- Create: `tests/ui/business-integrations/profile.test.tsx`

- [ ] **Step 1: Write OpenAPI contract tests first**

Assert OpenAPI 3.1 lists exactly `GET /orders`, `GET /orders/{id}`, `POST /orders`; documents Bearer API key and `Idempotency-Key`; declares request/response/error schemas and maximum page 100; has examples with no real key; has no unsupported update/cancel endpoint.

- [ ] **Step 2: Run contract test and verify RED**

Run: `npm run test -- tests/unit/business-integrations/openapi.test.ts`
Expected: FAIL because the OpenAPI module does not exist.

- [ ] **Step 3: Add typed OpenAPI 3.1 object and examples**

Use one exported `businessIntegrationsOpenApi` object as source of truth. Add base URL from `NEXT_PUBLIC_APP_URL` or a relative/path-safe displayed origin; include auth, request examples, cursor/filter schema, idempotency behavior, error response schemas and `curl`/Node examples using `${API_KEY}` placeholder only.

- [ ] **Step 4: Write profile UI tests first**

Test owner role `owen-business` sees integrations and docs; alias `role-owner` works; admin/rider/non-business sees neither; first-time empty key state; one-time secret is shown only from create response; GET never repopulates secret after unmount/refresh; enable toggle updates status; rotate requires confirmation; docs navigation opens endpoint descriptions/snippets.

- [ ] **Step 5: Run UI tests and verify RED**

Run: `npm run test -- tests/ui/business-integrations/profile.test.tsx`
Expected: FAIL because the components do not exist.

- [ ] **Step 6: Implement key card and profile API calls**

Use existing Card/Button/Switch/AlertDialog/Toast patterns. Query `/api/business-integrations/key` with no-store; mutations use same-origin credentials. Keep plaintext key only in component state after creation, show warning and copy control, clear on close/unmount, never write to localStorage or query cache. Disable controls during requests and confirm rotation/revocation.

- [ ] **Step 7: Implement Stoplight-style documentation component**

Render responsive endpoint navigation, method badges, auth panel, parameter/schema tables, request/response samples, and copyable cURL/JSON from the typed OpenAPI object. Do not add an external package. Ensure docs are only mounted for an authorized linked business account.

- [ ] **Step 8: Integrate into profile and run UI/contract tests**

Add sections/tabs within `src/app/(admin)/profile/page.tsx`, preserving current account/password/subscription behavior. Run:

```bash
npm run test -- tests/unit/business-integrations/openapi.test.ts tests/ui/business-integrations/profile.test.tsx
```

Expected: PASS, including owner/non-owner visibility and one-time secret behavior.

- [ ] **Step 9: Commit docs/profile**

```bash
git add src/lib/business-integrations/openapi.ts 'src/app/(admin)/profile/page.tsx' 'src/app/(admin)/profile/business-integrations-card.tsx' 'src/app/(admin)/profile/business-api-reference.tsx' tests/unit/business-integrations/openapi.test.ts tests/ui/business-integrations/profile.test.tsx
git commit -m "feat: add business API keys and integration docs"
```

### Task 6: Full verification, documentation and deployment handoff

**Files:**
- Modify: `CODEX.md`
- Review all new `src/lib/business-integrations/`, API routes, tests and SQL migration

- [ ] **Step 1: Add concise operational notes to CODEX.md**

Document key hash-only storage, role ID `owen-business`, API paths, 60/minute rate limit, migration filename, OpenAPI source file, and deploy order. State that API key plaintext is only shown on creation and never belongs in a client-side public app.

- [ ] **Step 2: Run all focused API tests**

Run: `npm run test -- tests/unit/business-integrations tests/integration/business-integrations tests/ui/business-integrations`
Expected: PASS. If a directory has no tests due a missing test file, stop and add the missing test rather than treating Vitest's empty-suite exit as success.

- [ ] **Step 3: Run required repository verification**

Run: `npm run typecheck && npm run lint`
Expected: both exit zero. Then run `npm run test` for the full suite; record pre-existing failures distinctly and do not hide them.

- [ ] **Step 4: Review migration and security posture**

Review SQL for correct schema, RLS, grants, unique indexes, transaction rollback, advisory lock, role/function execute privileges, and no raw API key storage. Run Supabase security/performance advisors after migration is applied in a controlled environment; do not use the production MCP to apply the migration without explicit confirmation and a reviewed deployment window.

- [ ] **Step 5: Run final diff and secret scan**

Run `git diff --check`, `git status --short`, and search staged source/tests/docs for `SUPABASE_SERVICE_ROLE_KEY`, a literal `hid_live_` secret, `Authorization` logging, and `business_id` accepted as an auth authority. Confirm only task files are staged.

- [ ] **Step 6: Commit docs and final changes**

```bash
git add CODEX.md
git commit -m "docs: document business integrations API"
```

- [ ] **Step 7: Deployment order and handoff**

Deploy app code that contains the integration routes and the same-build owner profile UI, then apply the reviewed migration, then issue/enable a key to a test business and verify list/detail/create plus disabled/revoked/cross-business failures. Because the migration is required for the endpoints, do not enable key-management UI in production before the migration is present. Preserve POS/Shipping smoke tests.

## Final acceptance checklist

- [ ] One enabled, non-revoked key maximum per business; raw key shown once and only digest persisted.
- [ ] Owner (`owen-business` or supported `role-owner`) can manage only the DB-linked business key; all other roles denied.
- [ ] Disabled/revoked/missing/invalid key fails generically; active key has shared 60/minute rate limit.
- [ ] `GET` list/detail are paginated, no-store, sanitized, and business-scoped.
- [ ] `POST` validates strict request, creates/reuses same-business customer, calculates totals, uses initial status, dispatches best-effort, and is transactionally idempotent.
- [ ] OpenAPI accurately documents requests, responses, errors, auth, idempotency, pagination and examples.
- [ ] Profile and docs are business-owner-only, responsive and accessible.
- [ ] Focused tests, typecheck and lint pass; deployment/apply steps are documented.
