# cart

## Domain ID

`ecommerce.cart`

## Agent Summary

Load this doc for pre-checkout cart lifecycle, cart items, and checkout-preview rules. Skip it for final order ownership or invoice state.

## Primary Objective

Maintain a correct active cart that can be converted into a valid order attempt without taking ownership of final checkout state.

## Inputs

- product add, update, and remove actions
- availability checks from inventory
- product metadata from catalog

## Outputs

- active carts
- cart items
- checkout-preview payloads for orders

## Dependencies

- `ecommerce.catalog`
- `ecommerce.inventory`

## Owned Data / ERD

Primary tables or equivalents:
- `carts`
- `cart_items`

Key relations:
- one user may have one active cart per context
- one cart has many cart items
- cart items reference products but may snapshot price-relevant fields for checkout

## Primary Business Logic

- create and maintain an active cart
- add, update, and remove items
- validate product availability and active status at cart time and checkout time
- support stale-cart cleanup through background jobs
- prepare an orderable checkout request for the orders domain

## Process Flow

1. Customer adds a product to the cart.
2. Cart validates product existence and quantity rules.
3. Customer updates quantities or removes items.
4. Checkout-preview converts the active cart into an order attempt.

## Use Cases

- customer builds a cart
- customer reviews cart totals before checkout
- system expires abandoned carts in the background

## API Surface

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:itemId`
- `DELETE /cart/items/:itemId`
- `POST /cart/checkout-preview`

## Edge Cases

- product becomes inactive after being added to the cart
- stock changes make requested quantity invalid at checkout
- duplicate cart-item rows for the same product
- stale cart keeps outdated price assumptions

## Writable Sections

- cart lifecycle, item rules, checkout-preview behavior, cart APIs, and cart edge cases
- do not redefine final order creation or invoice-payment ownership here

## Out of Scope

- final order creation ownership
- invoice payment tracking
- loyalty accrual
