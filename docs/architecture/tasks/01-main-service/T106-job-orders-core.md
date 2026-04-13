# Job Orders Core

## Task ID

`T106`

## Title

Build the core job-orders domain.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/job-orders.md`
- `../../rbac-policy.md`

## Depends On

- `T105`

## Goal

Introduce digital job orders as the primary workshop execution record for service advisers and technicians.

## Deliverables

- job-order tables and module skeleton
- create/read/status endpoints
- adviser snapshot and technician assignment model
- frontend-ready contract pack and mock set for the slice

## Implementation Notes

- service adviser snapshot must be immutable on the job order
- job orders become the handoff point to QA and invoice generation

## Acceptance Checks

- job orders can be created from valid operational intake
- status transitions remain separate from booking status
- contract pack clearly marks create/read/status routes as live and later routes as planned

## Out of Scope

- QA scoring
