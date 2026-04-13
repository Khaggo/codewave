# PM Feature Alignment SSoT

## Task ID

`T004`

## Title

Align canonical docs with the PM feature set.

## Type

`foundation`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../README.md`
- `../system-architecture.md`
- `../domain-map.md`
- `../api-strategy.md`

## Depends On

- none

## Goal

Update the canonical architecture docs so PM-approved features, renamed domains, AI scope, and invoice-only handling are reflected consistently across the SSoT.

## Deliverables

- refreshed control-plane docs
- renamed `job-orders` domain and new `quality-gates` domain
- expanded task queue aligned with PM priorities

## Implementation Notes

- PM wording supersedes older generic wording where they conflict
- AI stays canonical Phase 2, not immediate core delivery
- no firmware or device scope should be introduced

## Acceptance Checks

- `npm run docs:validate`
- `job-monitoring` no longer appears in canonical docs

## Out of Scope

- backend code changes for RBAC or AI features
