# T110 Insurance Inquiry Core

## Slice ID

`T110`

## Source Of Truth

- `docs/architecture/domains/main-service/insurance.md`
- `docs/architecture/tasks/01-main-service/T110-insurance-inquiry-core.md`
- live controllers when implemented:
  - `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `POST /api/insurance/inquiries` | `live` | Swagger/controller |
| `GET /api/insurance/inquiries/:id` | `live` | Swagger/controller |
| `PATCH /api/insurance/inquiries/:id/status` | `live` | Swagger/controller |
| `POST /api/insurance/inquiries/:id/documents` | `live` | Swagger/controller |
| `GET /api/vehicles/:id/insurance-records` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/insurance/requests.ts`
- `frontend/src/lib/api/generated/insurance/responses.ts`
- `frontend/src/lib/api/generated/insurance/errors.ts`
- `frontend/src/mocks/insurance/mocks.ts`

## Frontend States To Cover

- inquiry submission form
- document upload state
- inquiry detail/status page
- empty vehicle insurance history state
- foreign-customer forbidden state
- approved-for-record state with vehicle insurance-record history

## Notes

- The inquiry flow is internal workflow tracking only.
- Frontend copy should not imply direct insurer integration or automated claim approval.
- Inquiry creation and document upload are available to the owning customer and authorized staff.
- Status review is staff-only for `service_adviser` and `super_admin`.
