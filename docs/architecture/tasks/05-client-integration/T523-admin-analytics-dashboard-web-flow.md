# Admin Analytics Dashboard Web Flow

## Task ID

`T523`

## Title

Integrate staff-admin web analytics dashboards and operational read models.

## Type

`client-integration`

## Status

`done`

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

## Module Name

Admin Analytics Dashboard

## Description

Staff/admin dashboard module for operational read models across bookings, job orders, QA, back-jobs, loyalty, invoice aging, and audit trail. Analytics should be read-model-driven and must not become an editing surface for transactional records.

## Business Value

- gives admins a single view of shop health and operational bottlenecks
- helps staff monitor booking volume, job progress, rework, revenue aging, and loyalty impact
- supports accountability through audit and override visibility
- creates scalable reporting foundations without coupling dashboards to transactional writes

## Login, Registration, And Booking Integration Points

- web login must restrict analytics to staff/admin roles, with privileged views limited to admins or super admins
- registration contributes customer and staff identity dimensions used in analytics read models
- booking events and booking status changes are primary operational inputs for schedule and conversion metrics
- job order, QA, back-job, loyalty, and invoice events should appear as derived read-model metrics, not direct source edits

## Required Database/API Changes

- use existing analytics dashboard and audit read-model contracts from `T113` and `T408`
- document the API gap for date-range filters if not already supported
- document the API gap for exports if admins need CSV/PDF reporting later
- no immediate backend API change is required unless OpenAPI verification shows required dashboard cards or audit views are missing

## Deliverables

- analytics dashboard contract pack
- dashboard, audit, and empty-state web mocks
- read-model freshness and derived-state labeling guidance
- dashboard slice coverage for bookings, operations, back-jobs, loyalty, invoice aging, and audit trail

## Implementation Notes

- analytics remains read-model-driven and rebuildable
- derived metrics must be clearly distinguishable from operational source records
- role restrictions should prevent non-admin navigation into privileged analytics
- long-running or expensive dashboard views should support visible loading and freshness states so slow pages are diagnosable

## Acceptance Checks

- dashboard screens consume documented analytics DTOs only
- derived-state labeling is explicit in the contract pack
- audit-trail visibility uses the live analytics read model
- date-range and export needs are either live-backed or documented as API gaps
- dashboard pages never mutate booking, job order, QA, back-job, loyalty, or invoice records directly
- `docs/contracts/T523-admin-analytics-dashboard-web-flow.md` documents the live analytics routes, the shared `/admin/summaries` hub, and the current date-range/export API gaps

## Out of Scope

- editing transactional records from analytics views
- QA review actions
