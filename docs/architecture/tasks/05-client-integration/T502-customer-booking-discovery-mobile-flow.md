# Customer Booking Discovery Mobile Flow

## Task ID

`T502`

## Title

Integrate customer-mobile booking discovery for services, slots, and vehicle selection.

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
- `../../domains/main-service/vehicles.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T501`

## Goal

Define the customer-mobile entry flow for discovering service options, time slots, and eligible owned vehicles before a booking is created.

## Deliverables

- customer-mobile discovery states
- typed request and response shapes for service and slot reads
- vehicle-selection assumptions for booking eligibility
- mock fixtures for happy, empty, unavailable, and unauthorized states

## Implementation Notes

- use live booking service and time-slot APIs as the contract anchor
- vehicle eligibility must remain user-ownership-aware
- no slot hold behavior should be implied unless the backend explicitly exposes it

## Acceptance Checks

- service and slot lists render from live DTO shapes only
- no-service and no-slot states are modeled explicitly
- invalid vehicle ownership is represented as a conflict or validation path, not hidden in the UI

## Out of Scope

- booking submission
- booking history
