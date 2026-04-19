# Notification Preferences Delivery States And Reminder Sync

## Task ID

`T520`

## Title

Integrate customer notification preferences, delivery states, and reminder sync.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/notifications.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`
- `../../../team-flow-async-orchestration.md`

## Depends On

- `T506`
- `T111`
- `T304`

## Goal

Define the customer-facing notification preference and reminder expectation layer without treating notifications as state owners.

## Deliverables

- notification preferences contract pack
- reminder and delivery-state client glossary
- mocks for enabled, disabled, pending, retried, and skipped reminders

## Implementation Notes

- email-only delivery remains canonical
- auth OTP delivery bypass rules should be described as non-preference-controlled behavior
- booking, insurance, and invoice reminders must stay side effects

## Acceptance Checks

- preferences and delivery states match live notification contracts
- reminder expectations do not redefine booking or invoice truth
- no SMS assumptions remain in mocks or task output

## Out of Scope

- notification template writing
- internal queue implementation details

