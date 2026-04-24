# T529 Client RBAC Navigation And Surface Guardrails

## Slice ID

`T529`

## Source Of Truth

- `docs/architecture/rbac-policy.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T529-client-rbac-navigation-and-surface-guardrails.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller:
  - `backend/apps/main-service/src/modules/auth/controllers/auth.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/auth/login` | `live` | main-service auth controller and generated auth session contracts |
| `POST /api/auth/refresh` | `live` | main-service auth controller and generated auth session contracts |
| `GET /api/auth/me` | `live` | main-service auth controller and authenticated user contract |

## Surface Ownership

| Surface | Intended Users | Guardrail Rule |
| --- | --- | --- |
| `customer-mobile` | `customer` | protected customer account screens must reject staff and deactivated sessions |
| `staff-admin-web` | `technician`, `service_adviser`, `super_admin` | web navigation must reflect role visibility and must not keep customer sessions inside the portal |

## Frontend Contract Files

- `frontend/src/lib/api/generated/auth/staff-web-session.ts`
- `frontend/src/lib/api/generated/auth/client-surface-guardrails.ts`
- `frontend/src/lib/authClient.js`
- `frontend/src/components/layout/AppShell.js`
- `frontend/src/mocks/auth/mocks.ts`
- `mobile/src/lib/authClient.js`
- `mobile/App.js`

## Guarded States

- staff web session restore now rehydrates the stored session with live `GET /api/auth/me` identity before role gating so stale local-storage roles do not leak protected navigation
- staff web forbidden-route states now show allowed fallbacks instead of silently rendering inaccessible surfaces
- customer mobile protected screens now distinguish `unauthorized_session`, `staff_session_blocked`, and `deactivated_customer_blocked`
- customer mobile sign-in and registration-verification handoffs now reject non-customer sessions before they can persist as active customer app state

## Known API Gaps

- `GET /api/auth/me` currently returns minimal identity fields (`userId`, `email`, `role`) and does not expose richer active-state or staff metadata, so client restore logic must merge that response with the richer session payload from login or refresh instead of inventing extra fields
- no dedicated backend route exists for a client-owned route-visibility matrix, so the RBAC navigation matrix remains a typed client contract derived from the RBAC policy and task truth

## Runtime Notes

- web guardrails are UX boundaries only; backend authorization remains the source of enforcement
- mobile remains customer-only even when the same auth backend can issue staff sessions for the web portal
- blocked mobile states should clear or replace the current customer session path instead of pretending staff accounts can continue inside customer-owned flows

## Scope Guard

- this slice does not add new backend authorization logic or new roles
- this slice does not replace server-side permission checks with client-only checks
- this slice only hardens navigation, restore, and session-surface behavior for existing auth contracts
