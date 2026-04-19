# Staff Booking Schedule And Queue Web Flow

## Task ID

`T504`

## Title

Integrate staff/admin web booking schedule and current queue visibility.

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

## Goal

Turn the daily schedule and current queue read models into staff-web views that respect service-adviser and super-admin access boundaries.

## Deliverables

- staff schedule view contract pack
- queue visibility states and filters
- RBAC-aware unauthorized and forbidden states
- schedule and queue mocks for empty, normal, and high-pressure days

## Implementation Notes

- use `GET /bookings/daily-schedule` and `GET /queue/current`
- queue visibility remains a derived operational read, not the source of booking truth
- keep technician-only access out of this slice

## Acceptance Checks

- schedule and queue views reflect booking state without redefining it
- forbidden-role behavior is explicit in the contract pack
- empty schedule and empty queue states are both represented

## Out of Scope

- booking state changes
- job-order creation
