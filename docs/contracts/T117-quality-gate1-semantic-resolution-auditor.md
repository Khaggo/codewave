# T117 Quality Gate 1 Semantic Resolution Auditor

## Slice ID

`T117`

## Source Of Truth

- `docs/architecture/domains/main-service/quality-gates.md`
- `docs/architecture/ai-governance.md`
- `docs/architecture/tasks/01-main-service/T117-quality-gate1-semantic-resolution-auditor.md`
- live service when implemented: `backend/apps/main-service/src/modules/quality-gates/services/quality-gates.service.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/job-orders/:jobOrderId/qa` | `live` | Swagger/controller |
| internal `runQualityGateAudit` | `live` | service |
| `PATCH /api/job-orders/:jobOrderId/qa/override` | `planned` | `T119` |

## Frontend Contract Files

- `frontend/src/lib/api/generated/quality-gates/requests.ts`
- `frontend/src/lib/api/generated/quality-gates/responses.ts`
- `frontend/src/lib/api/generated/quality-gates/errors.ts`
- `frontend/src/mocks/quality-gates/mocks.ts`

## Frontend States To Cover

- passed QA with advisory Gate 1 semantic support finding and provenance
- passed QA with Gate 1 review-needed warning that still requires staff interpretation
- blocked QA when foundation findings still stop release regardless of Gate 1 output
- insufficient-context QA finding when concern or completed-work narrative is too thin to compare

## Notes

- `T117` keeps Gate 1 advisory. It can raise review-needed findings and provenance, but it does not auto-release or auto-override a job order.
- Gate 1 provenance records the current provider boundary, model label, prompt version, matched keywords, and compact concern/work summaries.
- The current implementation uses a local rule-based semantic auditor so the provider adapter boundary exists before external AI-provider work lands.
- Manual override remains deferred to `T119`.
