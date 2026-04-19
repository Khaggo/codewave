# T505 Staff Booking Decision Actions Web Flow

## Slice ID

`T505`

## Source Of Truth

- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/tasks/05-client-integration/T505-staff-booking-decision-actions-web-flow.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/bookings/controllers/bookings.controller.ts`
- web client helper: `frontend/src/lib/bookingStaffClient.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `PATCH /api/bookings/:id/status` | `live` | Swagger/controller | confirm or decline booking through backend transition rules |
| `POST /api/bookings/:id/reschedule` | `live` | Swagger/controller | move a booking to a replacement slot and date |

## Action State Model

| State | Meaning |
| --- | --- |
| `action_ready` | staff user can submit a valid decision action |
| `submitting` | one action request is in flight and repeated action should be disabled |
| `confirmed` | backend accepted transition to `confirmed` |
| `declined` | backend accepted transition to `declined` |
| `rescheduled` | backend moved booking to a new slot and date |
| `invalid_payload` | status or reschedule payload failed validation |
| `unauthorized` | staff session is missing or invalid |
| `forbidden` | authenticated role cannot perform decision actions |
| `stale_transition` | requested transition is no longer valid for current booking status |
| `slot_conflict` | replacement slot is full or booking cannot be rescheduled |
| `not_found` | booking or replacement slot was not found |
| `submit_failed` | non-classified network or API failure |

## Frontend Contract Files

- `frontend/src/lib/api/generated/bookings/requests.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/bookings/staff-actions.ts`
- `frontend/src/mocks/bookings/mocks.ts`
- `frontend/src/lib/bookingStaffClient.js`

## Decision Rules

- confirm and decline use `PATCH /api/bookings/:id/status`
- reschedule uses `POST /api/bookings/:id/reschedule`
- the client must not infer valid transitions beyond backend success or conflict responses
- repeated clicks while one action is submitting should be blocked by the client
- role-gated failures must remain distinct from stale-transition and slot-conflict failures

## Acceptance States

- confirm a pending booking successfully
- decline a pending booking successfully
- reschedule a booking successfully
- show invalid-payload error
- show unauthorized session error
- show forbidden role error
- show stale transition conflict
- show reschedule slot conflict
- show missing booking or slot error

## Notes

- Schedule and queue read-only views belong to `T504`.
- Notification delivery and customer reminder wording are outside this action slice.

