# invoice-payments

## Domain ID

`ecommerce.invoice-payments`

## Agent Summary

Load this doc for invoice creation, payment-entry tracking, balances, and aging behavior. Skip it for fulfillment or gateway automation.

## Primary Objective

Track invoice state accurately from payment entries and aging rules without implying automated bank, card, or gateway settlement.

## Inputs

- order references
- payment entry records
- invoice status or aging triggers

## Outputs

- invoices
- payment entries
- outstanding balance and aging state
- notification and analytics triggers

## Dependencies

- `ecommerce.orders`

## Owned Data / ERD

Primary tables or equivalents:
- `payments`
- `invoices`
- `invoice_payment_entries`

Key relations:
- one order may have one invoice and many payment entries
- one invoice may move through multiple payment statuses over time

## Primary Business Logic

- create invoice records for eligible orders
- track payment entries and outstanding balance
- support partial payments and aging reminders
- emit invoice state changes to notifications, analytics, and commerce events
- ensure invoice state is derived from tracked entries and not manually guessed

## Process Flow

1. Orders creates or requests an invoice record.
2. Staff or system records payment entries.
3. Invoice balance and status are recalculated.
4. Notifications and downstream summaries are updated.

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

## Writable Sections

- invoice state rules, balance semantics, payment-entry behavior, invoice APIs, and invoice edge cases
- do not imply gateway reconciliation or fulfillment ownership here

## Out of Scope

- automated payment gateway reconciliation
- order fulfillment ownership
- refund automation unless added explicitly later
