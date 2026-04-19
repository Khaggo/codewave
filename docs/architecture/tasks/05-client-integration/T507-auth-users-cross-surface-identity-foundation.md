# Auth Users Cross Surface Identity Foundation

## Task ID

`T507`

## Title

Establish the shared identity and account baseline for customer mobile and staff/admin web.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/auth.md`
- `../../domains/main-service/users.md`
- `../../auth-security-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T506`
- `T104`
- `T120`
- `T121`
- `T122`

## Goal

Create one shared identity contract pack that distinguishes customer activation, staff access, and session ownership across both surfaces.

## Deliverables

- cross-surface auth and user state glossary
- route map for live customer and staff identity flows
- session, pending activation, and deactivated account client states
- typed contract baseline for auth and users

## Implementation Notes

- customer mobile and staff web must not share identical access states even when they share the same auth module
- email OTP is canonical and SMS must not appear anywhere in the pack
- keep profile ownership in users and token/session ownership in auth

## Acceptance Checks

- customer and staff surfaces use the same account-state labels
- live auth routes are clearly separated from planned routes
- no client state implies password-only registration as the target flow

## Out of Scope

- booking and vehicle flows
- analytics and admin dashboards
