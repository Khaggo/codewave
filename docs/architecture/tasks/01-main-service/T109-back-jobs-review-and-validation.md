# Back Jobs Review And Validation

## Task ID

`T109`

## Title

Harden back-job review and service-history validation.

## Type

`domain`

## Status

`done`

## Priority

`medium`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/back-jobs.md`
- `../../domains/main-service/job-orders.md`

## Depends On

- `T106`

## Goal

Strengthen back-job intake so return cases are validated against prior service history before rework proceeds.

## Deliverables

- service-history validation rules
- review statuses before rework
- better linkage to original job orders

## Implementation Notes

- not every repeat visit is a back job
- keep inspection evidence and lineage explicit

## Acceptance Checks

- invalid rework lineage is rejected
- validated back jobs can flow into job orders cleanly

## Out of Scope

- QA scoring
