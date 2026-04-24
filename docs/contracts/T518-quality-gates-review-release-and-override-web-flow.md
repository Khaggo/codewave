# T518 Quality Gates Review Release And Override Web Flow

## Slice ID

`T518`

## Source Of Truth

- `docs/architecture/domains/main-service/quality-gates.md`
- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/tasks/05-client-integration/T518-quality-gates-review-release-and-override-web-flow.md`
- `docs/contracts/T116-quality-gates-foundation.md`
- `docs/contracts/T117-quality-gate1-semantic-resolution-auditor.md`
- `docs/contracts/T118-quality-gate2-discrepancy-risk-engine.md`
- `docs/contracts/T119-quality-gate-manual-override.md`
- live controller: `backend/apps/main-service/src/modules/quality-gates/controllers/quality-gates.controller.ts`
- web helper: `frontend/src/lib/qualityGateClient.js`
- web surface: `frontend/src/screens/QAAuditWorkspace.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `GET /api/job-orders/:jobOrderId/qa` | `live` | Swagger/controller | read QA status, findings, risk score, audit job metadata, and override history |
| `PATCH /api/job-orders/:jobOrderId/qa/override` | `live` | Swagger/controller | record a super-admin manual override for a blocked gate |
| `GET /api/job-orders/:jobOrderId/qa/template` | `planned` | task API gap | future service-specific required checks and template definitions |
| `GET /api/quality-gates` | `planned` | task API gap | future broad QA queue/list view if staff need search beyond known job-order ids |

## Important Contract Constraints

- there is **no live QA list endpoint** in the current backend Swagger surface
- staff web must load QA by a known job-order id from the job-order workbench or another operational source
- `technician`, `service_adviser`, and `super_admin` may read QA when backend assignment/reviewer rules allow it
- only `super_admin` may approve a manual override
- overrides do not erase findings; they add an override audit row and move release to allowed-by-override
- service-specific templates and required-check definitions must remain documented API gaps until backend contracts expose them

## QA Review States

| State | Meaning |
| --- | --- |
| `qa_ready` | a staff user can enter a known job-order id |
| `qa_loading` | the live QA read request is in flight |
| `qa_loaded` | the backend returned QA status, findings, risk score, audit job metadata, and overrides |
| `qa_unavailable` | the job order has not entered ready-for-QA or no gate exists yet |
| `qa_forbidden_role` | the actor is not allowed to read the gate |
| `qa_not_found` | the job order or QA actor was not found |
| `qa_failed` | a non-classified API or network failure blocked QA loading |

## Release States

| State | Meaning |
| --- | --- |
| `release_unavailable` | no QA gate can drive release yet |
| `release_pending_audit` | QA exists but the audit has not finished |
| `release_blocked` | critical QA findings block release and finalization |
| `release_allowed` | QA passed and release/finalization may continue |
| `release_allowed_by_override` | a super-admin override allows release while preserving findings |

## Override States

| State | Meaning |
| --- | --- |
| `override_ready` | a super admin can submit a reason for a blocked gate |
| `override_submitting` | the override request is in flight |
| `override_saved` | the backend recorded the override and returned updated QA state |
| `override_forbidden_role` | the actor is not a super admin |
| `override_not_blocked` | the QA gate is not currently blocked |
| `override_not_found` | the job order or gate was not found |
| `override_failed` | a non-classified API or network failure blocked override |

## Frontend Contract Files

- `frontend/src/lib/api/generated/quality-gates/requests.ts`
- `frontend/src/lib/api/generated/quality-gates/responses.ts`
- `frontend/src/lib/api/generated/quality-gates/errors.ts`
- `frontend/src/lib/api/generated/quality-gates/staff-web-qa-review.ts`
- `frontend/src/mocks/quality-gates/mocks.ts`
- `frontend/src/lib/qualityGateClient.js`
- `frontend/src/screens/QAAuditWorkspace.js`
- `frontend/src/app/admin/qa-audit/page.js`

## Contract Rules

- blocked, pending, passed, and overridden QA states must stay visually distinct
- release affordances must depend on QA status, not only job-order status
- super-admin override controls must be hidden or disabled for every other role
- override reason must be explicit and sent to the backend `reason` field
- audit job metadata should be shown as worker evidence, not as final authority
- client examples may demonstrate states, but live data must come from the QA routes
- service-type required checks remain a future backend expansion

## Acceptance States

- known job-order QA loaded
- QA unavailable before ready-for-QA represented
- blocked QA findings visible
- pending audit represented
- passed QA release state represented
- super-admin override saved through the live route
- non-super-admin override blocked
- overridden QA shows original findings and latest override
- service-template API gap documented

## Notes

- This slice extends the existing `/admin/qa-audit` surface instead of inventing a new web area.
- The next queued task, `T519`, owns back-job review and rework behavior. Back-job signals may influence QA findings, but the back-job workflow remains separate.
