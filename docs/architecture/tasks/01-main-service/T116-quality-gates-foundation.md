# Quality Gates Foundation

## Task ID

`T116`

## Title

Build the quality-gates foundation.

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
- `../../ai-governance.md`
- `../../rbac-policy.md`

## Depends On

- `T006`
- `T106`
- `T107`

## Goal

Introduce the QA state model, audit records, and release-blocking workflow that sit between completed job orders and final release.

## Deliverables

- quality-gate tables and module
- QA status lifecycle
- release-blocking and override-ready state model

## Implementation Notes

- quality gates are separate from job-order execution
- background audits should use BullMQ

## Acceptance Checks

- completed job orders can enter QA state
- blocked QA state prevents release-finalization flow

## Out of Scope

- full semantic audit implementation
