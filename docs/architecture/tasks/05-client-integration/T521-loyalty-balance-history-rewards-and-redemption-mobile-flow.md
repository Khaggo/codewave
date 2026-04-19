# Loyalty Balance History Rewards And Redemption Mobile Flow

## Task ID

`T521`

## Title

Integrate customer-mobile loyalty balance, history, reward catalog, and redemption flow.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/loyalty.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T112`
- `T303`

## Goal

Define the customer-mobile loyalty experience from balance and transaction history through reward selection and redemption outcomes.

## Deliverables

- loyalty mobile contract pack
- reward catalog and redemption state model
- mocks for zero balance, partial history, eligible redemption, and insufficient-points cases

## Implementation Notes

- points should appear as service and purchase outcome facts, not booking-side accrual
- reward eligibility must stay ledger-backed and server-owned
- redemption should not imply hidden invoice or booking coupling outside the backend contract

## Acceptance Checks

- loyalty views use documented balance, history, and reward contracts
- insufficient-points and disabled-reward states are explicit
- accrual history labels stay aligned with the domain doc

## Out of Scope

- admin reward management screens
- analytics aggregation

