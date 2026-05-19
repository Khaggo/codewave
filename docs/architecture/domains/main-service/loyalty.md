# loyalty

## Domain ID

`main-service.loyalty`

## Agent Summary

Load this doc for loyalty accrual, reward definitions, earning-rule configuration, and redemption logic. Skip it for ecommerce checkout ownership, direct payment collection, or booking ownership.

## Primary Objective

Own a correct, idempotent loyalty ledger that awards points **only after a qualifying payment-recorded fact matches at least one active earning rule**, while letting admins configure rewards and earning rules without leaking loyalty semantics into job-order, billing, or ecommerce domains.

## Inputs

- user references
- `service.payment_recorded` facts from `main-service.job-orders`
- `invoice.payment_recorded` facts from `ecommerce.invoice-payments`
- admin reward-catalog management requests
- admin earning-rule management requests
- redemption requests

## Outputs

- loyalty accounts
- points transactions
- rewards, reward status changes, and redemption records
- earning rules, activation-state changes, and audit history
- balance and audit views

## Dependencies

- `main-service.users`
- `main-service.job-orders`
- `ecommerce.invoice-payments`

## Owned Data / ERD

Primary tables or equivalents:
- `loyalty_accounts`
- `loyalty_transactions`
- `rewards`
- `reward_catalog_audits`
- `reward_redemptions`
- `loyalty_earning_rules`
- `loyalty_earning_rule_audits`

Key relations:
- one user has one loyalty account
- one loyalty account has many transactions
- one reward can be redeemed many times
- rewards remain admin-managed catalog entries with auditable activation-state changes
- earning rules remain admin-managed policy entries with auditable activation-state changes

## Primary Business Logic

- create and maintain a points ledger
- award points only when a payment-recorded fact matches at least one active earning rule
- accept both payment-backed accrual sources:
  - `service.payment_recorded`
  - `invoice.payment_recorded`
- treat service and ecommerce as rule-driven accrual sources, not automatic guarantees
- evaluate only active earning rules that match the paid context
- support configurable earning formulas:
  - `flat_points`
  - `amount_ratio`
- preserve the default active service-payment rule bootstrap
- never bootstrap ecommerce earning automatically; ecommerce earning remains opt-in through active matching rules
- let admins add, edit, activate, deactivate, and audit rewards
- let admins add, edit, activate, deactivate, and audit earning rules
- treat stickers or similar perks as reward/benefit metadata or operational fulfillment notes, not ecommerce stock
- guarantee idempotent accrual on repeated payment events by stable source references such as `invoice_record_id`
- keep reversal policy explicit: service-payment accruals require manual adjustment until a dedicated service refund or reversal fact exists
- reject booking-created, booking-confirmed, invoice-finalized-only, or unpaid ecommerce facts as loyalty earning triggers
- expose balances, reward catalog state, earning-rule state, and redemption history to customers and admins as appropriate

## Process Flow

1. `service.payment_recorded` or `invoice.payment_recorded` occurs after a qualifying payment is recorded.
2. Loyalty derives an accrual plan with a deterministic idempotency key from the payment fact.
3. Active earning rules are evaluated against paid amount, active window, and optional service/product filters.
4. If one or more rules qualify, one ledger transaction is written once or ignored if the idempotency key already exists.
5. Customer balance is refreshed.
6. Admins manage reward and earning-rule lifecycle without mutating historical ledger entries.
7. Reward redemption creates a debit transaction and redemption record.
8. Later reversals or corrections use explicit compensating adjustments instead of rewriting the original accrual row.

## Use Cases

- customer checks point balance
- customer redeems a reward
- admin creates, edits, activates, or deactivates a reward
- admin creates, edits, activates, or deactivates an earning rule
- admin audits why points were or were not added
- service payment recording requests loyalty accrual through `service.payment_recorded`
- fully paid ecommerce invoice settlement requests loyalty accrual through `invoice.payment_recorded`
- duplicate event delivery is ignored without double-awarding points

## API Surface

- `GET /loyalty/accounts/:userId`
- `GET /loyalty/accounts/:userId/transactions`
- `GET /loyalty/rewards`
- `POST /loyalty/redemptions`
- `POST /admin/loyalty/rewards`
- `PATCH /admin/loyalty/rewards/:id`
- `PATCH /admin/loyalty/rewards/:id/status`
- `GET /admin/loyalty/earning-rules`
- `POST /admin/loyalty/earning-rules`
- `PATCH /admin/loyalty/earning-rules/:id`
- `PATCH /admin/loyalty/earning-rules/:id/status`
- internal `applyLoyaltyAccrual`

## Edge Cases

- booking creation or booking confirmation incorrectly tries to award points
- service work is finalized but not yet paid
- ecommerce invoice is only partially paid
- same payment fact sends duplicate accrual events
- no active earning rule matches a qualifying paid event
- reward redemption occurs with stale balance
- reward or earning-rule activation state changes while an accrual or redemption request is in flight
- a service payment later needs reversal before a dedicated service refund event exists

## Writable Sections

- loyalty ledger rules, rewards, earning rules, accrual and reversal behavior, loyalty APIs, and loyalty edge cases
- do not redefine job-order completion, workshop billing, or ecommerce order semantics here

## Out of Scope

- direct ecommerce order ownership
- payment verification gateway logic
- automatic marketing campaign engines beyond reward definitions and earning rules
