# Back Jobs Review And Rework Web Flow

## Task ID

`T519`

## Title

Integrate staff-admin web back-job review, validation, and rework handling.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/back-jobs.md`
- `../../domains/main-service/job-orders.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T518`
- `T109`

## Goal

Define the staff-web flow for reviewing returned work, validating findings, and tracking rework outcomes back to the originating job context.

## Module Name

Back-Jobs Review And Rework

## Description

Staff/admin back-job module for creating, reviewing, validating, and resolving rework cases tied to prior vehicle and service history. Customer-safe updates should flow through notifications and lifecycle timeline only after approval or when the domain contract explicitly allows it.

## Business Value

- gives the shop a structured way to handle returned work and service issues
- preserves linkage to the original job, booking, vehicle, and customer context
- improves quality tracking by separating back-job rework from normal job progress
- feeds analytics and lifecycle history with reliable rework outcomes

## Login, Registration, And Booking Integration Points

- web login must role-gate back-job review and resolution to staff/admin users
- customer registration provides the customer identity attached to the original booking/job order
- booking and job order history provide the prior service context required to open or review a back-job
- customer-facing notification or timeline updates should expose only approved, customer-safe back-job state

## Required Database/API Changes

- use existing back-job review, validation, and rework contracts from `T109`
- document the API gap for a customer-facing back-job list if mobile receives a dedicated screen later
- do not add mobile-only back-job history from staff-only records
- no immediate backend API change is required unless OpenAPI verification shows review, validation, or resolution routes are missing

## Deliverables

- back-job contract pack
- rework and validation web states
- mock fixtures for open, validated, resolved, and disputed back-job cases
- customer-safe notification and lifecycle visibility rules for approved updates
- live staff web actions for create, load, review-status update, vehicle history, and linked rework job-order creation

## Implementation Notes

- preserve original job linkage and parent context
- keep back-job review separate from the primary QA gate flow even when the screens are adjacent
- customer-facing visibility should not be introduced here
- if customer visibility is required later, create it through a dedicated mobile/API slice rather than leaking staff review fields

## Acceptance Checks

- back-job views use documented routes and fields only
- original-work linkage remains visible in the client contract
- resolved and unresolved rework states are explicit
- notifications and lifecycle entries expose only approved customer-safe updates
- missing mobile back-job list support is documented as a future API gap
- `docs/contracts/T519-back-jobs-review-and-rework-web-flow.md` documents live back-job routes plus planned staff/customer list gaps

## Out of Scope

- technician execution logging
- loyalty or analytics reactions
