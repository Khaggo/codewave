# T303 Loyalty From Paid Service Events

## Slice ID

`T303`

## Source Of Truth

- `docs/architecture/domains/main-service/loyalty.md`
- `docs/architecture/domains/ecommerce/commerce-events.md`
- `docs/architecture/tasks/03-integration/T303-loyalty-from-service-and-purchase-events.md`
- internal contract code:
  - `backend/shared/events/contracts/service-events.ts`
  - `backend/shared/events/contracts/commerce-events.ts`
  - `backend/shared/events/loyalty-accrual-planner.service.ts`

## Route Status

This slice does not add new public frontend routes.

It adds a live loyalty-trigger contract on paid service facts only:

| Event | Status | Source |
| --- | --- | --- |
| `service.payment_recorded` | `live` | shared service event contract + loyalty planner |

It also adds a live internal loyalty accrual plan shape:

| Contract | Status | Source |
| --- | --- | --- |
| `LoyaltyAccrualPlan` for paid service work | `live` | shared loyalty accrual planner |

## Frontend Contract Files

- `frontend/src/lib/api/generated/loyalty/responses.ts`
- `frontend/src/mocks/loyalty/mocks.ts`

## Frontend States To Cover

- service loyalty accrual preview from a recorded paid-service fact
- duplicate delivery state where the same source reference produces no second award
- reversal-policy messaging for service-payment accrual corrections

## Notes

- Loyalty accrual is internal and event-driven; there are no new browser-facing routes in this slice.
- `service.payment_recorded` is the canonical loyalty producer and replaces any temptation to award points from booking, invoice-finalized-only, or ecommerce events.
- Ecommerce `invoice.payment_recorded` remains a commerce-only settlement fact and is no longer a loyalty trigger.
- Idempotency keys are deterministic by source reference: paid service uses `invoiceRecordId`.
- Service-payment accrual reversals stay manual until a dedicated service refund or reversal fact exists.
