# Staff Auth Session And Role Gating Web Flow

## Task ID

`T509`

## Title

Integrate staff/admin web login, session handling, and role-gated entry states.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/auth.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T507`

## Goal

Define how staff and admin users authenticate into the web portal and how role-based access changes navigation and visible actions.

## Deliverables

- staff login and session contract pack
- role-gated navigation states for technician, service adviser, and super admin
- forbidden and deactivated-account web states
- typed auth/session mocks for staff access

## Implementation Notes

- base the slice on live login, refresh, and me endpoints
- customer users must not land in staff-admin routes
- keep role checks explicit in navigation and action availability

## Acceptance Checks

- login and session restore flows match live auth contracts
- each staff role has explicit allowed and blocked states
- deactivated and pending staff accounts are not treated as normal auth failures

## Out of Scope

- customer mobile activation
- staff provisioning flow details
