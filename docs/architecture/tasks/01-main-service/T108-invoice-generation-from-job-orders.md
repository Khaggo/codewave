# Invoice Generation From Job Orders

## Task ID

`T108`

## Title

Generate invoice-ready records from completed job orders.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/job-orders.md`
- `../../api-strategy.md`

## Depends On

- `T106`
- `T107`

## Goal

Make completed job orders the source for invoice generation readiness while preserving invoice-only payment handling.

## Deliverables

- invoice generation trigger from job orders
- adviser snapshot propagation to invoice records
- readiness rules before invoice creation

## Implementation Notes

- do not imply payment-gateway settlement
- invoice generation should remain blocked if QA requires action

## Acceptance Checks

- invoice-ready job orders carry adviser identity forward
- incomplete or blocked job orders cannot generate invoice-ready records
- frontend contract pack marks finalize as live

## Out of Scope

- ecommerce payment tracking implementation
