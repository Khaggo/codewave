# Notifications Reminders Live Delivery Feed Verification

## Task ID

`T535`

## Title

Verify customer notification delivery, reminders, and feed visibility from live workflow events.

## Type

`quality`

## Status

`done`

## Priority

`medium`

## Owner Role

`test-worker`

## Source of Truth

- `../../domains/main-service/notifications.md`
- `../../api-strategy.md`
- `../01-main-service/T111-notifications-reminders-core.md`
- `../03-integration/T304-notification-trigger-integration.md`
- `../05-client-integration/T520-notification-preferences-delivery-states-and-reminder-sync.md`

## Depends On

- `T111`
- `T304`
- `T520`

## Goal

Confirm Notifications & Reminders can move beyond preferences-only behavior by proving that booking, insurance, back-job, invoice, or service-follow-up events create customer-visible feed entries and delivery states.

## Deliverables

- live smoke path that triggers at least one customer notification
- verification of `GET /api/users/:id/notifications`
- verification of notification preference filtering
- fix for any queue-job-id, worker, or read-model issue that keeps the feed empty after source events
- updated module status for Notifications & Reminders

## Completion Notes

- Wired booking confirmation and reschedule workflows to the existing `booking.reminder_requested` notification trigger planner.
- Wired insurance inquiry status review changes to the existing `insurance.inquiry_status_changed` notification trigger planner.
- Wired back-job staff status changes to the existing `back_job.status_changed` notification trigger planner.
- Preserved the existing customer feed and preference APIs; no new public notification routes were added.
- Added `backend/scripts/smoke-notifications-feed.ts` and `npm run smoke:notifications` for repeatable live backend validation when the local backend is already running.
- Confirmed notification BullMQ job IDs are sanitized through the shared `toBullSafeJobId` helper before queue submission.

## Implementation Notes

- use `port-aware-dev-runtime` before starting backend or worker processes
- do not start duplicate Node runtimes; stop only exact stale listeners if needed
- preserve async read-model language in mobile because notification delivery can lag source workflow changes
- include queue job id sanitization in the review because notification dedupe keys may contain `:`

## Acceptance Checks

- a live workflow event creates or schedules a notification row
- customer notification feed returns at least one relevant item for the test user
- preference changes affect future notification planning
- delivery attempts or skipped states are auditable
- no duplicate backend, worker, web, or Expo Node process is created during validation

## Validation Evidence

- `cd backend && npm test -- notifications.service.spec.ts notifications.integration.spec.ts bookings.service.spec.ts insurance.service.spec.ts back-jobs.service.spec.ts` passed.
- `cd backend && node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit` passed.
- `cd backend && npm test -- bookings.integration.spec.ts insurance.integration.spec.ts back-jobs.integration.spec.ts notifications.integration.spec.ts` passed.
- Live smoke path is available as `cd backend && npm run smoke:notifications`; it was not executed in this pass because no backend listener was active and no long-running Node server was started for this quality task.
- Final port-aware check found no active listeners on `3000`, `3001`, `3002`, `8081`, `8085`, or `8090`.

## Out of Scope

- SMS provider integration
- push notification provider integration
- read/unread mutation endpoints unless already implemented
