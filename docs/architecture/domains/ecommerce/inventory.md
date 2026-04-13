# inventory

## Domain ID

`ecommerce.inventory`

## Agent Summary

Load this doc for stock counts, reservations, adjustments, and stock movement policy. Skip it for catalog content or invoice tracking.

## Primary Objective

Keep product availability accurate and reservation-safe so checkout and fulfillment do not oversell or silently lose stock state.

## Inputs

- stock initialization and adjustment requests
- reservation requests from checkout
- release and commit signals from order lifecycle

## Outputs

- inventory items
- reservations
- movement logs
- downstream stock events

## Dependencies

- `ecommerce.catalog`
- `ecommerce.orders`

## Owned Data / ERD

Primary tables or equivalents:
- `inventory_items`
- `inventory_reservations`
- `inventory_movements`

Key relations:
- one product has one inventory item record and many movement records
- carts or checkout may create short-lived reservations
- orders confirm or release reservations depending on outcome

## Primary Business Logic

- keep stock counts accurate
- reserve stock during checkout preparation when policy requires it
- release reservations on expiration or cancellation
- record manual adjustments and audit trails
- emit inventory-related events when stock changes matter downstream

## Process Flow

1. Product stock is initialized or adjusted.
2. Checkout may request reservation.
3. Order confirmation consumes stock.
4. Cancellation or timeout releases reservations.
5. Analytics and catalog read updated availability.

## Use Cases

- admin adjusts stock
- checkout reserves stock
- order completion reduces stock permanently
- dashboard identifies low-stock products

## API Surface

- `GET /inventory/products/:productId`
- `POST /inventory/adjustments`
- internal `reserveInventory`
- internal `releaseInventoryReservation`
- internal `commitInventoryReservation`

## Edge Cases

- overselling from concurrent checkout attempts
- stale reservation never released
- manual adjustment bypasses audit logging
- available quantity shown incorrectly because reserved quantity is stale

## Writable Sections

- stock semantics, reservation behavior, inventory APIs, and inventory edge cases
- do not redefine product content or invoice payment policy here

## Out of Scope

- product content management
- order invoice ownership
- customer cart persistence details
