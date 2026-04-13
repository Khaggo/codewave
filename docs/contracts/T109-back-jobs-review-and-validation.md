# T109 Back Jobs Review And Validation

## Slice ID

`T109`

## Source Of Truth

- `docs/architecture/domains/main-service/back-jobs.md`
- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/tasks/01-main-service/T109-back-jobs-review-and-validation.md`
- live controllers when implemented:
  - `backend/apps/main-service/src/modules/back-jobs/controllers/back-jobs.controller.ts`
  - `backend/apps/main-service/src/modules/job-orders/controllers/job-orders.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/back-jobs` | `live` | Swagger/controller |
| `GET /api/back-jobs/:id` | `live` | Swagger/controller |
| `PATCH /api/back-jobs/:id/status` | `live` | Swagger/controller |
| `GET /api/vehicles/:id/back-jobs` | `live` | Swagger/controller |
| `POST /api/job-orders` with `sourceType = back_job` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/back-jobs/requests.ts`
- `frontend/src/lib/api/generated/back-jobs/responses.ts`
- `frontend/src/lib/api/generated/back-jobs/errors.ts`
- `frontend/src/mocks/back-jobs/mocks.ts`
- `frontend/src/lib/api/generated/job-orders/requests.ts`
- `frontend/src/lib/api/generated/job-orders/responses.ts`

## Frontend States To Cover

- back-job creation success
- back-job creation rejected because lineage is invalid
- review status update blocked because return inspection evidence is missing
- customer can read their own back-job case and vehicle history
- rework job-order creation from approved back job
- duplicate rework protection when a back job already has a linked job order

## Notes

- Back-job creation is staff-only for `service_adviser` and `super_admin`.
- Customer visibility is read-only and limited to their own cases.
- Approved back jobs can create job orders only when the case is `approved_for_rework`.
- Rework job orders now return `jobType` and `parentJobOrderId` so frontend flows can render the lineage clearly.
