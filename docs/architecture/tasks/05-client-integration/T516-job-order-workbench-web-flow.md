# Job Order Workbench Web Flow

## Task ID

`T516`

## Title

Integrate staff-admin web job-order workbench and operational handoff from bookings.

## Type

`client-integration`

## Status

`ready`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/job-orders.md`
- `../../domains/main-service/bookings.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T506`
- `T106`

## Goal

Define the staff-web workbench for creating, reading, and managing job orders from confirmed operational intake.

## Deliverables

- job-order workbench contract pack
- booking-to-job-order handoff states
- job-order read and status update web states
- mocks for assignment, active work, and blocked handoff cases

## Implementation Notes

- keep booking truth and job-order truth separate even when surfaced in one staff view
- use live job-order create, read, and status routes only
- assignment visibility should follow role and ownership rules

## Acceptance Checks

- job-order workbench actions match live DTOs and RBAC
- booking handoff does not duplicate booking logic inside job orders
- blocked or duplicate job-order creation states are explicit

## Out of Scope

- photo evidence upload
- QA release and override actions

