# Customer Vehicle Onboarding And Management Mobile Flow

## Task ID

`T511`

## Title

Integrate customer-mobile vehicle onboarding, ownership visibility, and vehicle management.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/vehicles.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T510`

## Goal

Define the customer-mobile vehicle flow so owned vehicles are usable by bookings, insurance, and timeline views without client-side ownership drift.

## Deliverables

- vehicle onboarding and management contract pack
- typed contracts and mocks for create, read, update, and owned-list flows
- vehicle empty-state and duplicate-plate handling

## Implementation Notes

- keep ownership checks backend-owned
- the mobile flow should clearly distinguish first-vehicle onboarding from later vehicle management
- vehicle fields used by other slices must not be duplicated under different names

## Acceptance Checks

- vehicle selection and management work from documented contracts only
- duplicate or invalid vehicle data is represented explicitly
- vehicle ownership remains aligned with later booking and insurance slices

## Out of Scope

- inspections
- lifecycle timeline views

