# Booking Cross Surface Contract Foundation

## Task ID

`T501`

## Title

Establish the booking contract baseline across customer mobile and staff/admin web.

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
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T105`

## Goal

Turn the live booking APIs and booking domain rules into one shared contract pack that both client surfaces can consume without inventing separate behavior.

## Deliverables

- booking route inventory labeled `live` or `planned`
- shared booking state glossary across customer and staff surfaces
- booking contract pack in `docs/contracts/`
- generated booking contract and mock baseline

## Implementation Notes

- keep the booking domain as the only owner of appointment truth
- distinguish customer-readable states from staff-operational states without renaming the backend state model
- do not pull job-order or inspection behavior into the booking contract pack

## Acceptance Checks

- customer-mobile and staff-web booking states use the same canonical labels
- every booking route in the pack is marked `live` or `planned`
- typed contracts and mocks do not add undocumented booking fields

## Out of Scope

- job-order conversion UI
- notification template wording
