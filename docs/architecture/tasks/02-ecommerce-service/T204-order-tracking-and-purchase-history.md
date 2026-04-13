# Order Tracking And Purchase History

## Task ID

`T204`

## Title

Add order tracking and purchase history.

## Type

`domain`

## Status

`ready`

## Priority

`medium`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/ecommerce/orders.md`
- `../../domains/ecommerce/invoice-payments.md`

## Depends On

- `T203`

## Goal

Provide customer and admin visibility into order lifecycle, invoice status, and purchase history.

## Deliverables

- order status updates
- purchase history reads
- invoice-linked order tracking views

## Implementation Notes

- customer reads should remain scoped to owned orders
- invoice tracking should stay separate from settlement

## Acceptance Checks

- orders can be queried by customer and status
- purchase history reflects invoice-backed orders accurately

## Out of Scope

- loyalty calculations
