# Inventory And Stock Visibility Web Flow

## Task ID

`T527`

## Title

Integrate staff-admin web inventory and stock visibility.

## Type

`client-integration`

## Status

`ready`

## Priority

`low`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/ecommerce/inventory.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T202`
- `T203`

## Goal

Define the staff-web inventory visibility flow, using live stock contracts where available and clearly labeling planned stock controls where they are not yet exposed.

## Deliverables

- inventory visibility contract pack
- stock-state glossary labeled `live` or `planned`
- web mocks for in-stock, low-stock, reserved, and out-of-stock cases

## Implementation Notes

- do not invent inventory write behavior not present in the backend
- live and planned stock controls must be separated clearly
- stock visibility should remain distinct from catalog exposure rules

## Acceptance Checks

- inventory views distinguish live and planned routes explicitly
- low-stock and reserved states are modeled without hidden client logic
- no undocumented stock mutation actions appear in the pack

## Out of Scope

- procurement workflows
- catalog merchandising rules

