# RBAC Policy And Permission Matrix

## Task ID

`T005`

## Title

Define RBAC policy and permission matrix.

## Type

`foundation`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../rbac-policy.md`
- `../system-architecture.md`
- `../domains/main-service/auth.md`
- `../domains/main-service/users.md`

## Depends On

- `T004`

## Goal

Turn the PM role set into an implementation-ready RBAC matrix covering customer, technician, service adviser, and super admin behavior.

## Deliverables

- permission matrix by role and action
- staff provisioning and deactivation rules
- adviser identifier snapshot guidance

## Implementation Notes

- keep auth and users as the identity-owning domains
- service adviser snapshots must flow into job orders and invoices

## Acceptance Checks

- RBAC rules are documented without conflicting role names
- later domain tasks can reference one canonical permission source

## Out of Scope

- actual endpoint guards or DB migrations
