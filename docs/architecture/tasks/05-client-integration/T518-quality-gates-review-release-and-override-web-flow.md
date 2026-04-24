# Quality Gates Review Release And Override Web Flow

## Task ID

`T518`

## Title

Integrate staff-admin web QA review, release, and override flow.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/quality-gates.md`
- `../../domains/main-service/job-orders.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T517`
- `T116`
- `T117`
- `T118`
- `T119`

## Goal

Define the staff-web QA experience for reading findings, understanding release blocks, and handling manual overrides under the correct authority.

## Module Name

Inspection / QA Gate Review And Override

## Description

Staff/admin inspection and QA gate module for reviewing captured checks, AI-assisted findings, release-blocking QA status, and super-admin override. Completion and release decisions must depend on QA status instead of treating finalization as automatically releasable.

## Business Value

- reduces incomplete or unsafe releases by making QA status explicit
- gives supervisors an auditable override path for exceptional cases
- improves accountability by separating inspection findings, QA review, and release authority
- feeds lifecycle history, back-job review, and analytics with trusted quality outcomes

## Login, Registration, And Booking Integration Points

- web login must role-gate QA review to staff/admin users and override to super admins
- customer registration only contributes the customer identity attached through booking and job order context
- booking-to-job-order-to-QA flow must preserve the originating booking for traceability
- booking completion or release actions should be blocked or clearly disabled when QA status is not satisfied

## Required Database/API Changes

- use existing quality gate, inspection, finding, risk, and override contracts from `T116` through `T119`
- document the API gap for richer templates and required-check definitions by service type
- do not hardcode service-specific QA templates in the client unless they come from canonical backend contracts
- no immediate backend API change is required unless OpenAPI verification shows QA review, release block, or override routes are missing

## Deliverables

- QA contract pack
- QA findings, risk, and override web states
- release-blocked and override-audit mocks
- service-type template expectations and known API gaps documented for later backend expansion
- live web QA lookup and super-admin override actions backed by current Swagger routes

## Implementation Notes

- AI-assisted outputs must never appear as final authority without the reviewer state
- override controls must remain super-admin-only in the client model
- keep QA findings visible even after override where the backend preserves them
- release/completion actions should explain the QA blocker instead of surfacing a generic failure

## Acceptance Checks

- QA read and override views align with live contracts
- blocked, released, and overridden states are distinct
- override reasons and actor visibility are explicit
- completion/release affordances depend on QA status
- service-specific required checks are either live-backed or documented as a future API gap
- `docs/contracts/T518-quality-gates-review-release-and-override-web-flow.md` documents live QA routes plus planned list/template gaps

## Out of Scope

- analytics dashboards
- lifecycle summary customer visibility
