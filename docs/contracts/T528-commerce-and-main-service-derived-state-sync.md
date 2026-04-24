# T528 Commerce And Main Service Derived State Sync

## Slice ID

`T528`

## Source Of Truth

- `docs/architecture/domains/ecommerce/commerce-events.md`
- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/domains/main-service/loyalty.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T528-commerce-and-main-service-derived-state-sync.md`
- `docs/team-flow-async-orchestration.md`

## Route And Fact Status

| Contract | Status | Source | Customer Meaning |
| --- | --- | --- | --- |
| `GET /api/users/:id/orders` | `live` | ecommerce order route | owner truth for customer shop order history |
| `GET /api/orders/:id` | `live` | ecommerce order route | owner truth for the selected immutable order snapshot |
| `GET /api/orders/:id/invoice` | `live` | ecommerce invoice route | owner truth for invoice aging and payment-entry tracking |
| `GET /api/users/:id/notifications` | `live` | notifications route | async notification read model built from operational facts |
| `GET /api/loyalty/accounts/:userId` | `live` | loyalty route | async loyalty balance read model |
| `GET /api/loyalty/accounts/:userId/transactions` | `live` | loyalty route | async loyalty ledger activity read model |
| `order.invoice_issued` | `live` internal fact | commerce event contract | invoice reminder planning input, not a customer route |
| `invoice.payment_recorded` | `live` internal fact | commerce event contract | invoice reminder cleanup and analytics input, not a customer route |
| `service.payment_recorded` | `live` internal fact | service event contract | loyalty accrual input for paid service work, not a customer route |

## Cross-Service Read-Model Glossary

| Surface | Owner Domain | Consistency Model | Source Domains | Copy Rule |
| --- | --- | --- | --- | --- |
| order history | `ecommerce.orders` | `owner_route_truth` | `ecommerce.orders` | present as direct shop order truth and do not wait for notifications or loyalty |
| invoice tracking | `ecommerce.invoice-payments` | `owner_route_truth` | `ecommerce.invoice-payments` | present as direct invoice truth while explaining reminder cleanup may lag |
| notification feed | `main-service.notifications` | `event_driven_read_model` | bookings, insurance, back-jobs, job orders, invoice events | explain that updates appear after notification sync processes source facts |
| loyalty balance | `main-service.loyalty` | `event_driven_read_model` | paid-service facts from `main-service.job-orders` | describe as service-earned points that post after loyalty sync completes |
| loyalty activity | `main-service.loyalty` | `event_driven_read_model` | loyalty ledger rows plus paid-service facts | keep wording anchored to the loyalty ledger instead of ecommerce order history |

## Derived Sync States

| State | Meaning | Customer UI Guidance |
| --- | --- | --- |
| `pending_sync` | the owner domain has the fact, but a downstream read model has not caught up yet | say the update is still syncing instead of implying missing data |
| `fully_synced` | the customer-facing read model already reflects the latest owner-domain fact | treat the view as current for that owned surface only |
| `stale_snapshot` | the customer-facing read model still shows an older snapshot than the owner-domain truth | explain that the downstream surface is catching up and avoid cross-surface promises |

## Scenario Pack

| Scenario ID | Owner Truth | Downstream Result |
| --- | --- | --- |
| `invoice_issued_notification_pending` | ecommerce invoice route already shows the invoice | notification reminder is still `pending_sync` |
| `invoice_paid_notification_stale` | ecommerce invoice route already shows payment settlement | notification feed can still be a `stale_snapshot` until reminder cleanup lands |
| `service_payment_loyalty_fully_synced` | paid-service fact already reached loyalty | loyalty balance and activity are `fully_synced` |

## Frontend Contract Files

- `frontend/src/lib/api/generated/commerce-sync/customer-derived-state-sync.ts`
- `frontend/src/mocks/commerce-sync/mocks.ts`
- `mobile/src/lib/notificationClient.js`
- `mobile/src/lib/ecommerceCheckoutClient.js`
- `mobile/src/lib/loyaltyClient.js`
- `mobile/src/screens/Dashboard.js`

## Contract Rules

- customer mobile must treat ecommerce order and invoice routes as direct owner truth for shop state
- customer mobile must treat notifications and loyalty as downstream read models that may lag owner truth
- no client surface may imply direct hidden joins across ecommerce, notifications, and loyalty tables
- customer copy must not say that shop checkout or invoice payment instantly updates loyalty balance
- service-payment loyalty remains driven by internal paid-service facts, even though the resulting balance is customer-visible through REST

## Known Drift To Track

- some backend implementation paths still recognize ecommerce payment inputs inside loyalty internals, but the canonical product rule remains that customer-facing loyalty meaning is service-earned first
- until backend policy fully converges, clients must label source domains honestly and avoid implying that ecommerce order routes and loyalty balance are the same truth surface

## Notes

- `T528` is a contract-honesty slice, not a backend event-bus rewrite
- this pack exists to stop client wording and client state from pretending all cross-service surfaces are immediately consistent
