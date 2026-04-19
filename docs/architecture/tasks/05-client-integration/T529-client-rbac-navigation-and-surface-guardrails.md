# Client RBAC Navigation And Surface Guardrails

## Task ID

`T529`

## Title

Apply role-aware navigation and surface guardrails across web and mobile.

## Type

`client-integration`

## Status

`ready`

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

## Deliverables

- role-to-surface navigation matrix
- guardrail contract pack for customer, technician, service adviser, and super admin
- mocks for forbidden-route and downgraded-session cases

## Implementation Notes

- navigation must reflect RBAC but not replace backend enforcement
- customer mobile and staff web are separate surface contracts, not just themed route groups
- session restore should not leak privileged routes before role verification completes

## Acceptance Checks

- each role has explicit allowed and blocked surface states
- forbidden and unauthorized states are distinct
- client-side guardrails match the RBAC policy and regression suite

## Out of Scope

- backend authorization implementation
- analytics metric content

