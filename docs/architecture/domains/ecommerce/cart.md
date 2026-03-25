# cart

## Purpose

Own the pre-checkout shopping cart lifecycle for customers using the e-commerce domain.

## Owned Data / ERD

Primary tables or equivalents:
- `carts`
- `cart_items`

Key relations:
- one user may have one active cart per sales channel or context
- one cart has many cart items
- cart items reference products but should snapshot price-relevant fields when needed for checkout

## Primary Business Logic

- create and maintain an active cart
- add, update, and remove items
- validate product availability and active status at cart time and checkout time
- support stale-cart cleanup through background jobs
- prepare an orderable checkout request for the orders domain

## Process Flow

1. Customer adds product to cart
2. Cart validates product existence and quantity rules
3. Customer updates quantities or removes items
4. Checkout request converts the active cart into an order attempt

## Use Cases

- customer builds a cart
- customer reviews cart total before checkout
- system expires abandoned carts in the background

## API Surface

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:itemId`
- `DELETE /cart/items/:itemId`
- `POST /cart/checkout-preview`

## Edge Cases

- product becomes inactive after being added to cart
- stock changes make requested quantity invalid at checkout
- duplicate cart item rows for the same product
- stale cart keeps outdated price assumptions

## Dependencies

- `catalog`
- `inventory`
- `orders`

## Out of Scope

- final order creation ownership
- invoice payment tracking
- loyalty accrual
