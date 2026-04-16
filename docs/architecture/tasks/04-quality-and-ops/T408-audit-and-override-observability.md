# Audit And Override Observability

## Task ID

`T408`

## Title

Add observability for audits and manual overrides.

## Type

`quality`

## Status

`done`

## Priority

`medium`

## Owner Role

`test-worker`

## Source of Truth

- `../../rbac-policy.md`
- `../../domains/main-service/quality-gates.md`
- `../../domains/main-service/analytics.md`

## Depends On

- `T119`
- `T113`

## Goal

Make sensitive staff actions such as overrides, role changes, and release decisions visible to audit and analytics consumers.

## Deliverables

- audit event definitions
- observability or analytics hooks
- regression checks for audit completeness

## Implementation Notes

- audit signals must not replace source-of-truth writes
- preserve actor, timestamp, and reason fields

## Acceptance Checks

- override events and staff admin actions produce traceable audit records
- analytics can consume the audit stream without owning the write path

## Out of Scope

- full SIEM integration
