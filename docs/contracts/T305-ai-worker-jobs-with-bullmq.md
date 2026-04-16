# T305 AI Worker Jobs With BullMQ

## Slice ID

`T305`

## Source Of Truth

- `docs/architecture/ai-governance.md`
- `docs/architecture/api-strategy.md`
- `docs/architecture/domains/main-service/quality-gates.md`
- `docs/architecture/domains/main-service/vehicle-lifecycle.md`
- `docs/architecture/tasks/03-integration/T305-ai-worker-jobs-with-bullmq.md`

## Queue Contract

- shared queue: `ai-worker-jobs`
- lifecycle summary job: `generate-vehicle-lifecycle-summary`
- quality-gate audit job: `run-quality-gate-audit`

## Public Route Impact

| Route | Status | Source | Queue-aware behavior |
| --- | --- | --- | --- |
| `POST /api/vehicles/:id/lifecycle-summary/generate` | `live` | Swagger/controller | returns a queued lifecycle summary draft with `generationJob` metadata |
| `PATCH /api/vehicles/:id/lifecycle-summary/:summaryId/review` | `live` | Swagger/controller | review is blocked until summary generation reaches `pending_review` |
| `GET /api/job-orders/:id/qa` | `live` | Swagger/controller | returns the QA record plus `auditJob` metadata while the AI worker runs or retries |

## Frontend Contract Files

- `frontend/src/lib/api/generated/shared.ts`
- `frontend/src/lib/api/generated/vehicle-lifecycle/requests.ts`
- `frontend/src/lib/api/generated/vehicle-lifecycle/responses.ts`
- `frontend/src/lib/api/generated/vehicle-lifecycle/errors.ts`
- `frontend/src/lib/api/generated/quality-gates/requests.ts`
- `frontend/src/lib/api/generated/quality-gates/responses.ts`
- `frontend/src/mocks/vehicle-lifecycle/mocks.ts`
- `frontend/src/mocks/quality-gates/mocks.ts`

## Frontend States To Cover

- queued lifecycle summary generation
- lifecycle summary generation failed after worker retries
- QA audit pending or processing while findings are still empty
- completed QA audit with stable findings and completed `auditJob` metadata
- safe retry UI messaging when AI worker metadata shows a failure but the source record remains intact

## Notes

- `T305` standardizes AI-assisted background work under one BullMQ queue so retries, backoff, and observability stay consistent across lifecycle summaries and QA audits.
- Worker metadata must be exposed on the owning domain record; the queue is never the source of truth by itself.
- Provider failures must not corrupt lifecycle summaries or QA records. They should surface as `generation_failed`, `pending`, or warning findings plus `failed` job metadata.
