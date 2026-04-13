# Auth Security And 2FA Policy

## Task ID

`T007`

## Title

Define the canonical auth security and signup 2FA policy.

## Type

`foundation`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../auth-security-policy.md`
- `../domains/main-service/auth.md`
- `../domains/main-service/users.md`
- `../domains/main-service/notifications.md`
- `../api-strategy.md`

## Depends On

- `T005`

## Goal

Turn the PM-required Google-plus-SMS account activation model into a decision-complete policy that future auth and notification work can implement consistently.

## Deliverables

- canonical auth security policy
- pending-account lifecycle definition
- Google identity verification and email OTP ownership split
- legacy-login positioning for migration work

## Implementation Notes

- 2FA scope is signup and activation only, not every login
- auth owns challenge validation and activation state
- notifications owns OTP delivery execution and delivery observability

## Acceptance Checks

- canonical docs agree on Google verification plus email OTP as the target enrollment flow
- password-only registration is positioned as legacy current-state, not as the forward product direction

## Out of Scope

- backend endpoint implementation
