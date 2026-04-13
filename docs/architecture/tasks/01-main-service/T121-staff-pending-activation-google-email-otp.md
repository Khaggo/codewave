# Staff Pending Activation Google Email OTP

## Task ID

`T121`

## Title

Implement pending staff activation through Google verification and email OTP.

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
- `../../rbac-policy.md`

## Depends On

- `T007`
- `T104`
- `T122`

## Goal

Make super-admin staff provisioning create pending identities that must complete Google verification and email OTP before the staff account becomes usable.

## Deliverables

- pending staff activation state
- staff activation start and verify endpoints
- provisioning changes so `POST /admin/staff-accounts` creates inactive pending identities
- audit-friendly activation outcomes

## Implementation Notes

- keep staff-code and adviser-snapshot rules intact
- staff accounts must remain unusable until activation completes
- deactivation and pending activation must remain separate audit states

## Acceptance Checks

- provisioned staff accounts remain unusable until activation completes
- Google mismatch, duplicate identity, expired OTP, and wrong OTP are rejected cleanly
- super-admin provisioning still preserves historical staff identifiers

## Out of Scope

- broader role redesign
