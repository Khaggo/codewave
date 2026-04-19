# Back Jobs Review And Rework Web Flow

## Task ID

`T519`

## Title

Integrate staff-admin web back-job review, validation, and rework handling.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/back-jobs.md`
- `../../domains/main-service/job-orders.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T518`
- `T109`

## Goal

Define the staff-web flow for reviewing returned work, validating findings, and tracking rework outcomes back to the originating job context.

## Deliverables

- back-job contract pack
- rework and validation web states
- mock fixtures for open, validated, resolved, and disputed back-job cases

## Implementation Notes

- preserve original job linkage and parent context
- keep back-job review separate from the primary QA gate flow even when the screens are adjacent
- customer-facing visibility should not be introduced here

## Acceptance Checks

- back-job views use documented routes and fields only
- original-work linkage remains visible in the client contract
- resolved and unresolved rework states are explicit

## Out of Scope

- technician execution logging
- loyalty or analytics reactions

