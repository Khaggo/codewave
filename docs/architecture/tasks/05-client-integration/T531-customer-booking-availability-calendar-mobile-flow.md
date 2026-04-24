# Customer Booking Availability Calendar Mobile Flow

## Task ID

`T531`

## Title

Integrate customer-mobile booking availability calendar from live backend availability truth.

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
- `../01-main-service/T123-booking-availability-window-and-slot-definition-governance.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T123`
- `T502`
- `T503`

## Goal

Replace mobile’s locally generated booking-date window with live `main-service.bookings` availability reads so the customer calendar reflects bookable, limited, full, and out-of-window days from backend truth.

## Module Name

`customer-mobile bookings`

## Description

Wire the mobile booking screen to `GET /api/bookings/availability`, normalize the returned date and slot-capacity view into stable mobile state, and update the booking date selector so customers can page through backend-approved availability instead of using a hardcoded next-month window.

## Business Value

- removes fake date availability from the customer app
- supports a larger, policy-driven booking horizon without forcing users to guess dates
- reduces failed booking submissions caused by stale local calendar assumptions

## Deliverables

- typed or curated contract pack for the live booking-availability route
- mobile API client normalization for availability days and slot summaries
- booking calendar UI that pages through backend-approved windows and shows explicit availability states
- refresh and conflict-handling behavior that re-reads live availability after failed create attempts

## Integration Points With Login, Registration, And Booking

- customer login remains required because availability reads should use an active customer session alongside owned-vehicle booking flow
- registration and onboarding still provide the owned vehicle needed for booking create, but date truth now comes from backend availability instead of mobile utilities
- booking create should submit a date chosen from the live availability route and recover cleanly when backend capacity changes between read and create

## Required DB/API Changes

- no new database tables are required if `T123` is complete
- consume live `GET /api/bookings/availability`
- continue consuming `GET /api/time-slots`, `GET /api/services`, `GET /api/users/:id/vehicles`, and `POST /api/bookings`
- if mobile later needs slot-specific or branch-specific filters beyond `T123`, document them as follow-up API gaps instead of inventing client-only query behavior

## Suggested Implementation Order

1. Add the live availability route contract and client normalizer.
2. Replace local booking date bounds and generated calendar assumptions in mobile state.
3. Update the booking date UI to page through backend-driven availability windows.
4. Re-run booking create and conflict-refresh flows against the live availability state.
5. Export Expo and verify customer booking discovery manually.

## Implementation Notes

- keep slot holds out of scope unless the backend truly implements them
- do not silently fall back to generated open days when the availability route fails
- preserve the existing web/mobile split: this slice is customer-mobile only

## Acceptance Checks

- mobile booking discovery reads date availability from live backend truth
- local helpers no longer define the authoritative booking window
- bookable, limited, full, and out-of-window states are explicit in the mobile UI model
- customer can navigate beyond a single hardcoded month when backend policy allows it
- booking create still handles late slot conflicts by refreshing availability instead of masking the error

## Out of Scope

- staff slot-definition management UI
- slot holds or reservations
- web booking calendar redesign
