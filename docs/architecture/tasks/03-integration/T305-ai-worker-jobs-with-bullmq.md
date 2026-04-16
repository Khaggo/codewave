# AI Worker Jobs With BullMQ

## Task ID

`T305`

## Title

Run AI-assisted work through BullMQ workers.

## Type

`integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../ai-governance.md`
- `../../api-strategy.md`
- `../../domains/main-service/quality-gates.md`

## Depends On

- `T006`
- `T115`
- `T117`
- `T118`

## Goal

Standardize AI-assisted jobs under BullMQ so retries, observability, and failure handling stay explicit for lifecycle summaries and QA audits.

## Deliverables

- BullMQ job definitions for AI work
- worker orchestration rules
- provenance and retry metadata

## Implementation Notes

- provider failures must not block core writes
- each AI job should record review status and provenance

## Acceptance Checks

- AI jobs can be retried safely
- failure modes are visible without corrupting source-of-truth records

## Out of Scope

- provider-specific SDK decisions
