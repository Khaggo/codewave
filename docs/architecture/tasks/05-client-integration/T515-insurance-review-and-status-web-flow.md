# Insurance Review And Status Web Flow

## Task ID

`T515`

## Title

Integrate staff-admin web insurance review, queue handling, and claim status updates.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/insurance.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T514`

## Goal

Define the staff-web insurance queue and status update workflow for service advisers and super admins.

## Deliverables

- insurance review contract pack
- claim queue and detail web states
- status-update and note-entry mocks

## Implementation Notes

- keep staff review states distinct from customer-visible claim summaries
- role restrictions must be explicit in both navigation and action availability
- do not add insurer-integration assumptions not present in the backend

## Acceptance Checks

- queue and status update flows align to live insurance contracts
- role failures are distinct from missing-record failures
- customer-only fields are not treated as editable staff state

## Out of Scope

- customer intake UX
- payout or external insurer settlement behavior

