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

Build the loyalty ledger and reward catalog that consume completed service invoice facts and commerce purchase facts.

## Deliverables

- points ledger
- accrual and redemption rules
- admin reward-catalog management endpoints
- customer-facing reward visibility endpoints

## Implementation Notes

- keep loyalty derived from finalized service invoice records and purchase or payment facts
- include admin-managed reward add, edit, activate, deactivate, and audit behavior
- reversals must be audit-visible

## Acceptance Checks

- points can be earned and redeemed through stable rules
- finalized service invoice facts and commerce events can feed the ledger
- admins can manage reward-catalog lifecycle without rewriting ledger history

## Out of Scope

- marketing campaigns
