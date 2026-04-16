# T205 Invoice Only Payment Tracking

## Slice ID

`T205`

## Source Of Truth

- `docs/architecture/domains/ecommerce/invoice-payments.md`
- `docs/architecture/tasks/02-ecommerce-service/T205-invoice-only-payment-tracking.md`
- live controllers when implemented:
  - `backend/apps/ecommerce-service/src/modules/invoice-payments/controllers/invoice-payments.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/invoices/:id` | `live` | Swagger/controller |
| `GET /api/orders/:id/invoice` | `live` | Swagger/controller |
| `POST /api/invoices/:id/payments` | `live` | Swagger/controller |
| `PATCH /api/invoices/:id/status` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/invoice-payments/requests.ts`
- `frontend/src/lib/api/generated/invoice-payments/responses.ts`
- `frontend/src/lib/api/generated/invoice-payments/errors.ts`
- `frontend/src/mocks/invoice-payments/mocks.ts`

## Frontend States To Cover

- pending invoice detail state
- partial-payment history state
- fully paid invoice state
- cancelled invoice-tracking state
- invalid manual status conflict state
- overpayment or invalid-entry conflict state

## Notes

- Payment entries are tracking records only and do not imply any gateway, card, or bank automation.
- Invoice balance and paid state are derived from recorded entries, not manually guessed.
- Manual status changes are intentionally narrow so the system cannot mark invoices paid without payment records.
- Aging is exposed through invoice detail fields, not through a separate gateway or settlement service.
