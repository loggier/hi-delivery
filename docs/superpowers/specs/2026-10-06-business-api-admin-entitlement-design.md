# Business API — Admin-controlled entitlement

## Goal

Let an administrator decide which businesses may use the Business Integrations API. Once enabled, the linked business owner can manage API credentials and use the existing API. The grant belongs to the business profile, not to an API key or client-side session.

## Approved behavior

- Add `businesses.api_enabled`, a non-null boolean defaulting to `false`. Existing businesses remain opted out until an administrator explicitly enables access.
- In **Edit Business**, a `role-admin` administrator can enable or disable API access. The value is persisted on the business row.
- The server must authorize this setting change as administrator-only; hiding the control in the UI is not authorization. Prefer a narrowly scoped server endpoint for the entitlement update rather than trusting a client-submitted field in a general business form update.
- A business owner may manage API keys and access the embedded API documentation only when all existing eligibility checks pass (active user, exact `owen-business` role, linked active business) and `businesses.api_enabled` is true.
- Every API-key-authenticated request checks the same business entitlement as well as the existing active-business/key checks. Disabling access blocks subsequent API requests and key-management operations immediately.
- Disabling the business entitlement suspends access but does not delete or revoke the business's key. Re-enabling restores use of any key that remains enabled and unrevoked. The owner can still disable, rotate, or revoke the key while entitlement is enabled.
- While access is not enabled, the owner's profile shows a clear “API access not enabled; contact your administrator” state, but no key metadata, key controls, or API reference.
- Keep the API key's own `enabled` and `revoked_at` lifecycle separate from the business-level `api_enabled` entitlement. Both gates must allow access.

## Scope and implementation boundaries

- Add a versioned SQL migration for the business-level boolean; preserve all existing business records and avoid changing web login/password behavior.
- Extend the business edit form and types/schema to display and submit the setting for administrators only.
- Enforce administrator authorization on the write path and business entitlement checks in both web-session key management and Bearer API authentication.
- Update profile visibility/status, documentation, and OpenAPI/security notes only as needed to reflect the entitlement gate.
- No per-user grants independent of a business, multiple API keys, scopes, or changes to the existing order API contract.

## Acceptance criteria

1. Existing businesses have `api_enabled = false` after migration.
2. An admin can persist both enabled and disabled values from Edit Business; a non-admin cannot change the value by editing the request payload or calling the endpoint directly.
3. With entitlement disabled, the owner cannot read/manage API-key metadata or secrets and cannot call the order API; failures are safe and do not disclose key/business details.
4. With entitlement enabled and existing user/business/key requirements satisfied, the owner can manage the key and the key can authenticate API calls.
5. Disabling entitlement takes effect on the next request without revoking or deleting the key; re-enabling restores only a still-enabled, unrevoked key.
6. Profile tests cover enabled/disabled states and other roles; route tests cover administrator authorization and both API access gates; migration contract tests cover the default and non-null constraint.
7. Existing sign-in, password management, and non-integration business editing behavior remain unchanged.

## Verification and rollout

- Apply the migration before deploying code that reads `businesses.api_enabled`.
- Configure `BUSINESS_API_CURSOR_SECRET` server-side as already required by the API.
- Verify the entitlement update against an admin and a non-admin session, then test owner key management and API denial/allowance for both entitlement states.
- Do not create real orders as part of automated production verification; order creation can trigger dispatch and push behavior.
