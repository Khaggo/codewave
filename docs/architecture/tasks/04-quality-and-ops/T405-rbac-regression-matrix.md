# RBAC Regression Matrix

## Task ID

`T405`

## Title

Build the RBAC regression matrix.

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
- `../../domains/main-service/auth.md`
- `../../domains/main-service/users.md`

## Depends On

- `T104`

## Goal

Create regression coverage that proves customer, technician, service adviser, and super admin permissions stay separated across the main-service APIs.

## Deliverables

- role-by-route regression matrix
- automated authorization tests
- denial-case coverage

## Implementation Notes

- include override and provisioning paths when they exist
- prefer matrix-style tests for consistency

## Acceptance Checks

- each role has explicit allow and deny cases
- privileged routes fail closed for lower roles

## Out of Scope

- UI role presentation
