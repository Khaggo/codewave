# inventory

## Purpose

Own stock quantities, reservations, stock movements, and inventory corrections for e-commerce products.

## Owned Data / ERD

Primary tables or equivalents:
- `inventory_items`
- `inventory_reservations`
- `inventory_movements`

Key relations:
- one product has one inventory item record and many movement records
- carts or checkout may create short-lived reservations
- orders confirm or release reservations depending on outcome

Core fields:
- product ID
- on-hand quantity
- reserved quantity
- available quantity derived or stored
- reorder threshold if needed

## Primary Business Logic

- keep stock counts accurate
- reserve stock during checkout preparation when policy requires it
- release reservations on expiration or cancellation
- record manual adjustments and audit trails
- emit inventory-related events when stock changes matter downstream

## Process Flow

1. Product stock is initialized or adjusted
2. Checkout may request reservation
3. Order confirmation consumes stock
4. Cancellation or timeout releases reservations
5. Analytics and catalog read updated availability

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

## Dependencies

- `catalog`
- `orders`
- `commerce-events`
- `analytics`

## Out of Scope

- product content management
- order invoice ownership
- customer cart persistence details
