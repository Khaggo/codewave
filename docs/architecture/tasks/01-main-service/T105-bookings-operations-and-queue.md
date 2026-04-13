# Bookings Operations And Queue

## Task ID

`T105`

## Title

Expand bookings into appointment operations and queue visibility.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/bookings.md`
- `../../rbac-policy.md`

## Depends On

- `T104`

## Goal

Extend the bookings module with staff confirmation, decline, reschedule, daily schedule, and optional queue monitoring.

## Deliverables

- booking operation endpoints
- daily schedule read model
- optional queue view or queue status contract
- frontend-ready contract pack and mock set for the slice

## Implementation Notes

- service adviser is the primary staff actor here
- queue visibility should not replace booking truth

## Acceptance Checks

- bookings can be confirmed, declined, and rescheduled by authorized staff
- schedule and queue reads reflect booking state accurately
- contract pack distinguishes `live` versus `planned` routes

## Out of Scope

- technician work execution
