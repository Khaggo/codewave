# T116 Quality Gates Foundation

## Slice ID

`T116`

## Source Of Truth

- `docs/architecture/domains/main-service/quality-gates.md`
- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/tasks/01-main-service/T116-quality-gates-foundation.md`
- live controller when implemented: `backend/apps/main-service/src/modules/quality-gates/controllers/quality-gates.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/job-orders/:jobOrderId/qa` | `live` | Swagger/controller |
| `PATCH /api/job-orders/:jobOrderId/qa/override` | `planned` | `T119` |
| internal `runQualityGateAudit` | `live` | service |

## Frontend Contract Files

- `frontend/src/lib/api/generated/quality-gates/requests.ts`
- `frontend/src/lib/api/generated/quality-gates/responses.ts`
- `frontend/src/lib/api/generated/quality-gates/errors.ts`
- `frontend/src/mocks/quality-gates/mocks.ts`

## Frontend States To Cover

- blocked QA state with blocking findings visible
- passed QA state with no blocking reason
- QA unavailable state before a job order reaches `ready_for_qa`
- release blocked state when QA still requires action
- planned manual-override state kept mock-only until `T119`

## Notes

- `T116` introduces the QA record, findings, and release block; it does not make manual override live yet.
- Job orders enter QA when they move to `ready_for_qa`.
- Foundation audit currently blocks release on incomplete work items and surfaces missing progress evidence as a warning.
- Final invoice generation must respect the QA state even though the live override route is deferred.
