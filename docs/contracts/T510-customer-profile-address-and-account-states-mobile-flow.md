# T510 Customer Profile Address And Account States Mobile Flow

## Slice ID

`T510`

## Source Of Truth

- `docs/architecture/domains/main-service/users.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T510-customer-profile-address-and-account-states-mobile-flow.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/users/controllers/users.controller.ts`
- mobile client helper: `mobile/src/lib/authClient.js`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `GET /api/users/:id` | `live` | Swagger/controller | load the customer profile snapshot after activation or login |
| `PATCH /api/users/:id` | `live` | Swagger/controller | persist editable customer profile fields owned by users |
| `GET /api/users/:id/addresses` | `live` | Swagger/controller | load the saved customer address list |
| `POST /api/users/:id/addresses` | `live` | Swagger/controller | add a saved customer address after activation |
| `PATCH /api/users/:id/addresses/:addressId` | `live` | Swagger/controller | update an address and switch the default address through backend rules |

## Customer Profile States

| State | Meaning |
| --- | --- |
| `active_profile_ready` | active customer account has the minimum profile fields required by the mobile profile surface |
| `active_profile_incomplete` | active customer account exists but at least one profile field is still missing |
| `profile_saving` | profile update request is in flight |
| `profile_forbidden` | customer session is missing or the profile route is not available to the current identity |
| `profile_not_found` | the users domain does not recognize the requested user record |
| `deactivated_account_blocked` | account exists but must not be treated as an active mobile profile session |

## Customer Address States

| State | Meaning |
| --- | --- |
| `addresses_loaded` | at least one saved address exists |
| `no_addresses` | customer has no saved addresses yet |
| `default_address_ready` | one saved address is clearly marked as default |
| `default_address_switching` | customer is changing the default address through a live address mutation |
| `address_validation_error` | the submitted address payload is invalid |
| `address_conflict` | the client should stop and let backend default-address rules win |
| `address_forbidden` | customer session is missing or address routes are blocked |
| `address_not_found` | the requested address record is not attached to the user |

## Frontend Contract Files

- `frontend/src/lib/api/generated/users/requests.ts`
- `frontend/src/lib/api/generated/users/responses.ts`
- `frontend/src/lib/api/generated/users/errors.ts`
- `frontend/src/lib/api/generated/users/customer-mobile-profile.ts`
- `frontend/src/mocks/users/mocks.ts`
- `mobile/src/lib/authClient.js`

## Contract Rules

- customer-mobile profile editing may only use `firstName`, `lastName`, `phone`, and `birthday` from the live users DTO contract
- address creation and updates must use structured address DTO fields, not one freeform address string as the source of truth
- default-address switching is backend-owned; the client may request `isDefault: true`, but it must not try to clear older defaults locally as a substitute for server behavior
- profile completeness and auth activation remain separate concerns
- deactivated customer accounts must remain blocked distinctly from empty or incomplete profile states

## Acceptance States

- active profile ready
- active profile incomplete
- no saved addresses
- default address ready
- default address switching
- address validation error
- address conflict
- deactivated account blocked

## Notes

- This slice defines the customer-mobile users boundary and mock states; it does not add vehicle-management behavior.
- The current mobile boundary may derive a display-friendly address summary from the default address, but the canonical editable transport shape stays structured.
- A missing address list is an empty-state experience, not an auth failure.
