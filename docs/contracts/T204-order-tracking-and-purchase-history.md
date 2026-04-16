# T204 Order Tracking And Purchase History

## Slice ID

`T204`

## Source Of Truth

- `docs/architecture/domains/ecommerce/orders.md`
- `docs/architecture/domains/ecommerce/invoice-payments.md`
- `docs/architecture/tasks/02-ecommerce-service/T204-order-tracking-and-purchase-history.md`
- live controllers when implemented:
  - `backend/apps/ecommerce-service/src/modules/orders/controllers/orders.controller.ts`
  - `backend/apps/ecommerce-service/src/modules/invoice-payments/controllers/invoice-payments.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/orders/:id` | `live` | Swagger/controller |
| `GET /api/users/:id/orders` | `live` | Swagger/controller |
| `PATCH /api/orders/:id/status` | `live` | Swagger/controller |
| `POST /api/orders/:id/cancel` | `live` | Swagger/controller |
| `GET /api/orders/:id/invoice` | `live` | Swagger/controller |
| `GET /api/invoices/:id` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/orders/requests.ts`
- `frontend/src/lib/api/generated/orders/responses.ts`
- `frontend/src/lib/api/generated/orders/errors.ts`
- `frontend/src/mocks/orders/mocks.ts`
- `frontend/src/lib/api/generated/invoice-payments/requests.ts`
- `frontend/src/lib/api/generated/invoice-payments/responses.ts`
- `frontend/src/lib/api/generated/invoice-payments/errors.ts`
- `frontend/src/mocks/invoice-payments/mocks.ts`

## Frontend States To Cover

- purchase-history list with order-status filter
- purchase-history list with invoice-status filter
- order detail page with status timeline
- awaiting-fulfillment tracking state
- cancelled order state with preserved item snapshots
- invoice-linked order detail state

## Notes

- Order tracking remains invoice-linked, but invoice settlement automation is still out of scope.
- Purchase history filtering is customer-scoped and uses order status plus invoice status as the query surface.
- Order status history is append-only tracking context and must not mutate prior checkout snapshots.
- Cancellation keeps the historical order record visible instead of removing it from customer history.
