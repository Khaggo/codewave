# Booking Availability Window And Slot Definition Governance

## Task ID

`T123`

## Title

Implement booking-owned availability windows and staff slot-definition governance.

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
- `../../api-strategy.md`
- `../../frontend-backend-sync.md`

## Depends On

- `T101`
- `T105`

## Goal

Make `main-service.bookings` the source of truth for bookable date windows, slot-definition governance, and capacity-aware date availability so web and mobile clients stop inventing appointment calendars locally.

## Module Name

`main-service.bookings`

## Description

Create a bookings-owned availability read model that turns active slot definitions, booking counts, and booking-horizon rules into date-aware availability results. Keep slot label, time window, capacity, and active-state management in the same domain, and reuse the same validation for booking create and reschedule.

## Business Value

- eliminates fake date availability in customer mobile booking
- gives service advisers a trustworthy way to publish and adjust booking capacity
- reduces failed booking attempts and queue surprises caused by stale or client-generated slot assumptions

## Deliverables

- booking availability policy for horizon, closed or unavailable dates, and active slot filtering
- Swagger-documented availability endpoint and DTOs for bounded date-window reads
- shared create and reschedule availability validator so all booking writes use the same rule set
- slot-definition governance clarification over existing `GET /time-slots`, `POST /time-slots`, and `PATCH /time-slots/:id`
- targeted tests for horizon validation, inactive slots, full dates, and concurrent capacity conflicts

## Integration Points With Login, Registration, And Booking

- customer login and registration remain unchanged, but only active customer sessions should consume customer-facing availability reads alongside owned-vehicle selection
- staff login remains adviser or admin only for slot-definition management and operational overrides
- booking create, booking reschedule, daily schedule, and queue pressure must all derive from the same availability and capacity truth

## Required DB/API Changes

- keep existing `time_slots`, `bookings`, and `booking_status_history` as the source for slot-capacity truth
- add a bookings-owned availability read endpoint, preferably queryable by date range, so clients stop generating bookable days locally
- if business-approved closed days or booking-horizon settings must be configurable, persist them in a bookings-owned operational policy record instead of hiding them in mobile utilities
- expose any new route and updated slot-management semantics in Swagger only after controller implementation exists

## Suggested Implementation Order

1. Finalize booking-horizon, inactive-slot, and closed-day rules in the bookings domain or service layer.
2. Add the availability read DTOs and endpoint.
3. Route booking create and reschedule through the same validator.
4. Verify daily schedule and queue pressure still align with slot-capacity outputs.
5. Hand off the live contract to a follow-up client slice for mobile and web consumption.

## Implementation Notes

- do not add slot-hold or reservation semantics unless the backend truly implements them
- do not let mobile keep deriving open days from `bookingCalendar.js` once live availability exists
- keep queue visibility as a derived read, not the booking source of truth

## Acceptance Checks

- booking availability can be queried from backend truth for a bounded date window
- create and reschedule reject dates outside the supported booking horizon or against inactive or full slot definitions
- staff slot-definition management remains RBAC-gated to service advisers and super admins
- Swagger clearly documents live slot-management routes and any new availability route
- customer-facing clients can stop relying on generated next-month booking dates after this slice lands

## Out of Scope

- slot holds or reservations
- waitlists
- per-branch holiday calendars if no approved policy exists yet
- duration-based auto-packing across multiple adjacent slots
