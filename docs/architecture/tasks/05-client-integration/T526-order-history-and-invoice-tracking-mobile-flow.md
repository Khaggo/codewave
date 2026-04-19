# Order History And Invoice Tracking Mobile Flow

## Task ID

`T526`

## Title

Integrate customer-mobile order history and invoice tracking.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/ecommerce/orders.md`
- `../../domains/ecommerce/invoice-payments.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T525`
- `T204`
- `T205`

## Goal

Define the customer-mobile post-checkout read model for order history, order status progression, invoice aging, and payment-record tracking.

## Deliverables

- order-history and invoice-tracking contract pack
- typed status-history and invoice-aging views
- mocks for partially paid, fully paid, overdue, and cancelled invoice states

## Implementation Notes

- payment tracking remains record-only and must not imply payment-gateway settlement
- order history and invoice tracking should preserve immutable checkout snapshot behavior
- invoice status changes should be shown as backend facts

## Acceptance Checks

- order-history and invoice screens use live DTOs and status models
- partially paid and overdue states are explicit
- no hidden payment-gateway assumptions appear in the client contract

## Out of Scope

- cart mutation
- admin stock controls

