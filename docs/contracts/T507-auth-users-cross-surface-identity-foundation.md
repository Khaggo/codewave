# T507 Auth Users Cross Surface Identity Foundation

## Slice ID

`T507`

## Source Of Truth

- `docs/architecture/domains/main-service/auth.md`
- `docs/architecture/domains/main-service/users.md`
- `docs/architecture/auth-security-policy.md`
- `docs/architecture/tasks/05-client-integration/T507-auth-users-cross-surface-identity-foundation.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live auth controller: `backend/apps/main-service/src/modules/auth/controllers/auth.controller.ts`
- live users controller: `backend/apps/main-service/src/modules/users/controllers/users.controller.ts`

## Route Status

| Route | Status | Source | Surface |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `live` | Swagger/controller | customer mobile |
| `POST /api/auth/register/verify-email` | `live` | Swagger/controller | customer mobile |
| `POST /api/auth/login` | `live` | Swagger/controller | customer mobile, staff/admin web |
| `POST /api/auth/refresh` | `live` | Swagger/controller | customer mobile, staff/admin web |
| `GET /api/auth/me` | `live` | Swagger/controller | customer mobile, staff/admin web |
| `POST /api/auth/google/signup/start` | `live` | Swagger/controller | customer mobile |
| `POST /api/auth/google/signup/verify-email` | `live` | Swagger/controller | customer mobile |
| `POST /api/auth/staff-activation/google/start` | `live` | Swagger/controller | staff/admin web |
| `POST /api/auth/staff-activation/verify-email` | `live` | Swagger/controller | staff/admin web |
| `POST /api/users` | `live` | Swagger/controller | cross-surface baseline |
| `GET /api/users/:id` | `live` | Swagger/controller | customer mobile, staff/admin web |
| `PATCH /api/users/:id` | `live` | Swagger/controller | customer mobile, staff/admin web |
| `GET /api/users/:id/addresses` | `live` | Swagger/controller | customer mobile |
| `POST /api/users/:id/addresses` | `live` | Swagger/controller | customer mobile |
| `PATCH /api/users/:id/addresses/:addressId` | `live` | Swagger/controller | customer mobile |

## Shared Identity States

| State | Surface | Ownership |
| --- | --- | --- |
| `customer_pending_activation` | customer mobile | auth session |
| `customer_active_session` | customer mobile | auth session |
| `staff_pending_activation` | staff/admin web | auth session |
| `staff_active_session` | staff/admin web | auth session |
| `deactivated_account` | cross-surface | auth session |
| `active_user_profile` | cross-surface | users profile |
| `active_user_addresses` | customer mobile | users addresses |

## Frontend Contract Files

- `frontend/src/lib/api/generated/auth/requests.ts`
- `frontend/src/lib/api/generated/auth/responses.ts`
- `frontend/src/lib/api/generated/auth/errors.ts`
- `frontend/src/lib/api/generated/auth/identity-foundation.ts`
- `frontend/src/lib/api/generated/users/requests.ts`
- `frontend/src/lib/api/generated/users/responses.ts`
- `frontend/src/lib/api/generated/users/errors.ts`
- `frontend/src/mocks/auth/mocks.ts`
- `frontend/src/mocks/users/mocks.ts`
- `frontend/src/lib/authClient.js`
- `mobile/src/lib/authClient.js`

## Contract Rules

- email OTP is canonical; SMS must not appear anywhere in the identity baseline
- auth owns session and activation state
- users owns profile and address state
- customer mobile and staff web may share routes, but they do not share identical surface states
- deactivated accounts must never be treated as active sessions

## Acceptance States

- customer pending activation
- customer active session
- staff pending activation
- staff active session
- deactivated account
- active user profile
- active address state

## Notes

- This slice establishes the shared identity baseline only.
- Customer activation detail is handled next in `T508`.
- Staff login and role-gated web session handling is handled in `T509`.

