# Notification Preferences Delivery States And Reminder Sync

## Task ID

`T520`

## Title

Integrate customer notification preferences, delivery states, and reminder sync.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

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

Integrate the customer-facing notification feed, preference handling, booking reminders, and status-change notifications without treating notifications as state owners.

## Module Name

Notifications & Reminders

## Description

Customer mobile notification feed and preferences for operational reminders, especially booking reminders and booking status-change notifications. The web/admin side should only use these records as operational visibility when needed, not as the source of booking truth.

## Business Value

- reduces missed appointments and support follow-ups
- gives customers one place to see recent booking and account messages
- makes staff/admin changes visible to customers without requiring manual contact
- preserves trust by separating notification delivery state from the actual booking state

## Login, Registration, And Booking Integration Points

- login gates the customer notification feed and preference read/write actions to the active customer account
- registration and OTP/activation messages bypass customer preferences because they are auth-critical
- booking creation, reschedule, cancellation, status updates, invoice/payment events, and reminders can create notifications as side effects
- staff/admin booking actions should surface customer-safe status-change notifications without exposing staff-only notes

## Required Database/API Changes

- use existing notification and reminder contracts from `T111` and `T304` where they are already live
- document the API gap for customer read/unread notification endpoints as future work
- do not invent client-only read/unread state that conflicts with backend delivery state
- no immediate backend API change is required for this task pack unless OpenAPI verification shows the feed or preference routes are missing

## Deliverables

- notification preferences and customer feed contract pack
- reminder and delivery-state client glossary
- mocks for enabled, disabled, pending, retried, skipped, unread, and read-like display states
- documented reminder/status-change mapping from bookings to customer-visible notifications
- customer-mobile notification state model in `frontend/src/lib/api/generated/notifications/customer-mobile-notifications.ts`

## Implementation Notes

- email-only delivery remains canonical
- auth OTP delivery bypass rules should be described as non-preference-controlled behavior
- booking, insurance, and invoice reminders must stay side effects
- notification display should link back to the owning booking, invoice, insurance inquiry, or account event when the backend provides a safe reference

## Acceptance Checks

- preferences and delivery states match live notification contracts
- reminder expectations do not redefine booking or invoice truth
- no SMS assumptions remain in mocks or task output
- customer feed and preferences remain customer-only on mobile
- read/unread behavior is either backed by live endpoints or explicitly marked as a future API gap
- `docs/contracts/T520-notification-preferences-delivery-states-and-reminder-sync.md` labels read/unread persistence as planned and keeps current mobile state local-session-only

## Out of Scope

- notification template writing
- internal queue implementation details
