# T503 Customer Booking Create And History Mobile Flow

## Slice ID

`T503`

## Source Of Truth

- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/tasks/05-client-integration/T503-customer-booking-create-and-history-mobile-flow.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/bookings/controllers/bookings.controller.ts`
- mobile client helper: `mobile/src/lib/bookingDiscoveryClient.js`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `POST /api/bookings` | `live` | Swagger/controller | create a booking from selected service, owned vehicle, slot, and date |
| `GET /api/bookings/:id` | `live` | Swagger/controller | load booking detail after creation or from history |
| `GET /api/users/:id/bookings` | `live` | Swagger/controller | load customer booking history |

## Create State Model

| State | Meaning |
| --- | --- |
| `draft_ready` | customer has selected owned vehicle, service, active slot, and date |
| `submitting` | create request is in flight |
| `created_pending` | backend created the booking with status `pending` |
| `validation_error` | submitted booking payload is invalid |
| `missing_related_record` | user, owned vehicle, slot, or service was not found |
| `slot_conflict` | selected slot is unavailable or conflicting |
| `duplicate_submit_blocked` | client blocks a second submit while one request is in flight |
| `unauthorized_session` | mobile session is missing before submit |
| `submit_failed` | non-classified network or API failure |

## Read State Model

| State | Meaning |
| --- | --- |
| `detail_loaded` | booking detail loaded from backend |
| `history_loaded` | booking history has at least one record |
| `history_empty` | customer has no booking history |
| `not_found` | requested booking does not exist |
| `unauthorized_session` | mobile session is missing before history load |
| `load_failed` | booking detail or history could not be loaded |

## Frontend Contract Files

- `frontend/src/lib/api/generated/bookings/requests.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/bookings/customer-flow.ts`
- `frontend/src/mocks/bookings/mocks.ts`
- `mobile/src/lib/bookingDiscoveryClient.js`

## Duplicate Submit Policy

- the mobile client should disable or guard submit while `POST /api/bookings` is in flight
- duplicate-submit blocking is a client guard, not a backend booking status
- a successful create returns canonical booking truth and should land as `created_pending`

## Acceptance States

- create booking successfully as `pending`
- show booking detail after creation
- show booking history with records
- show empty booking history
- reject invalid payload distinctly from slot conflict
- reject missing user, owned vehicle, time slot, or service distinctly from slot conflict
- block duplicate submit while one create request is already pending

## Notes

- Staff confirmation, decline, reschedule, schedule, and queue screens belong to later staff-web tasks.
- This slice does not reserve a slot before create; slot conflict is resolved by the backend create request.

