# T504 Staff Booking Schedule And Queue Web Flow

## Slice ID

`T504`

## Source Of Truth

- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/tasks/05-client-integration/T504-staff-booking-schedule-and-queue-web-flow.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/bookings/controllers/bookings.controller.ts`
- web client helper: `frontend/src/lib/bookingStaffClient.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `GET /api/bookings/daily-schedule` | `live` | Swagger/controller | read staff daily schedule grouped by slot |
| `GET /api/queue/current` | `live` | Swagger/controller | read current operational queue visibility |

## Role Boundary

| Role | Schedule | Queue |
| --- | --- | --- |
| `service_adviser` | allowed | allowed |
| `super_admin` | allowed | allowed |
| `technician` | forbidden | forbidden |
| `customer` | forbidden | forbidden |
| anonymous | unauthorized | unauthorized |

## Schedule State Model

| State | Meaning |
| --- | --- |
| `schedule_loaded` | schedule has one or more matching bookings |
| `schedule_empty` | schedule slots exist but no bookings match the selected filters |
| `schedule_high_pressure` | at least one slot is at or above active capacity |
| `unauthorized` | staff session is missing or expired |
| `forbidden` | role cannot read schedule visibility |
| `invalid_filter` | query filter is invalid |
| `load_failed` | non-classified network or API failure |

## Queue State Model

| State | Meaning |
| --- | --- |
| `queue_loaded` | queue has one active item |
| `queue_empty` | queue has no active items |
| `queue_high_pressure` | queue has multiple active items requiring staff attention |
| `unauthorized` | staff session is missing or expired |
| `forbidden` | role cannot read queue visibility |
| `invalid_filter` | query filter is invalid |
| `load_failed` | non-classified network or API failure |

## Frontend Contract Files

- `frontend/src/lib/api/generated/bookings/requests.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/bookings/staff-flow.ts`
- `frontend/src/mocks/bookings/mocks.ts`
- `frontend/src/lib/bookingStaffClient.js`
- `frontend/src/app/bookings/BookingsList.js`

## Derived-State Rules

- schedule and queue are derived operational read models
- schedule and queue do not replace booking record truth
- staff-web views may summarize pressure, but must keep booking statuses and counts from backend responses
- technician users should not gain schedule or queue visibility from this slice

## Acceptance States

- load normal daily schedule
- load empty daily schedule
- load high-pressure schedule
- load normal queue
- load empty queue
- load high-pressure queue
- handle unauthorized staff session
- handle forbidden non-adviser/non-admin role
- handle invalid schedule or queue filters

## Notes

- Booking decision actions belong to `T505`.
- Job-order creation and technician workbench behavior belong to later job-order tasks.

