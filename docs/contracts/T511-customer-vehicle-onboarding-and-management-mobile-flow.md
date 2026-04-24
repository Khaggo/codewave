# T511 Customer Vehicle Onboarding And Management Mobile Flow

## Slice ID

`T511`

## Source Of Truth

- `docs/architecture/domains/main-service/vehicles.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T511-customer-vehicle-onboarding-and-management-mobile-flow.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/vehicles/controllers/vehicles.controller.ts`
- mobile helpers: `mobile/src/lib/authClient.js`, `mobile/src/lib/bookingDiscoveryClient.js`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `POST /api/vehicles` | `live` | Swagger/controller | create the first owned vehicle during post-activation onboarding or add another owned vehicle later |
| `GET /api/vehicles/:id` | `live` | Swagger/controller | load one owned vehicle detail without redefining the transport shape in the mobile app |
| `PATCH /api/vehicles/:id` | `live` | Swagger/controller | update one owned vehicle record through backend-owned uniqueness rules |
| `GET /api/users/:id/vehicles` | `live` | Swagger/controller | load the canonical owned-vehicle list used by booking, insurance, and timeline-adjacent slices |

## Customer Vehicle Onboarding States

| State | Meaning |
| --- | --- |
| `first_vehicle_required` | the active customer account has no owned vehicle yet, so onboarding cannot finish |
| `first_vehicle_ready` | at least one owned vehicle exists and the first-vehicle requirement is satisfied |
| `first_vehicle_saving` | the create-vehicle request is in flight during onboarding |
| `vehicle_validation_error` | the submitted create or update payload is invalid |
| `duplicate_plate_conflict` | the plate number already belongs to another canonical vehicle record |
| `vehicle_forbidden` | the mobile session is missing or the vehicle route is blocked for the current identity |

## Customer Vehicle Management States

| State | Meaning |
| --- | --- |
| `owned_vehicle_list_empty` | the customer has no owned vehicles to manage yet |
| `owned_vehicle_list_ready` | the customer has at least one owned vehicle available for downstream slices |
| `primary_vehicle_ready` | the mobile surface can derive one primary vehicle from the canonical owned list |
| `vehicle_update_saving` | a live vehicle update request is in flight |
| `vehicle_not_found` | the requested vehicle record does not exist anymore |
| `vehicle_load_failed` | a non-classified network or API error prevented the vehicle list or detail from loading |

## Frontend Contract Files

- `frontend/src/lib/api/generated/vehicles/requests.ts`
- `frontend/src/lib/api/generated/vehicles/responses.ts`
- `frontend/src/lib/api/generated/vehicles/errors.ts`
- `frontend/src/lib/api/generated/vehicles/customer-mobile-vehicles.ts`
- `frontend/src/lib/api/generated/bookings/discovery.ts`
- `frontend/src/mocks/vehicles/mocks.ts`
- `mobile/src/lib/authClient.js`
- `mobile/src/lib/bookingDiscoveryClient.js`

## Contract Rules

- owned vehicles are canonical records with their own IDs; customer-mobile must not treat vehicle identity as profile-only fields
- first-vehicle onboarding and later vehicle management use the same backend transport shape
- booking discovery should reuse the shared vehicle response contract instead of duplicating vehicle field names under a second interface
- ownership checks remain backend-owned; the client may list only vehicles returned by `GET /api/users/:id/vehicles`
- duplicate-plate handling must remain an explicit conflict state, not a generic save failure
- flattened compatibility fields like `licensePlate`, `vehicleMake`, and `vehicleModel` may still exist in mobile account state for display, but they must be derived from the primary owned vehicle rather than acting as the source of truth

## Acceptance States

- first vehicle required
- first vehicle ready
- owned vehicle list empty
- owned vehicle list ready
- primary vehicle ready
- duplicate plate conflict
- vehicle validation error

## Notes

- This slice aligns customer-mobile onboarding and later vehicle-management boundaries; it does not add inspection or lifecycle read-model behavior.
- Booking discovery now shares the canonical vehicle response shape with the dedicated vehicles contract layer.
- The current mobile UI may still render one primary vehicle prominently, but that view must be derived from the owned-vehicle list.
