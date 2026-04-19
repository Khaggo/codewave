# Insurance Customer Intake Mobile Flow

## Task ID

`T514`

## Title

Integrate customer-mobile insurance inquiry intake and claim tracking entry states.

## Type

`client-integration`

## Status

`ready`

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

## Out of Scope

- staff insurance queue handling
- job-order creation

