# Invoice Only Payment Tracking

## Task ID

`T205`

## Title

Implement invoice-only payment tracking.

## Type

`domain`

## Status

`done`

## Priority

`medium`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/ecommerce/invoice-payments.md`
- `../../api-strategy.md`

## Depends On

- `T203`
- `T204`

## Goal

Track invoice issuance, payment entries, aging, and settlement state without implying bank or gateway automation.

## Deliverables

- invoice-payment module
- payment entry tracking
- aging and status endpoints

## Implementation Notes

- invoice handling is tracking-oriented only
- status changes should feed notifications and analytics later

## Acceptance Checks

- invoice records support payment history and aging
- no payment-gateway assumptions appear in code or docs

## Out of Scope

- online payment processing
