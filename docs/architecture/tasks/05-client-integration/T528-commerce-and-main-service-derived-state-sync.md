# Commerce And Main Service Derived State Sync

## Task ID

`T528`

## Title

Align client-visible derived states across ecommerce and main-service boundaries.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/ecommerce/commerce-events.md`
- `../../domains/main-service/notifications.md`
- `../../domains/main-service/loyalty.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-async-orchestration.md`

## Depends On

- `T520`
- `T521`
- `T526`
- `T301`
- `T303`
- `T304`
- `T305`

## Goal

Define how customer-visible derived states stay consistent when commerce and main-service data move through events, jobs, and read models.

## Module Name

Commerce / Main-Service Derived State Boundary

## Description

Cross-surface customer-mobile slice for making ecommerce owner-truth routes, notification read models, and loyalty read models explicit so the UI stops implying hidden immediate consistency across services.

## Business Value

- reduces customer confusion when invoice tracking updates before reminders or loyalty projections catch up
- keeps order history, notification history, and loyalty activity honest about which service owns each visible state
- gives future frontend and backend work a shared glossary for pending, stale, and fully-synced downstream views
- prevents accidental client joins or copy that make asynchronous projections look like direct shared tables

## Login, Registration, And Booking Integration Points

- login provides the authenticated customer identity required to compare the live order, notification, and loyalty surfaces for the same account
- registration remains unchanged, but newly activated customers can now read clearer async-state messaging once they start using booking or ecommerce flows
- booking stays a separate operational owner; notification surfaces may reflect booking facts later, but booking truth still belongs to the booking routes and detail screens
- ecommerce order and invoice routes stay separate from both workshop booking truth and loyalty accrual truth even when they are shown in the same dashboard

## Required Database/API Changes

- no new public backend route is required for this task
- use the existing live customer reads: `GET /api/users/:id/orders`, `GET /api/orders/:id`, `GET /api/orders/:id/invoice`, `GET /api/users/:id/notifications`, `GET /api/loyalty/accounts/:userId`, and `GET /api/loyalty/accounts/:userId/transactions`
- keep `order.invoice_issued`, `invoice.payment_recorded`, and `service.payment_recorded` documented as internal facts rather than inventing new customer endpoints around them
- no schema or DTO migration is required for this client-integration slice; the work is contract clarity, mock coverage, and customer-mobile wording

## Deliverables

- derived-state sync contract pack
- cross-service read-model glossary
- mocks for stale, pending-sync, and fully-synced cases
- customer-mobile wording and client-boundary metadata for ecommerce, notifications, and loyalty ownership

## Implementation Notes

- derive visibility from explicit events and read models, not hidden cross-service joins
- customer-facing wording should not imply strict immediate consistency where the system is async
- loyalty, notifications, and invoice-derived states must stay traceable to their source domains
- ecommerce order and invoice routes should be treated as owner truth while notifications and loyalty remain downstream read models
- if downstream behavior drifts from the canonical business rule, surface the owner-domain boundary honestly instead of hiding the inconsistency inside the UI

## Acceptance Checks

- derived states are labeled as async where appropriate
- no client flow assumes direct cross-service foreign-key behavior
- stale or pending-sync states are explicit in the contract pack
- `docs/contracts/T528-commerce-and-main-service-derived-state-sync.md` documents the live routes, internal facts, sync glossary, and scenario pack
- `frontend/src/lib/api/generated/commerce-sync/customer-derived-state-sync.ts` and `frontend/src/mocks/commerce-sync/mocks.ts` model pending, stale, and fully-synced customer-visible scenarios
- customer-mobile copy distinguishes direct ecommerce truth from notification and loyalty read-model sync behavior

## Out of Scope

- backend event bus implementation
- analytics dashboard design details
