# loyalty

## Purpose

Own the points ledger, rewards catalog, and redemption workflow for service and commerce-triggered loyalty accrual.

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
- e-commerce and booking modules may trigger accrual requests, but do not write this data directly

## Primary Business Logic

- create and maintain a points ledger
- award points for eligible bookings and commerce events
- deduct points on reward redemption
- guarantee idempotent accrual on repeated events
- expose balances and redemption history to customers and admins

## Process Flow

1. Eligible booking or commerce event occurs
2. Loyalty receives or derives an accrual request
3. Ledger transaction is written idempotently
4. Customer balance is refreshed
5. Reward redemption creates a debit transaction and redemption record

## Use Cases

- customer checks point balance
- customer redeems reward
- admin audits why points were added or removed
- e-commerce completion requests loyalty accrual through events

## API Surface

- `GET /loyalty/accounts/:userId`
- `GET /loyalty/accounts/:userId/transactions`
- `GET /loyalty/rewards`
- `POST /loyalty/redemptions`
- internal `applyLoyaltyAccrual`

## Edge Cases

- same order or booking sends duplicate accrual events
- reward redemption occurs with stale balance
- reward inventory or availability is limited but not checked consistently
- partial order cancellation requires points reversal

## Dependencies

- `users`
- `bookings`
- `commerce-events`
- `analytics`
- `notifications`

## Out of Scope

- direct order ownership
- payment verification
- marketing campaign management beyond reward definitions
