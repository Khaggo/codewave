# Customer Booking Create And History Mobile Flow

## Task ID

`T503`

## Title

Integrate customer-mobile booking creation, booking detail, and booking history.

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

## Depends On

- `T501`
- `T502`

## Goal

Define the booking submission and post-create customer experience using the live booking create, detail, and history endpoints.

## Deliverables

- customer booking create contract pack
- booking detail and user booking history client states
- error and retry model for slot conflict, missing user, and invalid vehicle
- booking mocks for success, pending follow-up, and rejected creation cases

## Implementation Notes

- use `POST /bookings`, `GET /bookings/:id`, and `GET /users/:id/bookings`
- duplicate-submit handling must be explicit in the client state model
- preserve the difference between booking confirmation and later staff decisions

## Acceptance Checks

- booking create uses only documented request fields
- customer history and detail views do not depend on hidden operational fields
- conflict, validation, and auth failures have distinct client states

## Out of Scope

- staff schedule views
- staff reschedule actions
