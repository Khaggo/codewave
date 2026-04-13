# Quality Gate 2 Discrepancy Risk Engine

## Task ID

`T118`

## Title

Implement Gate 2 discrepancy and risk scoring.

## Type

`domain`

## Status

`ready`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/quality-gates.md`
- `../../domains/main-service/inspections.md`

## Depends On

- `T116`

## Goal

Score release risk using rule-based comparisons across inspections, job-order evidence, and service history.

## Deliverables

- discrepancy rules
- risk score calculation
- blocking thresholds and findings

## Implementation Notes

- keep this gate rule-based even if other QA support uses AI
- findings must be explainable for staff review

## Acceptance Checks

- risk scoring can block a release-ready job order
- discrepancy findings reference real evidence

## Out of Scope

- semantic prompt design
