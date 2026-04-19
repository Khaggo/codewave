# Loyalty Core

## Task ID

`T112`

## Title

Implement loyalty points and rewards core.

## Type

`domain`

## Status

`done`

## Priority

`medium`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/loyalty.md`
- `../../domains/ecommerce/commerce-events.md`

## Depends On

- `T301`
- `T303`

## Goal

Build the loyalty ledger, reward catalog, and earning-rule configuration that consume **paid successful service facts only**.

## Deliverables

- points ledger
- accrual and redemption rules
- admin reward-catalog management endpoints
- admin earning-rule management endpoints
- customer-facing reward visibility endpoints

## Implementation Notes

- keep loyalty derived from `service.payment_recorded` only
- include admin-managed reward add, edit, activate, deactivate, and audit behavior
- include admin-managed earning-rule add, edit, activate, deactivate, and audit behavior
- reversals must be audit-visible

## Acceptance Checks

- points can be earned and redeemed through stable rules
- a finalized-but-unpaid service does not award loyalty
- ecommerce events do not feed the loyalty ledger
- admins can manage reward and earning-rule lifecycle without rewriting ledger history

## Out of Scope

- automated marketing campaigns beyond reward definitions and earning rules
