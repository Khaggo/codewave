# T106 Job Orders Core

## Slice ID

`T106`

## Source Of Truth

- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/tasks/01-main-service/T106-job-orders-core.md`
- live controller when implemented: `backend/apps/main-service/src/modules/job-orders/controllers/job-orders.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/job-orders` | `live` | Swagger/controller |
| `GET /api/job-orders/:id` | `live` | Swagger/controller |
| `PATCH /api/job-orders/:id/status` | `live` | Swagger/controller |
| `POST /api/job-orders/:id/progress` | `planned` | task/domain doc |
| `POST /api/job-orders/:id/photos` | `planned` | task/domain doc |
| `POST /api/job-orders/:id/finalize` | `planned` | task/domain doc |

## Frontend Contract Files

- `frontend/src/lib/api/generated/job-orders/requests.ts`
- `frontend/src/lib/api/generated/job-orders/responses.ts`
- `frontend/src/lib/api/generated/job-orders/errors.ts`
- `frontend/src/mocks/job-orders/mocks.ts`

## Frontend States To Cover

- create job-order form
- job-order detail page
- technician assignment state
- staff status transition state
- planned progress timeline placeholder
- planned finalize gating placeholder

## Notes

- Core create/read/status routes are now live and should be treated as Swagger-backed runtime truth.
- Progress, photo, and finalize flows remain planned and should stay in mock-only mode until their slices ship.
- Service-adviser snapshot fields are required for live job-order creation.
