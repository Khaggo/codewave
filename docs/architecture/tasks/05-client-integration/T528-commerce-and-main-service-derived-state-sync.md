# Commerce And Main Service Derived State Sync

## Task ID

`T528`

## Title

Align client-visible derived states across ecommerce and main-service boundaries.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/ecommerce/commerce-events.md`
- `../../domains/main-service/notifications.md`
- `../../domains/main-service/loyalty.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-async-orchestration.md`

## Depends On

- `T520`
- `T521`
- `T526`
- `T301`
- `T303`
- `T304`
- `T305`

## Goal

Define how customer-visible derived states stay consistent when commerce and main-service data move through events, jobs, and read models.

## Deliverables

- derived-state sync contract pack
- cross-service read-model glossary
- mocks for stale, pending-sync, and fully-synced cases

## Implementation Notes

- derive visibility from explicit events and read models, not hidden cross-service joins
- customer-facing wording should not imply strict immediate consistency where the system is async
- loyalty, notifications, and invoice-derived states must stay traceable to their source domains

## Acceptance Checks

- derived states are labeled as async where appropriate
- no client flow assumes direct cross-service foreign-key behavior
- stale or pending-sync states are explicit in the contract pack

## Out of Scope

- backend event bus implementation
- analytics dashboard design details

