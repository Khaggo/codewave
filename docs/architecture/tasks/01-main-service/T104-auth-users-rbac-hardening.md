# Auth Users RBAC Hardening

## Task ID

`T104`

## Title

Extend auth and users for RBAC and staff provisioning.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/auth.md`
- `../../domains/main-service/users.md`
- `../../rbac-policy.md`

## Depends On

- `T005`

## Goal

Add role-aware identity behavior, staff provisioning support, and staff-code handling without breaking the current auth and users reference quality.

## Deliverables

- role enum update
- staff provisioning and deactivation flows
- `staff_code` support and adviser identity contract

## Implementation Notes

- keep auth and users current-state accurate after implementation
- do not split identity into a new domain

## Acceptance Checks

- staff roles are persisted and validated
- planned admin endpoints have a documented implementation path

## Out of Scope

- job-order behavior
