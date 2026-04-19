# Admin Analytics Dashboard Web Flow

## Task ID

`T523`

## Title

Integrate staff-admin web analytics dashboards and operational read models.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/analytics.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T113`
- `T408`

## Goal

Define the staff-web analytics experience for dashboard summary cards, operational drill-ins, and audit-trail observability.

## Deliverables

- analytics dashboard contract pack
- dashboard, audit, and empty-state web mocks
- read-model freshness and derived-state labeling guidance

## Implementation Notes

- analytics remains read-model-driven and rebuildable
- derived metrics must be clearly distinguishable from operational source records
- role restrictions should prevent non-admin navigation into privileged analytics

## Acceptance Checks

- dashboard screens consume documented analytics DTOs only
- derived-state labeling is explicit in the contract pack
- audit-trail visibility uses the live analytics read model

## Out of Scope

- editing transactional records from analytics views
- QA review actions

