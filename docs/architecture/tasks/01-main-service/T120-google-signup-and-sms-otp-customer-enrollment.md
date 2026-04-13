# Google Signup And Email OTP Customer Enrollment

## Task ID

`T120`

## Title

Implement customer enrollment through Google verification and email OTP.

## Type

`domain`

## Status

`done`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../auth-security-policy.md`
- `../../domains/main-service/auth.md`
- `../../domains/main-service/users.md`
- `../../domains/main-service/notifications.md`

## Depends On

- `T007`
- `T122`

## Goal

Replace password-first customer registration with a Google-verified plus email-verified activation flow while preserving stable token behavior for activated accounts.

## Deliverables

- pending customer enrollment state
- Google signup start and email verification endpoints
- OTP challenge validation and activation flow
- frontend-ready contract pack and mock set for the slice

## Implementation Notes

- keep `POST /auth/register` documented as legacy current-state until migration is complete
- tokens should be issued only after successful activation
- Google identity mismatch, duplicate identity, expired OTP, and wrong OTP must fail cleanly

## Acceptance Checks

- customer signup succeeds only after valid Google verification and valid email OTP
- pending customer accounts cannot behave like activated accounts before verification completes
- Swagger and contract pack clearly distinguish live versus planned routes during rollout
 - `POST /auth/google/signup/start` and `POST /auth/google/signup/verify-email` are live in Swagger

## Out of Scope

- every-login MFA
