# T531 Customer Booking Availability Calendar Mobile Flow

## Slice ID

`T531`

## Source Of Truth

- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/01-main-service/T123-booking-availability-window-and-slot-definition-governance.md`
- `docs/architecture/tasks/05-client-integration/T531-customer-booking-availability-calendar-mobile-flow.md`
- live controller: `backend/apps/main-service/src/modules/bookings/controllers/bookings.controller.ts`
- mobile booking boundary: `mobile/src/lib/bookingDiscoveryClient.js`
- mobile booking surface: `mobile/src/screens/Dashboard.js`

## Route Status

| Route | Status | Source | Customer-Mobile Purpose |
| --- | --- | --- | --- |
| `GET /api/services` | `live` | Swagger/controller | load active booking services |
| `GET /api/time-slots` | `live` | Swagger/controller | load active slot definitions |
| `GET /api/users/:id/vehicles` | `live` | Swagger/controller | load the authenticated customer's owned vehicles |
| `GET /api/bookings/availability` | `live` | Swagger/controller | load backend-owned bookable date windows and per-slot capacity states |
| `POST /api/bookings` | `live` | Swagger/controller | submit the selected vehicle, service, slot, and date as a pending booking request |

## Mobile Surface

- customer booking tab: `mobile/src/screens/Dashboard.js`
- mobile API boundary: `mobile/src/lib/bookingDiscoveryClient.js`

## Frontend Contract Files

- `frontend/src/lib/api/generated/bookings/requests.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/bookings/discovery.ts`
- `frontend/src/lib/api/generated/bookings/errors.ts`
- `frontend/src/lib/api/generated/bookings/surface-states.ts`
- `frontend/src/lib/api/generated/regression/client-regression-pack.ts`
- `frontend/src/mocks/bookings/mocks.ts`

## Availability States To Cover

- availability window loading while mobile requests `GET /api/bookings/availability`
- bookable day where the selected slot still has capacity
- limited day where some capacity remains but the window is under pressure
- full day where the selected slot or all slots are exhausted
- no-active-slots day where the slot-definition surface is live but no customer-bookable capacity exists
- outside-window day from backend-owned min/max booking rules
- conflict recovery after `POST /api/bookings` returns `409` and the client re-reads live availability

## Contract Rules

- mobile must not generate open dates locally
- backend `minBookableDate` and `maxBookableDate` own the supported horizon
- the mobile screen may page availability windows, but it must keep the chosen date inside backend-approved bounds
- per-slot capacity comes from the availability response; selecting a time slot does not reserve it
- booking create remains pending-only and does not imply staff acceptance

## Known API Gap

- mobile currently reads the unfiltered availability window and derives selected-slot display from each day's slot array; if product later needs service-specific or branch-specific filtering, document that as a new backend task instead of inventing client-only query flags
