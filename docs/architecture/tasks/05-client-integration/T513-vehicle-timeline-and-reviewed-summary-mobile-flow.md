# Vehicle Timeline And Reviewed Summary Mobile Flow

## Task ID

`T513`

## Title

Integrate customer-mobile vehicle timeline and reviewed lifecycle summary visibility.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/vehicle-lifecycle.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T511`
- `T115`
- `T302`

## Goal

Define the customer-mobile read model for vehicle timeline events and reviewed AI-assisted summaries without exposing internal-only or unreviewed data.

## Module Name

Vehicle Lifecycle / Service Timeline

## Description

Completed prerequisite for customer-safe vehicle service timeline and reviewed lifecycle summary visibility. This module becomes the customer-facing history surface for verified booking, job order, QA, invoice, insurance, and back-job milestones when those events are approved for mobile display.

## Business Value

- gives customers confidence that their vehicle history is preserved
- turns completed service work into reusable context for future bookings and staff review
- supports back-job and warranty context without exposing internal-only records
- creates a stable place for reviewed AI-assisted summaries after staff approval

## Login, Registration, And Booking Integration Points

- login gates timeline access to vehicles owned by the active customer
- registration and first-vehicle onboarding create the vehicle identity needed for timeline history
- booking completion and service milestones can generate customer-safe lifecycle events
- staff/admin booking, job order, QA, and back-job actions can feed the timeline only through reviewed or approved event contracts

## Required Database/API Changes

- use existing lifecycle event and reviewed-summary contracts from `T103`, `T115`, and `T302`
- do not expose unreviewed AI output or internal-only audit events to mobile
- document any missing event source as a follow-up to the owning backend task rather than inventing local timeline entries
- no immediate backend API change is required for this task pack unless OpenAPI verification shows timeline or reviewed-summary routes are missing

## Follow-up Verification

- confirm customer mobile can load timeline entries for each owned vehicle
- confirm reviewed summaries are visible only after staff approval
- confirm job order, QA, insurance, notification, and back-job additions add customer-safe events only when their source tasks define them
- confirm empty, pending-review, and hidden-summary states are distinct in mobile

## Deliverables

- timeline and reviewed-summary contract pack
- typed timeline and summary response shapes
- mobile mocks for empty timeline, reviewed summary, pending summary, and hidden summary states

## Implementation Notes

- only reviewed summaries should be customer-visible
- keep administrative events and verified events visually distinct without changing their backend semantics
- unreviewed AI output must not be treated as customer truth

## Acceptance Checks

- timeline and summary views consume only documented lifecycle contracts
- hidden or pending summary states are explicit
- verified versus administrative event labels remain aligned with the domain doc
- completed status remains preserved; newly missing event sources are follow-up notes for their owning tasks

## Out of Scope

- staff summary review workflow
- inspection capture
