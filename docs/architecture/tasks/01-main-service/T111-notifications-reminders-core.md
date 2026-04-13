# Notifications Reminders Core

## Task ID

`T111`

## Title

Implement core reminders and outbound notifications.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/notifications.md`
- `../../api-strategy.md`

## Depends On

- `T105`
- `T110`

## Goal

Create the operational reminder and notification foundation for bookings, insurance updates, invoice aging, and follow-up messages.

## Deliverables

- notification records
- preferences handling
- BullMQ-backed reminder jobs
- frontend-ready contract pack and mock set for the slice if user-facing endpoints are added

## Implementation Notes

- support email-only delivery semantics for the current scope
- keep source-domain trigger ownership separate
- keep auth OTP delivery out of this task and in `T122`
- live public routes:
  - `GET /users/:id/notification-preferences`
  - `PATCH /users/:id/notification-preferences`
  - `GET /users/:id/notifications`
- live internal service operations:
  - `enqueueNotification`
  - `scheduleReminder`

## Acceptance Checks

- booking and insurance notifications can be enqueued and tracked
- reminder retries stay idempotent
- contract pack marks reminder routes as live or planned explicitly

## Out of Scope

- marketing campaigns
