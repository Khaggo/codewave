# Quality Gate Manual Override

## Task ID

`T119`

## Title

Add manual override flow for blocked quality gates.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/quality-gates.md`
- `../../rbac-policy.md`

## Depends On

- `T116`
- `T117`
- `T118`

## Goal

Allow authorized staff to override blocked QA states with explicit reason capture and full audit visibility.

## Deliverables

- override endpoint
- override audit model
- release-unblock rules after approved override

## Implementation Notes

- only allowed staff roles may override
- override reason and actor identity are mandatory

## Acceptance Checks

- unauthorized users cannot override QA blocks
- approved overrides leave a durable audit trail

## Out of Scope

- silent or implicit overrides
