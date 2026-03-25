# catalog

## Purpose

Own the product catalog exposed by the e-commerce service: categories, products, display metadata, and sellable catalog state.

## Owned Data / ERD

Primary tables or equivalents:
- `product_categories`
- `products`
- optional `product_media`

Key relations:
- one category may contain many products
- products are referenced by cart items, order items, and inventory records
- order items must snapshot product details so later product edits do not rewrite history

Core fields:
- SKU
- category ID
- name and description
- unit price
- active and published flags
- image or media references

## Primary Business Logic

- maintain the list of sellable products
- enforce SKU uniqueness and valid category placement
- expose only active products to customer-facing channels
- keep catalog edits from mutating historical order records

## Process Flow

1. Admin creates or updates categories and products
2. Customer-facing reads fetch active catalog data
3. Cart and order modules consume product snapshots for transactions

## Use Cases

- admin manages product list
- customer browses products
- cart validates whether an item is still sellable

## API Surface

- `GET /products`
- `GET /products/:id`
- `GET /product-categories`
- `POST /products`
- `PATCH /products/:id`

## Edge Cases

- product is unpublished while it is still in active carts
- product price changes after customers added it to cart
- deleted category leaves orphaned products
- duplicate SKU under concurrent admin edits

## Dependencies

- `inventory`
- `cart`
- `orders`

## Out of Scope

- stock counts
- invoice tracking
- loyalty computation
