# T118 Quality Gate 2 Discrepancy Risk Engine

## Slice ID

`T118`

## Source Of Truth

- `docs/architecture/domains/main-service/quality-gates.md`
- `docs/architecture/domains/main-service/inspections.md`
- `docs/architecture/tasks/01-main-service/T118-quality-gate2-discrepancy-risk-engine.md`
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

- blocked QA when Gate 2 finds verified high-severity inspection evidence unresolved by the completed-work record
- review-needed QA when inspection history exists but only warning-level discrepancies remain
- passed QA when the highest active risk remains below the release threshold
- no-inspection-evidence QA warning that stays reviewable without auto-blocking release

## Notes

- `T118` keeps Gate 2 fully rule-based and explainable. It does not use a generative provider.
- The current risk score is the highest active rule contribution, not a blind count of every finding.
- Gate 2 provenance now carries rule IDs, evidence references, evidence summaries, and per-rule risk contributions so staff can trace why QA blocked or warned.
- Blocking remains automatic only for the QA state. Manual override is still deferred to `T119`.
