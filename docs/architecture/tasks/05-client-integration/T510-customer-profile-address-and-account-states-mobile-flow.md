# Customer Profile Address And Account States Mobile Flow

## Task ID

`T510`

## Title

Integrate customer-mobile profile, addresses, and account-state handling.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/users.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T507`
- `T508`

## Goal

Define the customer-mobile profile and address experience after activation, including editable profile states and default-address behavior.

## Deliverables

- profile and address contract pack
- address CRUD and default-address state model
- account-state handling for active versus deactivated customer accounts
- mocks for incomplete profile, no addresses, and address-conflict paths

## Implementation Notes

- use the live users and addresses endpoints only
- default-address switching behavior must follow backend rules rather than client heuristics
- keep profile completeness separate from auth activation completeness

## Acceptance Checks

- profile and address screens use only documented DTO fields
- default-address behavior is explicit and testable in the mocks
- empty, validation, and forbidden states are distinct

## Out of Scope

- vehicle management
- booking submission

