# T521 Loyalty Balance History Rewards And Redemption Mobile Flow

## Slice ID

`T521`

## Source Of Truth

- `docs/architecture/domains/main-service/loyalty.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T521-loyalty-balance-history-rewards-and-redemption-mobile-flow.md`
- `docs/contracts/T112-loyalty-core.md`
- `docs/contracts/T528-commerce-and-main-service-derived-state-sync.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- mobile helper: `mobile/src/lib/loyaltyClient.js`
- mobile surface: `mobile/src/screens/Dashboard.js`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `GET /api/loyalty/accounts/:userId` | `live` | Swagger/controller | load the active customer's balance, lifetime totals, and tier context |
| `GET /api/loyalty/accounts/:userId/transactions` | `live` | Swagger/controller | load the append-only customer loyalty ledger history |
| `GET /api/loyalty/rewards` | `live` | Swagger/controller | load the active customer reward catalog |
| `POST /api/loyalty/redemptions` | `live` | Swagger/controller | redeem an active reward against the current loyalty balance |

## Customer Account States

| State | Meaning |
| --- | --- |
| `account_loading` | the customer mobile app is loading the live loyalty account route |
| `account_zero_balance` | the loyalty account exists, but there are no earned or redeemed points yet |
| `account_ready` | the loyalty account has a non-zero balance or recorded history |
| `account_unavailable` | auth or runtime failure blocked loyalty-account loading |

## Customer History States

| State | Meaning |
| --- | --- |
| `history_loading` | the loyalty ledger history route is loading |
| `history_empty` | the customer has no loyalty ledger rows yet |
| `history_partial` | the customer has a small but valid history, such as an initial accrual and one redemption |
| `history_ready` | the customer has a fuller loyalty history available |
| `history_unavailable` | auth or runtime failure blocked loyalty-history loading |

## Reward Availability States

| State | Meaning |
| --- | --- |
| `reward_catalog_loading` | the active reward catalog is loading |
| `reward_catalog_empty` | no customer-visible active rewards are currently published |
| `reward_redeemable` | the reward is active and the customer has enough points to redeem it now |
| `reward_insufficient_points` | the reward is active, but the customer needs more points first |
| `reward_inactive` | the reward exists but is inactive and must not be redeemable from customer mobile |
| `reward_catalog_unavailable` | auth or runtime failure blocked reward-catalog loading |

## Redemption States

| State | Meaning |
| --- | --- |
| `redemption_idle` | no redemption attempt is currently active |
| `redemption_submitting` | a reward redemption request is in flight |
| `redemption_succeeded` | the backend accepted the redemption and returned the updated balance |
| `redemption_insufficient_points` | the backend rejected the redemption because points are insufficient |
| `redemption_reward_inactive` | the backend rejected the redemption because the reward is inactive |
| `redemption_forbidden` | the backend rejected the redemption because the request crossed the active-customer ownership boundary |
| `redemption_failed` | a non-classified runtime or validation failure blocked redemption |

## Customer Loyalty Activity Mapping

| Source Type | Customer Label | Meaning |
| --- | --- | --- |
| `service_payment` | `Paid service work` | canonical customer-earned loyalty accrual from paid service work |
| `reward_redemption` | `Reward redemption` | customer spent loyalty points on a reward |
| `manual_adjustment` | `Manual adjustment` | loyalty ledger was corrected directly by an authorized process |
| `service_reversal` | `Service reversal` | paid-service loyalty was explicitly corrected later |
| `service_invoice`, `purchase_payment`, `purchase_reversal` | `Legacy drift` | older or internal rows that should not be presented as the current earning policy |

## Frontend Contract Files

- `frontend/src/lib/api/generated/loyalty/requests.ts`
- `frontend/src/lib/api/generated/loyalty/responses.ts`
- `frontend/src/lib/api/generated/loyalty/errors.ts`
- `frontend/src/lib/api/generated/loyalty/customer-mobile-loyalty.ts`
- `frontend/src/mocks/loyalty/mocks.ts`
- `mobile/src/lib/loyaltyClient.js`
- `mobile/src/screens/Dashboard.js`

## Contract Rules

- customer mobile remains the only customer-facing loyalty surface in this slice
- present loyalty as service-earned points from paid service work, not from booking creation, booking confirmation, invoice-finalized-only events, or ecommerce checkout
- reward eligibility remains server-owned even when the mobile UI shows a locally derived lock or redeemable state
- if legacy source types appear in the ledger, label them as historical drift instead of implying they are the current earning policy
- redemption success updates loyalty balance and history, but it must not imply hidden order, invoice, or booking mutation outside the backend contract

## Known Drift To Track

- some backend internals still recognize ecommerce-linked loyalty inputs and older loyalty source types
- customer-facing wording must stay service-earned first until backend policy and historical data fully converge

## Notes

- `T521` completes the customer-mobile loyalty contract layer on top of the already live `T112` public routes
- this slice intentionally keeps the mobile UI honest when historical or legacy loyalty rows surface
