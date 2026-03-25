# invoice-payments

## Purpose

Own invoice records and payment tracking for e-commerce orders. This module tracks invoice-based payment state; it does not imply automated bank, card, or gateway settlement.

## Owned Data / ERD

Primary tables or equivalents:
- `payments`
- `invoices`
- `invoice_payment_entries`

Key relations:
- one order may have one invoice and many payment entries
- one invoice may move through multiple payment statuses over time

Core statuses:
- `pending`
- `partial`
- `paid`
- `overdue`
- `void`

## Primary Business Logic

- create invoice records for eligible orders
- track payment entries and outstanding balance
- support partial payments and aging reminders
- emit invoice state changes to notifications, analytics, and commerce events
- ensure invoice state is derived from tracked entries and not manually guessed

## Process Flow

1. Orders creates or requests an invoice record
2. Staff or system records payment entries
3. Invoice balance and status are recalculated
4. Notifications and downstream summaries are updated

## Use Cases

- staff records a payment against an invoice
- customer views invoice state
- admin reviews overdue invoices and aging buckets

## API Surface

- `GET /invoices/:id`
- `GET /orders/:id/invoice`
- `POST /invoices/:id/payments`
- `PATCH /invoices/:id/status`

## Edge Cases

- partial payments do not update remaining balance correctly
- payment entry is duplicated and overstates paid amount
- invoice is marked paid manually without complete payment records
- overdue reminders continue after invoice becomes paid

## Dependencies

- `orders`
- `notifications`
- `commerce-events`
- `analytics`

## Out of Scope

- automated payment gateway reconciliation
- order fulfillment ownership
- refund automation unless added explicitly later
