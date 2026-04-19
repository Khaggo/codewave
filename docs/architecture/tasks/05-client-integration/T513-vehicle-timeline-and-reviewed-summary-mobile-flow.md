# Vehicle Timeline And Reviewed Summary Mobile Flow

## Task ID

`T513`

## Title

Integrate customer-mobile vehicle timeline and reviewed lifecycle summary visibility.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/vehicle-lifecycle.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T511`
- `T115`
- `T302`

## Goal

Define the customer-mobile read model for vehicle timeline events and reviewed AI-assisted summaries without exposing internal-only or unreviewed data.

## Deliverables

- timeline and reviewed-summary contract pack
- typed timeline and summary response shapes
- mobile mocks for empty timeline, reviewed summary, pending summary, and hidden summary states

## Implementation Notes

- only reviewed summaries should be customer-visible
- keep administrative events and verified events visually distinct without changing their backend semantics
- unreviewed AI output must not be treated as customer truth

## Acceptance Checks

- timeline and summary views consume only documented lifecycle contracts
- hidden or pending summary states are explicit
- verified versus administrative event labels remain aligned with the domain doc

## Out of Scope

- staff summary review workflow
- inspection capture

