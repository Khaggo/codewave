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

## Internal Contract Status

| Contract | Status | Source |
| --- | --- | --- |
| `applyLoyaltyAccrual` | `live` | main-service loyalty service |
| `service.invoice_finalized` accrual ingestion | `live` | shared planner + loyalty service |
| `invoice.payment_recorded` accrual ingestion | `live` | shared planner + loyalty service |

## Frontend Contract Files

- `frontend/src/lib/api/generated/loyalty/requests.ts`
- `frontend/src/lib/api/generated/loyalty/responses.ts`
- `frontend/src/lib/api/generated/loyalty/errors.ts`
- `frontend/src/mocks/loyalty/mocks.ts`

## Frontend States To Cover

- empty loyalty account with zero balance
- account with earned service and purchase points
- active reward catalog for customer-facing views
- inactive reward catalog entries with audit trail for super-admin views
- redemption success with resulting balance update
- insufficient-points conflict
- foreign-customer forbidden state

## Notes

- `T112` turns loyalty from a pure event-planning slice into a live ledger and reward catalog domain.
- Accrual remains event-driven and idempotent: duplicate service or payment facts do not create a second award.
- Current v1 point policy is explicit in implementation:
  - finalized service invoice: flat `100` points
  - recorded purchase payment: `1` point per `PHP 50` paid, rounded down with a minimum of `1`
- Reward catalog history is audit-backed; admins can update or deactivate rewards without mutating historical loyalty transactions.
- Reward redemption is ledger-backed and creates a debit transaction plus a durable redemption record.
