# catalog

## Domain ID

`ecommerce.catalog`

## Agent Summary

Load this doc for products, categories, sellable catalog state, and published product metadata. Skip it for stock reservations or order ownership.

## Primary Objective

Maintain the list of sellable products and categories without mutating historical order meaning or inventory ownership.

## Inputs

- category and product management updates
- publish or unpublish actions
- customer-facing catalog reads

## Outputs

- products and categories
- sellable catalog state
- product metadata consumed by cart and orders

## Dependencies

- none

## Owned Data / ERD

Primary tables or equivalents:
- `product_categories`
- `products`
- optional `product_media`

Key relations:
- one category may contain many products
- products are referenced by cart items, order items, and inventory records
- order items must snapshot product details so later edits do not rewrite history

## Primary Business Logic

- maintain the list of sellable products
- enforce SKU uniqueness and valid category placement
- expose only active products to customer-facing channels
- keep catalog edits from mutating historical order records

## Process Flow

1. Admin creates or updates categories and products.
2. Customer-facing reads fetch active catalog data.
3. Cart and order modules consume product snapshots for transactions.

## Use Cases

- admin manages the product list
- customer browses products
- cart validates whether an item is still sellable

## API Surface

- `GET /products`
- `GET /products/:id`
- `GET /product-categories`
- `POST /product-categories`
- `PATCH /product-categories/:id`
- `POST /products`
- `PATCH /products/:id`

## Edge Cases

- product is unpublished while still in active carts
- product price changes after customers added it to cart
- deleted category leaves orphaned products
- duplicate SKU under concurrent admin edits

## Writable Sections

- product and category semantics, catalog APIs, publish-state behavior, and catalog edge cases
- do not redefine inventory or order snapshot ownership here

## Out of Scope

- stock counts
- invoice tracking
- loyalty computation
