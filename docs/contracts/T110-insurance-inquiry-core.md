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
| `GET /api/insurance/inquiries` | `live` | Swagger/controller |
| `GET /api/insurance/inquiries/:id` | `live` | Swagger/controller |
| `GET /api/users/:id/insurance-inquiries` | `live` | Swagger/controller |
| `PATCH /api/insurance/inquiries/:id/status` | `live` | Swagger/controller |
| `PATCH /api/insurance/inquiries/:id/workflow` | `live` | Swagger/controller |
| `POST /api/insurance/inquiries/:id/documents/upload` | `live` | Swagger/controller |
| `POST /api/insurance/inquiries/:id/documents` | `live` | Swagger/controller |
| `GET /api/vehicles/:id/insurance-records` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/insurance/requests.ts`
- `frontend/src/lib/api/generated/insurance/responses.ts`
- `frontend/src/lib/api/generated/insurance/errors.ts`
- `frontend/src/mocks/insurance/mocks.ts`

## Frontend States To Cover

- inquiry submission form
- requirements checklist and document upload state
- inquiry detail/status page
- payment and renewal tracking state
- empty vehicle insurance history state
- foreign-customer forbidden state
- staff list/detail review state with workflow filters
- vehicle insurance-record history after staff follow-through

## Notes

- Phase-2 collections contract checklist:
  - live `PATCH /api/insurance/inquiries/:id/status` remains narrow and accepts `status` plus optional `reviewNotes`
  - live `PATCH /api/insurance/inquiries/:id/workflow` is the broader adviser/admin workflow route for collections metadata and later staff follow-up fields
  - the general phase-1 web review page stays aligned to the narrow status route, while the collections workspace uses the broader workflow route
  - customer mobile remains upload-driven and customer-safe
- The inquiry flow is internal workflow tracking only.
- Frontend copy should not imply direct insurer integration or automated claim approval.
- Inquiry creation and document upload are available to the owning customer and authorized staff.
- Status review is staff-only for `service_adviser` and `super_admin`.
- Phase-1 inquiry statuses are `submitted`, `needs_documents`, `under_review`, `for_approval`, `approved`, `payment_pending`, `active`, `for_renewal`, `closed`, `rejected`, and `cancelled`.
- Supporting workflow tags are:
  - `documentStatus`: `complete`, `incomplete`, `under_verification`, `rejected`
  - `paymentStatus`: `not_required`, `unpaid`, `proof_submitted`, `verifying`, `paid`, `overdue`
  - `renewalStatus`: `not_applicable`, `upcoming`, `quoted`, `awaiting_customer`, `renewed`, `expired`
- `GET /api/insurance/inquiries` is the live staff list route and accepts optional `status`, `paymentStatus`, and `renewalStatus` filters.
- `GET /api/users/:id/insurance-inquiries` is the live staff-only customer history route.
- `PATCH /api/insurance/inquiries/:id/status` is the live narrow staff edit route for `status` and optional `reviewNotes`, and it powers the general phase-1 web review page.
- `PATCH /api/insurance/inquiries/:id/workflow` is the live broader adviser/admin workflow route for collections metadata such as `documentStatus`, `paymentStatus`, `renewalStatus`, `paymentDueAt`, `policyExpiryAt`, `renewalDueAt`, `assignedStaffId`, and `reviewNotes`.
- The workflow route allows same-status updates so collections metadata can persist without forcing a status transition.
- The dedicated collections workspace lives at `/insurance/collections` and uses the broader workflow route, keeping the phase-1 review page aligned with the narrow `/status` contract.
- `POST /api/insurance/inquiries/:id/documents/upload` is the live binary upload route for PDF/image files. `POST /api/insurance/inquiries/:id/documents` remains available for metadata/reference-style document attachment.
