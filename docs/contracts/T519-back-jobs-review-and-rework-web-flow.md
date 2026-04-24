# T519 Back Jobs Review And Rework Web Flow

## Slice ID

`T519`

## Source Of Truth

- `docs/architecture/domains/main-service/back-jobs.md`
- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T519-back-jobs-review-and-rework-web-flow.md`
- `docs/contracts/T109-back-jobs-review-and-validation.md`
- live controller: `backend/apps/main-service/src/modules/back-jobs/controllers/back-jobs.controller.ts`
- live job-order controller: `backend/apps/main-service/src/modules/job-orders/controllers/job-orders.controller.ts`
- web helper: `frontend/src/lib/backJobsClient.js`
- web surface: `frontend/src/app/backjobs/BackJobsContent.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `POST /api/back-jobs` | `live` | Swagger/controller | create reviewed staff back-job cases against finalized original work |
| `GET /api/back-jobs/:id` | `live` | Swagger/controller | load one back-job case and its findings |
| `PATCH /api/back-jobs/:id/status` | `live` | Swagger/controller | advance review, validation, rejection, resolution, and closure states |
| `GET /api/vehicles/:id/back-jobs` | `live` | Swagger/controller | load back-job history for one vehicle |
| `POST /api/job-orders` with `sourceType = back_job` | `live` | Swagger/controller | create a linked rework job order after approval |
| `GET /api/back-jobs` | `planned` | task API gap | future broad staff list/search endpoint |
| `GET /api/users/:id/back-jobs` | `planned` | task API gap | future customer-mobile dedicated back-job list if needed |

## Important Contract Constraints

- there is **no live broad `GET /api/back-jobs` staff list** in the current backend Swagger surface
- staff web must load back-jobs by vehicle id, by known back-job id, or immediately after create
- `service_adviser` and `super_admin` own create, review status, and rework creation actions
- customer-facing visibility remains separate and must use customer-safe states only
- rework job orders use the existing job-order create route with `sourceType = back_job`
- duplicate rework is backend-blocked when a back job already has a linked rework job order

## Back-Job Review States

| State | Meaning |
| --- | --- |
| `back_jobs_ready` | the staff user can load by vehicle id or back-job id |
| `back_jobs_loading` | a live read request is in flight |
| `back_jobs_loaded` | the backend returned one or more back-job records |
| `back_jobs_empty` | the selected vehicle has no back-job cases |
| `back_jobs_forbidden_role` | the actor is not allowed to read/manage staff back-job review |
| `back_jobs_not_found` | the vehicle or case was not found |
| `back_jobs_failed` | a non-classified API or network failure blocked loading |

## Create States

| State | Meaning |
| --- | --- |
| `create_ready` | staff can submit lineage, complaint, and optional findings |
| `create_submitting` | create request is in flight |
| `create_saved` | backend created the case and returned detail |
| `create_forbidden_role` | actor cannot open staff back-job cases |
| `create_lineage_conflict` | customer, vehicle, booking, job, or inspection lineage is invalid |
| `create_failed` | a non-classified API or network failure blocked creation |

## Status And Rework States

| State | Meaning |
| --- | --- |
| `status_ready` | an allowed backend transition can be submitted |
| `status_saved` | the backend accepted the review status transition |
| `status_invalid_transition` | requested transition is not allowed from the current state |
| `status_evidence_required` | return-inspection or finding evidence is missing for inspection/rework approval |
| `rework_ready` | approved back-job can create one linked rework job order |
| `rework_saved` | the backend created the rework job order and linked the back job |
| `rework_not_approved` | the case is not in `approved_for_rework` |
| `rework_already_linked` | a rework job order already exists |

## Customer-Safe Visibility

| Back-job status | Visibility |
| --- | --- |
| `reported` | staff-only review |
| `inspected` | staff-only review |
| `approved_for_rework` | customer-safe rework update |
| `in_progress` | customer-safe rework update |
| `resolved` | customer-safe outcome |
| `closed` | customer-safe outcome |
| `rejected` | customer-safe outcome |

## Frontend Contract Files

- `frontend/src/lib/api/generated/back-jobs/requests.ts`
- `frontend/src/lib/api/generated/back-jobs/responses.ts`
- `frontend/src/lib/api/generated/back-jobs/errors.ts`
- `frontend/src/lib/api/generated/back-jobs/staff-web-back-jobs.ts`
- `frontend/src/mocks/back-jobs/mocks.ts`
- `frontend/src/lib/backJobsClient.js`
- `frontend/src/app/backjobs/BackJobsContent.js`

## Contract Rules

- original job, vehicle, customer, and optional booking lineage must remain visible
- return inspection is required before inspected or approved rework transitions when backend evidence rules demand it
- rework job-order creation must stay separate from primary QA and original job progress
- back-job state must not be collapsed into generic job-order status
- staff-only review states must not become customer mobile history without a dedicated customer-safe API slice
- missing broad staff list and dedicated mobile customer list remain planned gaps, not client-side fake endpoints

## Acceptance States

- vehicle back-job history loaded
- single back-job detail loaded
- back-job creation saved
- lineage conflict represented
- inspected/approved transition blocked when evidence is missing
- approved-for-rework state can create one linked rework job order
- duplicate rework conflict represented
- resolved, closed, rejected, and staff-only review visibility are distinct
- dedicated mobile customer list gap documented

## Notes

- This slice updates the existing `/backjobs` web surface.
- The next queued task, `T523`, owns derived analytics over back-jobs and other operational signals. This slice only exposes source-of-truth back-job review and rework actions.
