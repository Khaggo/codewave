# Staff Booking Decision Actions Web Flow

## Task ID

`T505`

## Title

Integrate staff/admin web booking decision actions for confirm, decline, and reschedule.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/bookings.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T501`
- `T504`

## Goal

Define the staff-web action flows that change booking state while preserving validated backend transitions and slot conflict handling.

## Deliverables

- decision-action contract pack
- typed action shapes for status updates and rescheduling
- conflict and stale-state client handling
- mocks for confirm, decline, reschedule success and failure cases

## Implementation Notes

- use `PATCH /bookings/:id/status` and `POST /bookings/:id/reschedule`
- do not permit the client to infer valid transitions outside backend rules
- reschedule UX must surface slot conflicts distinctly from auth failures

## Acceptance Checks

- confirm, decline, and reschedule paths use live route contracts
- invalid transitions are represented as conflict states, not generic errors
- role-gated failures are distinct from stale booking state failures

## Out of Scope

- queue and schedule read-only views
- notification delivery internals
