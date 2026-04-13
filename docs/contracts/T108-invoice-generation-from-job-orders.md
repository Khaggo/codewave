# T108 Invoice Generation From Job Orders

## Slice ID

`T108`

## Source Of Truth

- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/tasks/01-main-service/T108-invoice-generation-from-job-orders.md`
- live controller when implemented: `backend/apps/main-service/src/modules/job-orders/controllers/job-orders.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/job-orders` | `live` | Swagger/controller |
| `GET /api/job-orders/:id` | `live` | Swagger/controller |
| `PATCH /api/job-orders/:id/status` | `live` | Swagger/controller |
| `POST /api/job-orders/:id/progress` | `live` | Swagger/controller |
| `POST /api/job-orders/:id/photos` | `live` | Swagger/controller |
| `POST /api/job-orders/:id/finalize` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/job-orders/requests.ts`
- `frontend/src/lib/api/generated/job-orders/responses.ts`
- `frontend/src/lib/api/generated/job-orders/errors.ts`
- `frontend/src/mocks/job-orders/mocks.ts`

## Frontend States To Cover

- finalize success with invoice-ready record visible
- finalize blocked because work is incomplete
- finalize blocked because the job order is not ready for QA
- finalize forbidden for non-adviser actors
- invoice-ready record display without payment-state assumptions

## Notes

- Finalize uses the authenticated adviser or super-admin actor; no request-body user id should be sent.
- The generated record is invoice-ready only. Payment tracking remains owned by the later ecommerce invoice-payment slices.
- Adviser identity and adviser code must remain visible in the generated invoice-ready record for auditability.
