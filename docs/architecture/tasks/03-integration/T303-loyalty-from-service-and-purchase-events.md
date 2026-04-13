# Loyalty From Service And Purchase Events

## Task ID

`T303`

## Title

Feed loyalty from service and purchase events.

## Type

`integration`

## Status

`ready`

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

Define the cross-service event and accrual contract so loyalty can consume finalized service invoice facts and ecommerce purchase or payment history.

## Deliverables

- loyalty event contract
- accrual trigger mapping
- reversal and idempotency rules

## Implementation Notes

- use stable event facts, not direct cross-service DB assumptions
- include service-side invoice finalization as a first-class loyalty producer
- events should be versionable

## Acceptance Checks

- loyalty has a clear producer and consumer contract
- duplicate event delivery does not double-award points
- booking creation or booking confirmation cannot trigger loyalty accrual

## Out of Scope

- frontend rewards UX
