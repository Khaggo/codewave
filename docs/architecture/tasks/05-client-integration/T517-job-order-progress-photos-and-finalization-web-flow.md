# Job Order Progress Photos And Finalization Web Flow

## Task ID

`T517`

## Title

Integrate staff-admin web job-order progress, photo evidence, and finalization flow.

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
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T516`
- `T107`
- `T108`

## Goal

Define the staff-web execution flow for appending progress, attaching photo evidence, and finalizing invoice-ready work.

## Deliverables

- progress and evidence contract pack
- technician and adviser action-state model
- finalization success and blocked-state mocks

## Implementation Notes

- keep technician progress actions distinct from adviser finalization authority
- finalization must reflect QA readiness rather than treating invoice generation as always available
- photo evidence states should not imply media-storage implementation details

## Acceptance Checks

- progress, photo, and finalization actions use live routes and DTOs
- assigned-technician and adviser permissions are explicit
- blocked finalization states are distinct from generic validation errors

## Out of Scope

- QA review decision screens
- back-job rework handling

