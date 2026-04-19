# T506 Booking Status Sync Reminders And Cross Surface Acceptance

## Slice ID

`T506`

## Source Of Truth

- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/tasks/05-client-integration/T506-booking-status-sync-reminders-and-cross-surface-acceptance.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- `docs/team-flow-async-orchestration.md`
- booking status contract: `frontend/src/lib/api/generated/bookings/status-sync.ts`

## Booking-First Slice Coverage

| Task | Surface | Status |
| --- | --- | --- |
| `T501` | cross-surface | done |
| `T502` | customer mobile | done |
| `T503` | customer mobile | done |
| `T504` | staff/admin web | done |
| `T505` | staff/admin web | done |
| `T506` | cross-surface | done |

## Shared Status Matrix

| Booking Status | Customer Mobile | Staff/Admin Web | Reminder Expectation |
| --- | --- | --- | --- |
| `pending` | pending staff review | decision required | no reminder expected |
| `confirmed` | confirmed appointment | confirmed arrival | may schedule reminder |
| `declined` | declined by staff | declined | no reminder expected |
| `rescheduled` | rescheduled appointment | rescheduled | may schedule reminder |
| `completed` | completed visit | completed | no reminder expected |
| `cancelled` | cancelled | cancelled | no reminder expected |

## Reminder Expectation

| Trigger | Status | Owner | Rule |
| --- | --- | --- | --- |
| `booking.reminder_requested` | live | `main-service.notifications` | booking may request reminders for `confirmed` or `rescheduled`; delivery, retry, dedupe, and copy stay notification-owned |

## Frontend Contract Files

- `frontend/src/lib/api/generated/bookings/requests.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/bookings/status-sync.ts`
- `frontend/src/lib/api/generated/bookings/surface-states.ts`
- `frontend/src/lib/api/generated/bookings/customer-flow.ts`
- `frontend/src/lib/api/generated/bookings/staff-flow.ts`
- `frontend/src/lib/api/generated/bookings/staff-actions.ts`
- `frontend/src/mocks/bookings/mocks.ts`

## Contract Drift Checklist

- all booking routes are labeled `live` or `planned`
- customer mobile and staff/admin web use the same canonical booking status values
- schedule and queue stay derived operational reads
- reminder expectations stay notification-owned
- no booking client task invents notification transport behavior

## Acceptance Checklist

- customer can discover services, slots, and owned vehicles before create
- customer can create a booking and see it as `pending`
- customer can read booking detail and history using canonical status values
- staff can read daily schedule and current queue as derived views
- staff can confirm, decline, and reschedule through backend transitions
- reminder expectations are modeled as async side effects only

## Notes

- `T506` completes the booking-first client-integration pack.
- The next client-integration task starts identity and user cross-surface coordination with `T507`.

