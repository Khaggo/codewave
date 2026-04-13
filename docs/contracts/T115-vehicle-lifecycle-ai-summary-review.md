# T115 Vehicle Lifecycle AI Summary Review

## Slice ID

`T115`

## Source Of Truth

- `docs/architecture/domains/main-service/vehicle-lifecycle.md`
- `docs/architecture/ai-governance.md`
- `docs/architecture/tasks/01-main-service/T115-vehicle-lifecycle-ai-summary-review.md`
- live controller when implemented: `backend/apps/main-service/src/modules/vehicle-lifecycle/controllers/vehicle-lifecycle.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/vehicles/:id/timeline` | `live` | Swagger/controller |
| `POST /api/vehicles/:id/lifecycle-summary/generate` | `live` | Swagger/controller |
| `PATCH /api/vehicles/:id/lifecycle-summary/:summaryId/review` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/vehicle-lifecycle/requests.ts`
- `frontend/src/lib/api/generated/vehicle-lifecycle/responses.ts`
- `frontend/src/lib/api/generated/vehicle-lifecycle/errors.ts`
- `frontend/src/mocks/vehicle-lifecycle/mocks.ts`

## Frontend States To Cover

- lifecycle timeline with administrative and verified milestones
- generated summary draft waiting for human review
- approved summary visible to customer-facing UI only after review
- rejected summary state for staff-only revision workflows
- forbidden state when a customer tries to trigger or review lifecycle summaries

## Notes

- `T115` keeps lifecycle summary generation behind a provider-adapter boundary even though the current implementation uses a local deterministic summarizer.
- Generated summaries start in `pending_review` and remain hidden from customer-facing UI until a `service_adviser` or `super_admin` approves them.
- Provenance records the current provider boundary, model label, prompt version, and the compact lifecycle evidence references used to draft the summary.
