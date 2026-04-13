# Inspections V1

## Task ID

`T102`

## Title

Implement the first inspection-backed verification layer for vehicles and bookings.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/inspections.md`
- `../../domains/main-service/vehicles.md`
- `../../domains/main-service/bookings.md`
- `../../api-strategy.md`

## Depends On

- `T101`
- existing `main-service.vehicles`

## Goal

Implement `main-service.inspections` so the system can record intake, completion, and return verification events that later domains can trust as condition-based evidence.

## Deliverables

- `inspections` module with schema, repository, service, controller, and DTOs
- inspection types and status handling consistent with the domain doc
- vehicle-scoped inspection endpoints
- Swagger coverage for public inspection endpoints
- tests for inspection creation and lookup behavior

## Implementation Notes

- keep inspections tied to vehicles and optionally to bookings or back jobs
- this domain should own verification records, not full lifecycle projection logic
- make attachments metadata-ready if the implementation needs upload references later, but do not block v1 on file storage
- keep the API minimal: create and list inspections first

## Acceptance Checks

- `POST /vehicles/:id/inspections` and `GET /vehicles/:id/inspections` are implemented and documented
- inspection records require valid vehicle context
- invalid references are rejected cleanly
- inspection tests cover at least one happy path and one failure path

## Out of Scope

- lifecycle timeline materialization
- back-job resolution flow
- notification scheduling
- external document storage integration
