# Insurance Review And Status Web Flow

## Task ID

`T515`

## Title

Integrate staff-admin web insurance review, queue handling, and claim status updates.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/insurance.md`
- `../../rbac-policy.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T514`

## Goal

Define the staff-web insurance queue and status update workflow for service advisers and super admins.

## Module Name

Insurance Staff Review

## Description

Completed prerequisite for staff/admin insurance inquiry review, queue visibility, status updates, and staff notes. This web-only module receives customer insurance intake from `T514` and exposes role-gated review operations to staff/admin users.

## Business Value

- gives staff a structured queue for customer insurance inquiries
- reduces missed follow-up by making review status visible in the admin workflow
- keeps customer-facing status and staff-only review detail separated
- supports auditability for service adviser and super-admin decisions

## Login, Registration, And Booking Integration Points

- web login must remain staff/admin-only before insurance queues are visible
- customer registration creates the customer identity that submitted inquiries reference
- booking context can help staff understand service-related insurance inquiries without making insurance the booking source of truth
- status updates should be customer-safe only when surfaced back through mobile or notifications

## Required Database/API Changes

- use existing staff queue, inquiry detail, status update, and note contracts from `T110`
- document customer full-history needs in `T514` as `GET /api/users/:id/insurance-inquiries` if required
- do not add payout, insurer settlement, or external carrier integration without canonical domain updates
- no immediate backend API change is required unless OpenAPI verification shows staff review visibility is incomplete

## Follow-up Verification

- confirm staff/admin can see the inquiry list after customer mobile submission
- confirm queue refresh and detail refresh use live backend data
- confirm role-gated actions are hidden or disabled for unauthorized staff
- confirm customer-safe status updates can be traced back to the originating inquiry

## Deliverables

- insurance review contract pack
- claim queue and detail web states
- status-update and note-entry mocks

## Implementation Notes

- keep staff review states distinct from customer-visible claim summaries
- role restrictions must be explicit in both navigation and action availability
- do not add insurer-integration assumptions not present in the backend

## Acceptance Checks

- queue and status update flows align to live insurance contracts
- role failures are distinct from missing-record failures
- customer-only fields are not treated as editable staff state
- completed status remains preserved; missing staff visibility is tracked as follow-up verification before new work is opened

## Out of Scope

- customer intake UX
- payout or external insurer settlement behavior
