# Vehicle Lifecycle V1

## Task ID

`T103`

## Title

Implement the first hybrid vehicle lifecycle timeline backed by administrative events and inspection evidence.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/vehicle-lifecycle.md`
- `../../domains/main-service/bookings.md`
- `../../domains/main-service/inspections.md`
- `../../api-strategy.md`

## Depends On

- `T101`
- `T102`

## Goal

Implement `main-service.vehicle-lifecycle` so vehicles expose one timeline that distinguishes administrative system events from inspection-verified condition milestones.

## Deliverables

- lifecycle schema or projection store appropriate for timeline reads
- service logic to compose timeline entries from bookings and inspections
- `GET /vehicles/:id/timeline` endpoint
- explicit verified-vs-administrative markers in the returned timeline model
- tests for timeline composition and verification rules

## Implementation Notes

- verified lifecycle events must not exist without inspection evidence
- administrative events may be system-generated from bookings and related domains
- prefer a rebuildable projection or derived read model rather than hard-coding timeline truth into unrelated tables
- keep event refresh hooks lightweight until RabbitMQ and BullMQ integrations are introduced

## Acceptance Checks

- timeline endpoint returns both administrative and verified entries
- verified entries are linked to inspection-backed evidence
- timeline ordering is deterministic
- tests prove the domain rejects invalid verified entries without inspection support

## Out of Scope

- analytics dashboards
- loyalty triggers
- notification fan-out
- back-job reopening flow
