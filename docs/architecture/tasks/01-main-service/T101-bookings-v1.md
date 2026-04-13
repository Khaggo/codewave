# Bookings V1

## Task ID

`T101`

## Title

Implement the first production-ready `main-service.bookings` domain slice.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/bookings.md`
- `../../domains/main-service/users.md`
- `../../domains/main-service/vehicles.md`
- `../../api-strategy.md`

## Depends On

- existing `main-service.users`
- existing `main-service.auth`
- existing `main-service.vehicles`

## Goal

Add the `bookings` module in `main-service` so customers and staff can create and manage service bookings using user and vehicle ownership already established by the current golden domains.

## Deliverables

- `bookings` NestJS module using the golden domain structure
- Drizzle schema for booking records, booking statuses, time slots, and booking-to-service linkage
- REST endpoints for booking creation and booking status updates
- Swagger-documented request and response DTOs
- service-level happy-path and failure-path tests

## Implementation Notes

- keep booking ownership anchored to existing user and vehicle IDs
- start with booking creation, retrieval, and status transition behavior before secondary features
- use REST for synchronous booking flows; do not invent event contracts here beyond clear emit points
- align route naming and DTO discipline with `auth` and `users`

## Acceptance Checks

- `main-service.bookings` doc and implementation stay aligned
- booking endpoints appear in Swagger only after controller implementation exists
- booking creation rejects invalid user or vehicle ownership
- status transitions are validated rather than blindly patched
- `npm test` remains green with booking coverage added

## Out of Scope

- technician assignment
- inspection persistence
- lifecycle projection logic
- notification delivery logic
