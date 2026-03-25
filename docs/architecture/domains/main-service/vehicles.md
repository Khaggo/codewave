# vehicles

## Purpose

Own vehicle master records, customer-to-vehicle ownership, and reusable vehicle metadata used by service and lifecycle modules.

## Owned Data / ERD

Primary tables or equivalents:
- `vehicles`
- `vehicle_ownership_history`
- optional reference tables for make, model, fuel type, or transmission type

Key relations:
- one user may own many vehicles
- one vehicle may participate in many bookings, inspections, insurance inquiries, job orders, and lifecycle events

Core fields:
- owner user ID
- plate number or unique identifier
- make, model, year
- color
- VIN or chassis number if applicable
- mileage snapshot fields if captured operationally

## Primary Business Logic

- create and update vehicle records
- enforce uniqueness for plate/VIN rules where required
- support customer ownership changes without losing historical references
- expose vehicle metadata to bookings, inspections, and lifecycle views

## Process Flow

1. User or staff registers a vehicle
2. Vehicle becomes available for booking, insurance, and tracking
3. Operations attach inspections, job orders, and back jobs to the vehicle
4. Lifecycle consolidates these events into a readable history

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

## Edge Cases

- same plate encoded twice with formatting differences
- vehicle ownership changes after prior bookings exist
- customer attempts to access another user's vehicle
- missing core metadata blocks downstream workflows

## Dependencies

- `users`
- referenced by `bookings`, `inspections`, `insurance`, `vehicle-lifecycle`, `back-jobs`, `job-monitoring`

## Out of Scope

- booking state
- inspection verification
- service history read-model ownership
