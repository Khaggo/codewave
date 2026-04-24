# Job Order Progress Photos And Finalization Web Flow

## Task ID

`T517`

## Title

Integrate staff-admin web job-order progress, photo evidence, and finalization flow.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/job-orders.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T516`
- `T107`
- `T108`

## Goal

Define the staff-web execution flow for appending progress, attaching photo evidence, and finalizing invoice-ready work.

## Module Name

Job Order Progress, Photos, And Finalization

## Description

Staff/admin job order workbench extension for mechanic progress entries, photo evidence, finalization, and invoice/payment handoff visibility. Booking remains the appointment source of truth; job orders represent service execution after booking acceptance or staff handoff.

## Business Value

- gives staff and mechanics a clear execution record after a booking becomes work
- improves customer trust and dispute handling through photo evidence
- supports invoice readiness without mixing booking status with repair progress
- creates reliable operational data for QA, back-jobs, analytics, and lifecycle history

## Login, Registration, And Booking Integration Points

- web login must remain staff/admin-only and role-gate mechanic, adviser, and admin actions
- customer registration is only relevant through the customer/vehicle attached to the originating booking
- booking-to-job-order handoff must preserve booking identity while keeping job order progress separate
- booking schedule and queue views can link into the job order when work has started

## Required Database/API Changes

- use existing job order progress, evidence, finalization, and invoice-generation contracts from `T106`, `T107`, and `T108`
- document the API gap for list/filter job orders if the staff queue needs broad workbench browsing
- do not fake list/filter behavior from booking lists if a real job-order workbench endpoint is required
- no immediate backend API change is required unless OpenAPI verification shows progress, photo, or finalization routes are missing

## Deliverables

- progress and evidence contract pack
- technician and adviser action-state model
- finalization success and blocked-state mocks
- invoice/payment handoff states that show what staff can do after finalization without making payment a job-order field
- live web workbench actions for progress, photo evidence, finalization, and invoice payment

## Implementation Notes

- keep technician progress actions distinct from adviser finalization authority
- finalization must reflect QA readiness rather than treating invoice generation as always available
- photo evidence states should not imply media-storage implementation details
- job order progress should be visible from staff workbench context without changing booking status semantics

## Acceptance Checks

- progress, photo, and finalization actions use live routes and DTOs
- assigned-technician and adviser permissions are explicit
- blocked finalization states are distinct from generic validation errors
- booking identity and job-order identity remain visibly linked but not merged
- missing list/filter workbench support is documented as an API gap instead of being patched client-side
- `docs/contracts/T517-job-order-progress-photos-and-finalization-web-flow.md` documents `GET /api/job-orders` as planned while all action routes are live

## Out of Scope

- QA review decision screens
- back-job rework handling
