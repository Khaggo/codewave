# Order History And Invoice Tracking Mobile Flow

## Task ID

`T526`

## Title

Integrate customer-mobile order history and invoice tracking.

## Type

`client-integration`

## Status

`done`

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

## Module Name

Order History / Invoice Tracking

## Description

Customer mobile ecommerce slice for reading invoice-backed order history, immutable order snapshots, invoice aging, and manual payment-entry tracking after checkout.

## Business Value

- lets customers confirm that ecommerce checkout actually produced an order and invoice record
- makes overdue, partially paid, settled, and cancelled invoice states visible without asking staff manually
- reduces confusion between cart state and post-checkout fulfillment state by giving the customer a dedicated tracking view
- keeps payment tracking transparent while still preserving the rule that settlement is a staff-recorded backend fact

## Login, Registration, And Booking Integration Points

- login provides the authenticated customer identity and bearer token required for order-history and invoice-tracking reads
- registration remains separate from ecommerce rules, but newly activated customers can immediately see invoice-backed orders created by their account
- booking history remains its own module; ecommerce order history must not merge into service-booking truth or slot state
- customer support and notification flows can deep-link into this read model after checkout or payment updates without needing cart mutation access

## Required Database/API Changes

- use the existing ecommerce routes from `T204` and `T205`: `GET /api/users/:id/orders`, `GET /api/orders/:id`, and `GET /api/orders/:id/invoice`
- no new schema or DTO change is required for this client integration slice
- keep payment-entry creation and invoice status mutation staff-owned even though customer mobile now reads those records
- document that manual payment-entry records are backend facts only and must not imply payment-gateway settlement

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
- `docs/contracts/T526-order-history-and-invoice-tracking-mobile-flow.md` documents the live order-history and invoice-tracking routes, runtime note, and customer read-only boundary

## Out of Scope

- cart mutation
- admin stock controls
