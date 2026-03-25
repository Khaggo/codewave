# orders

## Purpose

Own e-commerce order creation, order item snapshots, order state progression, and checkout orchestration using invoice-based payment.

## Owned Data / ERD

Primary tables or equivalents:
- `orders`
- `order_items`
- `order_addresses`

Key relations:
- one order belongs to one customer identity
- one order has many order items
- one order may reference one invoice aggregate in `invoice-payments`
- order items snapshot product name, SKU, and price at checkout time

Core states:
- `draft`
- `pending_invoice`
- `awaiting_payment`
- `confirmed`
- `processing`
- `fulfilled`
- `cancelled`

## Primary Business Logic

- turn a validated cart into an order
- snapshot cart item and address data for historical consistency
- coordinate inventory reservation and confirmation
- create invoice-tracked checkout outcomes instead of instant payment capture
- publish downstream events for inventory, loyalty, notifications, and analytics

## Process Flow

1. Customer reviews cart and confirms checkout
2. Orders validates cart, address, and inventory policy
3. Order and order items are created
4. Invoice-payment record is created or linked
5. Order advances as invoice and fulfillment states change
6. Events are published for downstream consumers

## Use Cases

- customer checks out using invoice-based payment
- admin reviews pending and fulfilled orders
- system confirms an order after payment and operational checks

## API Surface

- `POST /checkout/invoice`
- `GET /orders/:id`
- `GET /users/:id/orders`
- `PATCH /orders/:id/status`
- `POST /orders/:id/cancel`

## Edge Cases

- cart changed between preview and final checkout
- order created but invoice record creation fails
- order is fulfilled while invoice is still incomplete by policy mistake
- cancellation occurs after inventory has already been committed

## Dependencies

- `cart`
- `inventory`
- `invoice-payments`
- `commerce-events`
- `notifications`
- `analytics`

## Out of Scope

- direct payment gateway integration
- loyalty ledger ownership
- catalog management
