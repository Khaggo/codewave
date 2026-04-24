# Client RBAC Navigation And Surface Guardrails

## Task ID

`T529`

## Title

Apply role-aware navigation and surface guardrails across web and mobile.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T509`
- `T523`
- `T405`

## Goal

Create a consistent client-level RBAC guardrail model so each role sees the correct surface, navigation, and action affordances.

## Module Name

Client RBAC Navigation / Session Surface Guardrails

## Description

Shared client-integration slice that hardens staff web session restore, role-aware route visibility, and customer mobile protected-screen access so the app surfaces match the RBAC policy without pretending client guards replace backend authorization.

## Business Value

- stops downgraded or stale local sessions from briefly exposing privileged web navigation
- keeps customer mobile honest by blocking staff and deactivated sessions before they can behave like customer-owned app state
- gives frontend work a single typed navigation and blocked-state matrix that future tasks can reuse instead of re-implementing per screen
- reduces regression risk as more web and mobile modules reuse the same auth backend with different surface ownership rules

## Login, Registration, And Booking Integration Points

- login is the main runtime entry for both surfaces, so the guardrails now validate role ownership before a session is allowed to drive web or mobile navigation
- customer registration and OTP verification remain mobile-only, and the post-verification session must still satisfy the customer-mobile guard before onboarding continues
- booking remains downstream of auth: staff booking routes stay web-owned and customer booking/account routes stay mobile-owned, with the client guardrails preventing surface crossover before booking UI loads
- session restore is treated as part of login continuity, not a separate trust source; stored client sessions must be revalidated against live auth identity before staff routes render

## Required Database/API Changes

- no database schema change is required for this slice
- use existing auth routes only: `POST /api/auth/login`, `POST /api/auth/refresh`, and `GET /api/auth/me`
- document the current API gap that `GET /api/auth/me` returns only minimal identity fields, so clients must merge that response with the richer stored session instead of inventing extra backend fields
- keep the role-to-surface matrix as a typed client contract until the backend exposes a first-class navigation or authorization-introspection route

## Deliverables

- role-to-surface navigation matrix
- guardrail contract pack for customer, technician, service adviser, and super admin
- mocks for forbidden-route and downgraded-session cases
- web session-restore guard that rehydrates stored session role truth before rendering protected staff navigation
- mobile protected-screen and login/onboarding gates that reject non-customer sessions

## Implementation Notes

- navigation must reflect RBAC but not replace backend enforcement
- customer mobile and staff web are separate surface contracts, not just themed route groups
- session restore should not leak privileged routes before role verification completes

## Acceptance Checks

- each role has explicit allowed and blocked surface states
- forbidden and unauthorized states are distinct
- client-side guardrails match the RBAC policy and regression suite
- staff web session restore uses live auth identity before restoring protected navigation state
- customer mobile protected surfaces reject staff and deactivated sessions with explicit blocked messaging
- `docs/contracts/T529-client-rbac-navigation-and-surface-guardrails.md` documents the live auth routes, guarded states, and known API gaps

## Out of Scope

- backend authorization implementation
- analytics metric content
