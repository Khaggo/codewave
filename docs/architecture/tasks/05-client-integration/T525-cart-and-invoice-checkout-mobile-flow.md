# Cart And Invoice Checkout Mobile Flow

## Task ID

`T525`

## Title

Integrate customer-mobile cart management and invoice checkout.

## Type

`client-integration`

## Status

`done`

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

## Module Name

Cart / Invoice Checkout

## Description

Customer mobile ecommerce slice for live cart reads and mutations, immutable checkout preview, billing-address capture, and invoice-backed order creation through ecommerce-service.

## Business Value

- lets customers move from product discovery into a real shop cart without leaving the mobile dashboard
- creates invoice-backed orders without pretending payment has already been settled
- preserves a clean handoff from customer intent to staff invoice tracking and fulfillment
- keeps ecommerce checkout separate from service booking while still allowing both modules to coexist in one customer app

## Login, Registration, And Booking Integration Points

- login provides the authenticated customer identity and bearer token required for cart and checkout routes
- registration remains separate from ecommerce checkout rules, but newly activated customers can reuse their account profile details as billing defaults
- booking continues to use service, slot, and vehicle routes only; ecommerce cart state must not reserve booking slots or mutate booking truth
- order creation from invoice checkout should remain customer-owned and independent from staff booking workflows

## Required Database/API Changes

- use the existing ecommerce cart and order routes from `T203`: `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:itemId`, `DELETE /api/cart/items/:itemId`, `POST /api/cart/checkout-preview`, and `POST /api/checkout/invoice`
- no new backend schema or DTO change is required for this client integration slice
- keep invoice settlement, order history, and payment-entry tracking in later tasks even though the backing routes already exist
- customer mobile may derive ecommerce-service from the main API host by switching to port `3001`, or use `EXPO_PUBLIC_ECOMMERCE_API_BASE_URL` explicitly

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
- `docs/contracts/T525-cart-and-invoice-checkout-mobile-flow.md` documents the live cart and invoice routes, runtime note, and next-slice order-history boundary

## Out of Scope

- purchase history screens
- payment gateway settlement
