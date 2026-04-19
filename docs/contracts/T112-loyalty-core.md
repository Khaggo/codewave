# T112 Loyalty Core

## Slice ID

`T112`

## Source Of Truth

- `docs/architecture/domains/main-service/loyalty.md`
- `docs/architecture/tasks/01-main-service/T112-loyalty-core.md`
- `docs/architecture/domains/ecommerce/commerce-events.md`
- internal contract code:
  - `backend/shared/events/loyalty-accrual-planner.service.ts`
  - `backend/apps/main-service/src/modules/loyalty/controllers/loyalty.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/loyalty/accounts/:userId` | `live` | Swagger/controller |
| `GET /api/loyalty/accounts/:userId/transactions` | `live` | Swagger/controller |
| `GET /api/loyalty/rewards` | `live` | Swagger/controller |
| `POST /api/loyalty/redemptions` | `live` | Swagger/controller |
| `POST /api/admin/loyalty/rewards` | `live` | Swagger/controller |
| `PATCH /api/admin/loyalty/rewards/:id` | `live` | Swagger/controller |
| `PATCH /api/admin/loyalty/rewards/:id/status` | `live` | Swagger/controller |
| `GET /api/admin/loyalty/earning-rules` | `live` | Swagger/controller |
| `POST /api/admin/loyalty/earning-rules` | `live` | Swagger/controller |
| `PATCH /api/admin/loyalty/earning-rules/:id` | `live` | Swagger/controller |
| `PATCH /api/admin/loyalty/earning-rules/:id/status` | `live` | Swagger/controller |

## Internal Contract Status

| Contract | Status | Source |
| --- | --- | --- |
| `applyLoyaltyAccrual` | `live` | main-service loyalty service |
| `service.payment_recorded` accrual ingestion | `live` | shared planner + loyalty service |
| admin-configurable earning rule evaluation | `live` | loyalty service + repository |

## Frontend Contract Files

- `frontend/src/lib/api/generated/loyalty/requests.ts`
- `frontend/src/lib/api/generated/loyalty/responses.ts`
- `frontend/src/lib/api/generated/loyalty/errors.ts`
- `frontend/src/mocks/loyalty/mocks.ts`

## Frontend States To Cover

- empty loyalty account with zero balance
- account with earned service-payment points
- active reward catalog for customer-facing views
- inactive reward catalog entries with audit trail for super-admin views
- active and inactive earning-rule entries with audit trail for super-admin views
- redemption success with resulting balance update
- insufficient-points conflict
- foreign-customer forbidden state

## Notes

- `T112` turns loyalty from a pure event-planning slice into a live ledger and reward catalog domain.
- Accrual remains event-driven and idempotent: duplicate paid-service facts do not create a second award.
- Loyalty no longer consumes ecommerce `invoice.payment_recorded` for point earning.
- Current live implementation evaluates active admin-configured earning rules against `service.payment_recorded`.
- Reward and earning-rule history is audit-backed; admins can update or deactivate policy entries without mutating historical loyalty transactions.
- Reward redemption is ledger-backed and creates a debit transaction plus a durable redemption record.
