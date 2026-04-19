# T301 Main Ecommerce Event Contracts

## Slice ID

`T301`

## Source Of Truth

- `docs/architecture/domains/ecommerce/commerce-events.md`
- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/domains/main-service/loyalty.md`
- `docs/architecture/tasks/03-integration/T301-main-ecommerce-event-contracts.md`
- internal contract code:
  - `backend/shared/events/contracts/commerce-events.ts`

## Route Status

This slice does not add public frontend routes.

It adds live internal RabbitMQ event contracts:

| Event | Status | Source |
| --- | --- | --- |
| `order.created` | `live` | shared event contract + ecommerce publisher |
| `order.invoice_issued` | `live` | shared event contract + ecommerce publisher |
| `invoice.payment_recorded` | `live` | shared event contract + ecommerce publisher |

## Frontend Contract Files

- `frontend/src/lib/api/generated/commerce-events/responses.ts`
- `frontend/src/mocks/commerce-events/mocks.ts`

## Frontend States To Cover

- internal event-inspection state for order creation facts
- invoice-issued reminder planning state
- invoice-payment-recorded loyalty and notification reaction state

## Notes

- These events are internal cross-service contracts, not browser-facing REST endpoints.
- Payloads carry stable identifiers and metadata only; consumers must not assume direct ecommerce table access.
- `order.invoice_issued` is the reminder trigger fact for notifications.
- `invoice.payment_recorded` is the reminder-refresh and analytics fact for downstream domains.
- workshop/service loyalty accrual must not consume ecommerce payment events
