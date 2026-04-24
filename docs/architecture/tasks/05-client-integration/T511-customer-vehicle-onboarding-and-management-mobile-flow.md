# Customer Vehicle Onboarding And Management Mobile Flow

## Task ID

`T511`

## Title

Integrate customer-mobile vehicle onboarding, ownership visibility, and vehicle management.

## Type

`client-integration`

## Status

`done`

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

## Module Name

Vehicle Garage / Customer Vehicle Management

## Description

Completed prerequisite for customer-owned vehicle onboarding and mobile vehicle management. The vehicle garage provides the owned vehicle list and selected vehicle context used by booking, insurance intake, lifecycle timelines, and future customer support screens.

## Business Value

- reduces booking friction by letting customers reuse saved vehicles
- improves staff readiness because booking requests include stable vehicle identity
- creates a shared customer vehicle record for insurance, service history, and lifecycle views
- prevents duplicate ownership assumptions in each feature slice

## Login, Registration, And Booking Integration Points

- registration onboarding should create the first customer vehicle after activation/profile completion when available
- login restores the customer-owned vehicle list for booking and account screens
- booking should require a backend-owned vehicle selection instead of free-text vehicle data
- insurance intake and lifecycle timeline should reuse the same vehicle identity used by bookings

## Required Database/API Changes

- use the existing customer vehicle create, update, list, and detail contracts where live
- document the API gap for archive vehicle as a future improvement
- document the API gap for set default vehicle as a future improvement
- do not implement default or archived behavior as client-only truth

## Follow-up Verification

- confirm add vehicle support is available after onboarding, not only during registration
- confirm edit vehicle support works for customer-owned vehicles only
- confirm default vehicle behavior is either live-backed or clearly omitted from UI
- confirm first vehicle created during onboarding is available for booking, insurance, and timeline views

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
- completed status remains preserved; missing archive/default behavior is tracked only as follow-up unless backend endpoints are added

## Out of Scope

- inspections
- lifecycle timeline views
