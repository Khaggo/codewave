# Cart And Invoice Checkout

## Task ID

`T203`

## Title

Implement cart flow and invoice checkout.

## Type

`domain`

## Status

`done`

## Priority

`medium`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/ecommerce/cart.md`
- `../../domains/ecommerce/orders.md`
- `../../api-strategy.md`

## Depends On

- `T202`

## Goal

Build the ecommerce cart flow and invoice-based checkout path without introducing payment-gateway settlement.

## Deliverables

- cart module
- checkout endpoint
- order creation from cart snapshots

## Implementation Notes

- keep checkout invoice-only
- reserve stock only through explicit inventory rules

## Acceptance Checks

- customers can move from cart to invoice checkout
- order snapshots remain stable after checkout

## Out of Scope

- online payment integration
