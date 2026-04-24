# Loyalty Balance History Rewards And Redemption Mobile Flow

## Task ID

`T521`

## Title

Integrate customer-mobile loyalty balance, history, reward catalog, and redemption flow.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/loyalty.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T112`
- `T303`

## Goal

Define the customer-mobile loyalty experience from balance and transaction history through reward selection and redemption outcomes.

## Module Name

Loyalty Balance, Rewards, And Redemption

## Description

Customer-mobile loyalty balance, transaction history, reward catalog visibility, and reward redemption outcomes. The loyalty surface must stay aligned with the paid-service-first domain rules while keeping any older cross-service ledger drift explicit instead of pretending those rows are current behavior.

## Business Value

- gives customers one place to understand their current loyalty balance and reward eligibility
- makes redemptions predictable because the mobile surface reflects server-owned reward availability and insufficient-points outcomes
- reduces support confusion by labeling loyalty history as a ledger instead of mixing it with bookings, ecommerce orders, or invoice truth
- preserves trust by showing legacy drift honestly when older loyalty rows still exist

## Login, Registration, And Booking Integration Points

- login gates the loyalty balance, history, reward catalog, and redemption routes to the active customer account
- registration does not create loyalty points directly; points appear only after the qualifying backend loyalty accrual path completes later
- booking creation and booking confirmation do not award points directly; customer loyalty copy must stay anchored to paid service work and the loyalty ledger
- redemptions remain customer-owned actions and must not mutate bookings, orders, or invoices outside the backend contract

## Required Database/API Changes

- use the existing live loyalty routes from `T112`
- no immediate backend API expansion is required for this client slice
- keep older loyalty source-type drift documented as a customer-copy concern rather than inventing new client-side joins or compensating APIs
- if future cleanup removes legacy loyalty source types, the customer contract helper and mocks should be simplified instead of widening the customer meaning again

## Deliverables

- loyalty mobile contract pack
- reward catalog and redemption state model
- mocks for zero balance, partial history, eligible redemption, and insufficient-points cases
- customer-mobile loyalty state helper in `frontend/src/lib/api/generated/loyalty/customer-mobile-loyalty.ts`
- customer-facing loyalty presentation updates in `mobile/src/lib/loyaltyClient.js` and `mobile/src/screens/Dashboard.js`

## Implementation Notes

- points should appear as loyalty-ledger outcomes, not booking-side accrual
- customer-facing copy should describe loyalty as paid-service-first, even when historical or internal backend drift still exposes older source types
- reward eligibility must stay ledger-backed and server-owned
- redemption should not imply hidden invoice or booking coupling outside the backend contract

## Acceptance Checks

- loyalty views use documented balance, history, and reward contracts
- insufficient-points and disabled-reward states are explicit
- accrual history labels stay aligned with the domain doc
- `docs/contracts/T521-loyalty-balance-history-rewards-and-redemption-mobile-flow.md` documents legacy loyalty drift without redefining it as customer truth

## Out of Scope

- admin reward management screens
- analytics aggregation
