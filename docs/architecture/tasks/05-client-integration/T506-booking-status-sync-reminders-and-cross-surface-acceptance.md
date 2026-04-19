# Booking Status Sync Reminders And Cross Surface Acceptance

## Task ID

`T506`

## Title

Align booking status visibility, reminder expectations, and cross-surface acceptance.

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
- `../../domains/main-service/notifications.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T503`
- `T504`
- `T505`

## Goal

Finish the booking-first slice by aligning customer and staff status visibility, reminder side effects, and final acceptance coverage.

## Deliverables

- cross-surface booking acceptance checklist
- reminder-trigger expectation map at the client contract level
- booking contract drift checklist versus Swagger
- finalized booking mocks for both surfaces

## Implementation Notes

- reminders stay side effects, not primary booking state owners
- customer and staff surfaces may show different levels of detail, but not different state truth
- acceptance must verify both synchronous and async-derived states

## Acceptance Checks

- booking tasks ship first and remain internally consistent
- customer and staff views use one booking state model
- reminder expectations do not invent notification transport behavior

## Out of Scope

- job-order UI
- insurance intake
