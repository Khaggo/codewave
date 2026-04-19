# T502 Customer Booking Discovery Mobile Flow

## Slice ID

`T502`

## Source Of Truth

- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/domains/main-service/vehicles.md`
- `docs/architecture/tasks/05-client-integration/T502-customer-booking-discovery-mobile-flow.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- live booking controller: `backend/apps/main-service/src/modules/bookings/controllers/bookings.controller.ts`
- live vehicle controller: `backend/apps/main-service/src/modules/vehicles/controllers/vehicles.controller.ts`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `GET /api/services` | `live` | Swagger/controller | show active services customers can request |
| `GET /api/time-slots` | `live` | Swagger/controller | show selectable booking windows |
| `GET /api/users/:id/vehicles` | `live` | controller/domain | list owned vehicles eligible for booking |

## Discovery State Model

| State | Meaning |
| --- | --- |
| `ready` | services, active slots, and owned vehicles are available |
| `no_services` | services list is empty, so booking cannot continue |
| `no_time_slots` | no slot definitions are available |
| `unavailable_time_slots` | slots exist but all are inactive |
| `no_owned_vehicles` | customer needs an owned vehicle before booking |
| `unauthorized` | customer session is missing or invalid when loading owned vehicles |
| `load_failed` | network or API load failed |

## Frontend Contract Files

- `frontend/src/lib/api/generated/bookings/requests.ts`
- `frontend/src/lib/api/generated/bookings/responses.ts`
- `frontend/src/lib/api/generated/bookings/discovery.ts`
- `frontend/src/lib/api/generated/bookings/surface-states.ts`
- `frontend/src/mocks/bookings/mocks.ts`
- `mobile/src/lib/bookingDiscoveryClient.js`

## Vehicle Selection Assumptions

- booking discovery may list only vehicles owned by the active customer
- the client must not treat a manually typed vehicle ID as eligible unless it appears in the owned-vehicle list
- missing owned vehicles should route the customer to vehicle onboarding, not booking submission
- slot discovery does not reserve or hold a slot

## Acceptance States

- happy discovery state with services, active slots, and owned vehicles
- empty service state
- empty time-slot state
- inactive time-slot state
- no-owned-vehicle state
- unauthorized owned-vehicle load state
- load-failed state

## Notes

- This slice stops before `POST /api/bookings`; booking submission belongs to `T503`.
- Discovery state is synchronous API truth. Reminder, queue, and staff decision states are not part of this mobile discovery slice.

