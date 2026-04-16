# T303 Loyalty From Service And Purchase Events

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

It adds a live loyalty-trigger contract across service and ecommerce facts:

| Event | Status | Source |
| --- | --- | --- |
| `service.invoice_finalized` | `live` | shared service event contract + job-order publisher |
| `invoice.payment_recorded` | `live` | shared commerce event contract + ecommerce publisher |

It also adds a live internal loyalty accrual plan shape:

| Contract | Status | Source |
| --- | --- | --- |
| `LoyaltyAccrualPlan` for service invoices | `live` | shared loyalty accrual planner |
| `LoyaltyAccrualPlan` for purchase payments | `live` | shared loyalty accrual planner |

## Frontend Contract Files

- `frontend/src/lib/api/generated/loyalty/responses.ts`
- `frontend/src/mocks/loyalty/mocks.ts`

## Frontend States To Cover

- service loyalty accrual preview from a finalized service invoice fact
- purchase loyalty accrual preview from a recorded invoice payment fact
- duplicate delivery state where the same source reference produces no second award
- reversal-policy messaging for service and purchase accrual corrections

## Notes

- Loyalty accrual is internal and event-driven; there are no new browser-facing routes in this slice.
- `service.invoice_finalized` is the first-class service loyalty producer and replaces any temptation to award points from booking events.
- `invoice.payment_recorded` remains the purchase-side loyalty trigger until a broader purchase-completion fact is approved.
- Idempotency keys are deterministic by source reference: service uses `invoiceRecordId` and purchase uses `paymentEntryId`.
- Service accrual reversals stay manual until a dedicated service reversal fact exists; purchase accruals can later consume refund or reversal events.
