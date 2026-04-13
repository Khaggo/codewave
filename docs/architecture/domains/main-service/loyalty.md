# loyalty

## Domain ID

`main-service.loyalty`

## Agent Summary

Load this doc for points, rewards, redemptions, and accrual logic from completed service or purchase facts. Skip it for direct order, payment, or booking ownership.

## Primary Objective

Own a correct, idempotent loyalty ledger that reacts to completed service invoice facts and purchase-completion facts without leaking ledger semantics into source domains.

## Inputs

- user references
- finalized service-side invoice records from `main-service.job-orders`
- commerce purchase-completion or invoice-payment-recorded accrual facts
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
- `reward_redemptions`

Key relations:
- one user has one loyalty account
- one loyalty account has many transactions
- one reward can be redeemed many times
- rewards remain admin-managed catalog entries with auditable activation-state changes

## Primary Business Logic

- create and maintain a points ledger
- award points for finalized service invoice records and commerce purchase or payment facts
- deduct points on reward redemption
- let admins add, edit, activate, deactivate, and audit rewards without bypassing ledger integrity
- guarantee idempotent accrual on repeated events
- expose balances, reward catalog state, and redemption history to customers and admins

## Process Flow

1. A finalized service invoice fact or commerce purchase or payment fact occurs.
2. Loyalty receives or derives an accrual request.
3. Ledger transaction is written idempotently.
4. Customer balance is refreshed.
5. Admins manage reward catalog lifecycle without mutating historical ledger entries.
6. Reward redemption creates a debit transaction and redemption record.

## Use Cases

- customer checks point balance
- customer redeems a reward
- admin creates, edits, activates, or deactivates a reward
- admin audits why points were added or removed
- service invoice finalization requests loyalty accrual through stable service facts
- e-commerce purchase completion requests loyalty accrual through events

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
- reward redemption occurs with stale balance
- reward activation state changes while a redemption request is in flight
- partial order cancellation requires points reversal

## Writable Sections

- loyalty ledger rules, rewards, accrual and reversal behavior, loyalty APIs, and loyalty edge cases
- do not redefine booking completion or order completion semantics here

## Out of Scope

- direct order ownership
- payment verification
- marketing campaign management beyond reward definitions
