# T107 Job Order Progress And Photo Evidence

## Slice ID

`T107`

## Source Of Truth

- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/tasks/01-main-service/T107-job-order-progress-and-photo-evidence.md`
- live controller when implemented: `backend/apps/main-service/src/modules/job-orders/controllers/job-orders.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/job-orders` | `live` | Swagger/controller |
| `GET /api/job-orders/:id` | `live` | Swagger/controller |
| `PATCH /api/job-orders/:id/status` | `live` | Swagger/controller |
| `POST /api/job-orders/:id/progress` | `live` | Swagger/controller |
| `POST /api/job-orders/:id/photos` | `live` | Swagger/controller |
| `POST /api/job-orders/:id/finalize` | `planned` | task/domain doc |

## Frontend Contract Files

- `frontend/src/lib/api/generated/job-orders/requests.ts`
- `frontend/src/lib/api/generated/job-orders/responses.ts`
- `frontend/src/lib/api/generated/job-orders/errors.ts`
- `frontend/src/mocks/job-orders/mocks.ts`

## Frontend States To Cover

- progress-entry submission success
- progress-entry validation error
- photo-evidence submission success
- unassigned-technician forbidden state
- cancelled or finalized evidence-lock state
- planned finalize placeholder

## Notes

- Progress entries are technician-owned and use the authenticated actor, not a request-body user id.
- Photo evidence is linked with the authenticated staff actor and remains internal-only in this slice.
- Finalize flow remains planned and should stay mock-only until the next job-order slice ships.
