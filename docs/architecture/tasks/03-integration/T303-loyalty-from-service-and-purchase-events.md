# Loyalty From Paid Service Events

## Task ID

`T303`

## Title

Feed loyalty from paid service events.

## Type

`integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/loyalty.md`
- `../../domains/ecommerce/commerce-events.md`

## Depends On

- `T301`
- `T205`

## Goal

Define the service-side event and accrual contract so loyalty can consume paid service facts without depending on ecommerce payment history.

## Deliverables

- paid-service loyalty event contract
- accrual trigger mapping
- admin-configurable earning-rule alignment
- reversal and idempotency rules

## Implementation Notes

- use stable event facts, not direct cross-service DB assumptions
- include `service.payment_recorded` as the first-class loyalty producer
- exclude ecommerce `invoice.payment_recorded` from loyalty accrual
- events should be versionable

## Acceptance Checks

- loyalty has a clear producer and consumer contract
- duplicate event delivery does not double-award points
- finalized-but-unpaid service work cannot trigger loyalty accrual
- booking creation or booking confirmation cannot trigger loyalty accrual

## Out of Scope

- frontend rewards UX
