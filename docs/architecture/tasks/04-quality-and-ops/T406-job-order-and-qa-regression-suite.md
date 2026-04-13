# Job Order And QA Regression Suite

## Task ID

`T406`

## Title

Build regression coverage for job orders and QA.

## Type

`quality`

## Status

`ready`

## Priority

`high`

## Owner Role

`test-worker`

## Source of Truth

- `../../domains/main-service/job-orders.md`
- `../../domains/main-service/quality-gates.md`

## Depends On

- `T106`
- `T119`

## Goal

Protect the workshop release flow with automated regression tests covering job-order progress, QA blocks, and override behavior.

## Deliverables

- service and integration tests for job orders
- QA block and override coverage
- finalize-flow regression cases

## Implementation Notes

- include unauthorized override attempts
- include release-blocking behavior when QA is pending

## Acceptance Checks

- job orders cannot finalize incorrectly
- QA override behavior is fully regression-tested

## Out of Scope

- analytics assertions
