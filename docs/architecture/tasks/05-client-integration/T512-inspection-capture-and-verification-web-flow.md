# Inspection Capture And Verification Web Flow

## Task ID

`T512`

## Title

Integrate staff-admin web inspection capture and verification handling.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/inspections.md`
- `../../domains/main-service/vehicles.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T511`
- `T102`

## Goal

Define the staff-web inspection workflow for creating inspection records, reading inspection history, and surfacing verification outcomes.

## Deliverables

- inspection capture contract pack
- inspection list and detail web states
- verification-aware success and failure mocks

## Implementation Notes

- use live inspection APIs only
- inspection verification state must remain distinct from lifecycle-summary review state
- technician and adviser visibility should follow RBAC rather than client guesses

## Acceptance Checks

- inspection capture and read flows use documented DTOs
- verified and non-verified inspection states are shown distinctly
- forbidden role and missing-vehicle failures are explicit

## Out of Scope

- vehicle timeline summaries
- job-order progress logging

