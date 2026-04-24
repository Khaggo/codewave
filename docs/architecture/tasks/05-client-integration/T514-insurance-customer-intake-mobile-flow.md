# Insurance Customer Intake Mobile Flow

## Task ID

`T514`

## Title

Integrate customer-mobile insurance inquiry intake and claim tracking entry states.

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
- `../../domains/main-service/vehicles.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T511`
- `T110`

## Goal

Define the customer-mobile insurance intake flow, including owned-vehicle selection, inquiry creation, and customer claim-status visibility.

## Module Name

Insurance Intake

## Description

Completed prerequisite for customer insurance inquiry creation from mobile, including owned-vehicle selection and customer-safe inquiry status visibility. This slice feeds staff review in `T515` without exposing staff-only review state to the customer.

## Business Value

- lets customers request insurance-related assistance without staff rekeying details
- ties claims and inquiries to verified customer and vehicle records
- reduces support ambiguity by making submitted inquiry state visible to customers
- keeps insurance review auditable through a backend-owned status workflow

## Login, Registration, And Booking Integration Points

- login gates inquiry creation and inquiry status visibility to the owning customer
- registration must be complete enough to provide a customer identity before intake submission
- vehicle selection reuses the vehicle garage from `T511`
- booking context can be linked when an insurance inquiry relates to a service visit, but booking truth remains separate

## Required Database/API Changes

- use existing insurance inquiry create/detail/status contracts from `T110`
- document the API gap for `GET /api/users/:id/insurance-inquiries` if mobile needs full customer inquiry history
- do not store customer inquiry history as local-only state
- do not add insurer settlement or external claim integration unless the domain doc is updated first

## Follow-up Verification

- confirm customers can see submitted inquiry state after creation
- confirm no-vehicle and invalid-vehicle states are explicit in the mobile flow
- confirm full customer inquiry history is either live-backed or intentionally out of scope
- confirm staff-only review notes/status controls are not exposed in mobile

## Deliverables

- insurance intake contract pack
- claim-status entry states for customers
- mocks for no vehicle, draft intake, submitted inquiry, and claim-status updates

## Implementation Notes

- vehicle ownership must remain the backend gate for inquiry creation
- insurance statuses should be shown as backend-owned values, not remapped client-only labels
- intake and later staff review states should remain distinct

## Acceptance Checks

- insurance intake uses only documented fields and routes
- no-vehicle and invalid-vehicle states are explicit
- customer claim-status screens do not expose staff-only review details
- completed status remains preserved; missing full-history support is tracked as a follow-up API gap

## Out of Scope

- staff insurance queue handling
- job-order creation
