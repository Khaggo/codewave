# Quality Gates Review Release And Override Web Flow

## Task ID

`T518`

## Title

Integrate staff-admin web QA review, release, and override flow.

## Type

`client-integration`

## Status

`ready`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/quality-gates.md`
- `../../domains/main-service/job-orders.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T517`
- `T116`
- `T117`
- `T118`
- `T119`

## Goal

Define the staff-web QA experience for reading findings, understanding release blocks, and handling manual overrides under the correct authority.

## Deliverables

- QA contract pack
- QA findings, risk, and override web states
- release-blocked and override-audit mocks

## Implementation Notes

- AI-assisted outputs must never appear as final authority without the reviewer state
- override controls must remain super-admin-only in the client model
- keep QA findings visible even after override where the backend preserves them

## Acceptance Checks

- QA read and override views align with live contracts
- blocked, released, and overridden states are distinct
- override reasons and actor visibility are explicit

## Out of Scope

- analytics dashboards
- lifecycle summary customer visibility

