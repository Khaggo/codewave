# loyalty

Last updated: 2026-08-05

## Domain ID

`main-service.loyalty`

## Agent Summary

Load this doc for service-earned points, reward definitions, earning-rule configuration,
and redemption logic. Skip it for service payment collection or booking ownership.

## Primary Objective

Maintain an idempotent loyalty ledger that awards points only after a qualifying paid
service fact matches an active service earning rule.

## Inputs

- `service.payment_recorded` facts from `main-service.job-orders`
- admin-managed service earning rules
- reward definitions and redemption requests
- active customer identity

## Outputs

- loyalty accounts and append-only ledger transactions
- service-payment accruals
- reward catalog and redemption records
- earning-rule audit history

## Dependencies

- `main-service.users`
- `main-service.job-orders`

## Owned Data / ERD

Primary tables are `loyalty_accounts`, `loyalty_transactions`, `rewards`,
`reward_redemptions`, `loyalty_earning_rules`, and their audit records.

Historical database enum values and unused columns may remain temporarily so existing
installations can read old rows. Current APIs normalize those rows and expose only the
service-based policy.

## Primary Business Logic

- accept only service earning rules
- require a recorded paid-service fact before accrual
- evaluate amount, service type, category, active window, and minimum amount
- use stable idempotency keys so duplicate events cannot award points twice
- keep ledger entries append-only
- require an active reward and sufficient balance before redemption
- keep admin changes audited
- expose a customer-safe earning-policy projection containing active service rules, formula
  summaries, and eligibility language without rule IDs, actor data, or audit metadata
- keep Accessories purchases outside the active earning-policy response until a separate approved
  loyalty decision exists

## Process Flow

1. Job Order payment recording emits `service.payment_recorded`.
2. The accrual planner validates and normalizes the event.
3. Active service earning rules are evaluated.
4. A matching rule creates one idempotent ledger accrual.
5. The customer can view the updated balance and eligible service rewards.

## Use Cases

- earn points after a paid service invoice
- inspect balance and service-earned ledger activity
- redeem an active service voucher or discount
- create, update, activate, or deactivate a service earning rule

## API Surface

- `GET /loyalty/accounts/:userId`
- `GET /loyalty/accounts/:userId/transactions`
- `GET /loyalty/rewards`
- `GET /api/loyalty/earning-policy`
- `POST /loyalty/redemptions`
- admin reward and earning-rule routes

## Edge Cases

- duplicate payment event
- inactive or unmatched earning rule
- insufficient points
- inactive reward
- legacy ledger row from an older installation
- policy endpoint must exclude inactive, expired, internal, or deferred product-purchase rules

## Writable Sections

- service earning policy, reward policy, ledger behavior, API contracts, and edge cases
- do not redefine Job Order payment or customer identity ownership here

## Out of Scope

- payment collection
- product sales
- stock management
- marketing campaigns
