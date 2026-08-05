# vehicles

Last updated: 2026-08-05

## Domain ID

`main-service.vehicles`

## Agent Summary

Load this doc for vehicle master data, vehicle ownership, and reusable vehicle metadata. Skip it for lifecycle aggregation or inspection verification.

## Primary Objective

Maintain accurate vehicle records and ownership history so downstream modules can reference vehicles without redefining vehicle identity.

## Inputs

- customer or staff vehicle registration requests
- ownership transfer requests
- vehicle metadata updates

## Outputs

- canonical vehicle records
- ownership history
- reusable vehicle metadata for operations

## Dependencies

- `main-service.users`

## Owned Data / ERD

Primary tables or equivalents:
- `vehicles`
- `vehicle_ownership_history`
- optional reference tables for make, model, fuel type, or transmission type

Key relations:
- one user may own many vehicles
- one vehicle may participate in many bookings, inspections, insurance inquiries, job orders, and lifecycle events

## Primary Business Logic

- create and update vehicle records
- enforce uniqueness for plate or VIN rules where required
- support customer ownership changes without losing historical references
- expose vehicle metadata to bookings, inspections, and lifecycle views
- assign a database-owned immutable `publicReference` in the form `VEH-YYYY-NNNNNN`
- return `publicReference` to authorized staff/customer projections; never derive a visible
  reference from a UUID, hash fragment, or mutable plate

## Process Flow

1. User or staff registers a vehicle.
2. Vehicle becomes available for booking, insurance, and tracking.
3. Operations attach inspections, job orders, and back jobs to the vehicle.
4. Lifecycle consolidates these events into a readable history.

## Use Cases

- customer registers a vehicle
- staff confirms a vehicle during booking or intake
- admin reviews all work tied to one vehicle

## API Surface

- `POST /vehicles`
- `GET /vehicles/:id`
- `PATCH /vehicles/:id`
- `GET /users/:id/vehicles`
- `POST /vehicles/:id/transfer-owner`

Vehicle response projections include the persisted `publicReference`. Legacy rows without a
reference render `Reference unavailable` at the client boundary until the additive backfill is
completed; internal UUIDs remain relationship and routing fields only.

## Edge Cases

- same plate encoded twice with formatting differences
- vehicle ownership changes after prior bookings exist
- customer attempts to access another user's vehicle
- missing core metadata blocks downstream workflows
- legacy or malformed public references must not fall back to an internal identifier

## Writable Sections

- vehicle identity rules, ownership behavior, metadata requirements, and vehicle APIs
- do not edit lifecycle aggregation or inspection-verification policy here

## Out of Scope

- booking state
- inspection verification
- service history read-model ownership
