# Cart And Invoice Checkout Mobile Flow

## Task ID

`T525`

## Title

Integrate customer-mobile cart management and invoice checkout.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/ecommerce/cart.md`
- `../../domains/ecommerce/orders.md`
- `../../domains/ecommerce/invoice-payments.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T524`
- `T203`

## Goal

Define the customer-mobile cart and invoice-checkout experience from cart mutation through checkout request and order creation.

## Deliverables

- cart and checkout contract pack
- cart-empty, invoice-preview, and checkout-complete states
- mocks for quantity conflict, missing item, and checkout validation cases

## Implementation Notes

- invoice-only checkout remains canonical
- cart state must not imply payment settlement
- immutable order snapshot behavior should be visible in post-checkout contract expectations

## Acceptance Checks

- cart and checkout flows align with live contracts
- invoice preview and order-created states are explicit
- conflict and validation errors remain distinct from generic failures

## Out of Scope

- purchase history screens
- payment gateway settlement

