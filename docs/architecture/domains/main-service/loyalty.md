# loyalty

## Domain ID

`main-service.loyalty`

## Agent Summary

Load this doc for points, rewards, redemptions, and accrual logic from completed service or purchase facts. Skip it for direct order, payment, or booking ownership.

## Primary Objective

Own a correct, idempotent loyalty ledger that reacts to completed service invoice facts and purchase-completion facts without leaking ledger semantics into source domains.

## Inputs

- user references
- `service.invoice_finalized` facts from `main-service.job-orders`
- `invoice.payment_recorded` commerce facts from `ecommerce-service`
- admin reward-catalog management requests
- redemption requests

## Outputs

- loyalty accounts
- points transactions
- rewards, reward status changes, and redemption records
- balance and audit views

## Dependencies

- `main-service.users`
- `main-service.job-orders`
- `ecommerce.commerce-events`

## Owned Data / ERD

Primary tables or equivalents:
- `loyalty_accounts`
- `loyalty_transactions`
- `rewards`
- `reward_catalog_audits`
- `reward_redemptions`

Key relations:
- one user has one loyalty account
- one loyalty account has many transactions
- one reward can be redeemed many times
- rewards remain admin-managed catalog entries with auditable activation-state changes

## Primary Business Logic

- create and maintain a points ledger
- award points only for completed service invoice facts and commerce payment-recorded facts
- use one stable v1 points policy: `service.invoice_finalized` awards a flat `100` points and `invoice.payment_recorded` awards `1` point per `PHP 50` paid, rounded down with a minimum of `1`
- deduct points on reward redemption
- let admins add, edit, activate, deactivate, and audit rewards without bypassing ledger integrity
- guarantee idempotent accrual on repeated events by stable source references such as `invoice_record_id` and `payment_entry_id`
- keep reversal policy explicit: service accruals require manual adjustment until a service reversal fact exists, while purchase accruals can later consume refund or reversal facts
- reject booking-created or booking-confirmed facts as loyalty triggers
- expose balances, reward catalog state, and redemption history to customers and admins

## Process Flow

1. `service.invoice_finalized` or `invoice.payment_recorded` occurs.
2. Loyalty derives an accrual plan with a deterministic idempotency key from the source fact.
3. Ledger transaction is written once or ignored if the idempotency key already exists.
4. Customer balance is refreshed.
5. Admins manage reward catalog lifecycle without mutating historical ledger entries.
6. Reward redemption creates a debit transaction and redemption record.
7. Later reversals or corrections use explicit compensating adjustments instead of rewriting the original accrual row.

## Use Cases

- customer checks point balance
- customer redeems a reward
- admin creates, edits, activates, or deactivates a reward
- admin audits why points were added or removed
- service invoice finalization requests loyalty accrual through `service.invoice_finalized`
- e-commerce `invoice.payment_recorded` requests purchase accrual evaluation through events
- duplicate event delivery is ignored without double-awarding points

## API Surface

- `GET /loyalty/accounts/:userId`
- `GET /loyalty/accounts/:userId/transactions`
- `GET /loyalty/rewards`
- `POST /loyalty/redemptions`
- `POST /admin/loyalty/rewards`
- `PATCH /admin/loyalty/rewards/:id`
- `PATCH /admin/loyalty/rewards/:id/status`
- internal `applyLoyaltyAccrual`

## Edge Cases

- booking creation or booking confirmation incorrectly tries to award points
- same service invoice fact or purchase fact sends duplicate accrual events
- a service invoice later needs reversal before a dedicated service reversal event exists
- reward redemption occurs with stale balance
- reward activation state changes while a redemption request is in flight
- purchase refund or payment reversal arrives after points were already awarded

## Writable Sections

- loyalty ledger rules, rewards, accrual and reversal behavior, loyalty APIs, and loyalty edge cases
- do not redefine booking completion or order completion semantics here

## Out of Scope

- direct order ownership
- payment verification
- marketing campaign management beyond reward definitions
