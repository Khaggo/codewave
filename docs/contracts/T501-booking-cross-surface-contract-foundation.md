# T501 Booking Cross Surface Contract Foundation

## Slice ID

`T501`

## Source Of Truth

- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/tasks/05-client-integration/T501-booking-cross-surface-contract-foundation.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/bookings/controllers/bookings.controller.ts`

## Route Status

| Route | Status | Source | Surface |
| --- | --- | --- | --- |
| `GET /api/services` | `live` | Swagger/controller | customer mobile |
| `GET /api/time-slots` | `live` | Swagger/controller | customer mobile |
| `POST /api/bookings` | `live` | Swagger/controller | customer mobile |
| `GET /api/bookings/:id` | `live` | Swagger/controller | customer mobile, staff web |
| `GET /api/users/:id/bookings` | `live` | Swagger/controller | customer mobile |
| `GET /api/bookings/daily-schedule` | `live` | Swagger/controller | staff web |
| `GET /api/queue/current` | `live` | Swagger/controller | staff web |
| `PATCH /api/bookings/:id/status` | `live` | Swagger/controller | staff web |
| `POST /api/bookings/:id/reschedule` | `live` | Swagger/controller | staff web |

## Shared State Glossary

| State | Surface | Canonical Truth |
| --- | --- | --- |
| `customer_booking_discovery_ready` | customer mobile | service and slot reads are synchronous API truth |
| `customer_booking_pending` | customer mobile | booking status is `pending` |
| `customer_booking_confirmed` | customer mobile | booking status is `confirmed` |
| `customer_booking_declined` | customer mobile | booking status is `declined` |
| `customer_booking_rescheduled` | customer mobile | booking status is `rescheduled` |
| `staff_schedule_visibility` | staff web | derived operational read model from bookings |
| `staff_queue_visibility` | staff web | derived operational read model from bookings |
| `staff_booking_decision_required` | staff web | pending booking awaiting staff action |
| `booking_reminder_pending` | cross-surface | async notification side effect, not booking truth |

## Frontend Contract Files

- `frontend/src/lib/api/generated/bookings/requests.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/bookings/errors.ts`
- `frontend/src/lib/api/generated/bookings/surface-states.ts`
- `frontend/src/mocks/bookings/mocks.ts`

## Acceptance States

- customer can load services and time slots
- customer can see empty or unavailable discovery states
- customer can create a pending booking
- customer can read booking detail and booking history
- staff can read schedule and queue views
- staff can confirm, decline, or reschedule where authorized
- customer and staff surfaces show one canonical booking status
- reminders are treated as async side effects only

## Notes

- All booking routes in this pack are live today.
- Staff routes require bearer auth and service-adviser or super-admin access where defined by the controller.
- Job-order conversion, inspection evidence, and notification delivery internals are intentionally excluded from this foundation slice.

