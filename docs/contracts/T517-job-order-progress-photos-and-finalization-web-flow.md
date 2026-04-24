# T517 Job Order Progress Photos And Finalization Web Flow

## Slice ID

`T517`

## Source Of Truth

- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T517-job-order-progress-photos-and-finalization-web-flow.md`
- `docs/contracts/T516-job-order-workbench-web-flow.md`
- `docs/contracts/T107-job-order-progress-and-photo-evidence.md`
- `docs/contracts/T108-invoice-generation-from-job-orders.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/job-orders/controllers/job-orders.controller.ts`
- web helper: `frontend/src/lib/jobOrderWorkbenchClient.js`
- web surface: `frontend/src/screens/JobOrderWorkbench.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `GET /api/job-orders/:id` | `live` | Swagger/controller | load a known job order for staff execution visibility |
| `POST /api/job-orders/:id/progress` | `live` | Swagger/controller | append assigned-technician progress entries |
| `POST /api/job-orders/:id/photos` | `live` | Swagger/controller | attach photo evidence by assigned technicians or staff reviewers |
| `POST /api/job-orders/:id/finalize` | `live` | Swagger/controller | generate the invoice-ready record after backend readiness checks pass |
| `POST /api/job-orders/:id/invoice/payments` | `live` | Swagger/controller | record settlement against the generated invoice-ready record |
| `GET /api/job-orders` | `planned` | task API gap | future list/filter workbench browsing route |

## Important Contract Constraint

- there is **no live `GET /api/job-orders` list route** in the current backend Swagger surface
- the web workbench must load execution detail by known job-order id or by the id returned after booking handoff creation
- progress, photos, finalization, and payment settlement are job-order-owned actions and must not mutate booking truth
- invoice payment here is invoice-record tracking, not automated payment-gateway settlement

## Progress States

| State | Meaning |
| --- | --- |
| `progress_ready` | an assigned technician can append progress to the loaded job order |
| `progress_submitting` | the progress request is in flight |
| `progress_saved` | the backend accepted the progress entry and returned the updated job order |
| `progress_forbidden_role` | the current role cannot append progress |
| `progress_not_assigned` | the current technician is not assigned to this job order |
| `progress_job_order_not_found` | the selected job order no longer exists |
| `progress_conflict` | the job order cannot accept the supplied progress evidence in its current state |
| `progress_failed` | a non-classified API or network failure blocked progress submission |

## Photo Evidence States

| State | Meaning |
| --- | --- |
| `photo_ready` | assigned technicians, service advisers, or super admins can attach evidence |
| `photo_submitting` | the photo-evidence request is in flight |
| `photo_saved` | the backend accepted the photo evidence and returned the updated job order |
| `photo_forbidden_role` | the current role cannot attach evidence |
| `photo_job_order_not_found` | the selected job order no longer exists |
| `photo_conflict` | the job order cannot accept photo evidence in its current state |
| `photo_failed` | a non-classified API or network failure blocked photo evidence submission |

## Finalization And Payment States

| State | Meaning |
| --- | --- |
| `finalize_ready` | responsible adviser or super admin can request invoice-ready finalization |
| `finalize_submitting` | the finalization request is in flight |
| `finalize_saved` | the backend generated the invoice-ready record |
| `finalize_forbidden_role` | the current role cannot finalize this job order |
| `finalize_job_order_not_found` | the selected job order no longer exists |
| `finalize_blocked_by_qa` | work completion, QA, or invoice-readiness rules blocked finalization |
| `payment_ready` | responsible adviser or super admin can record invoice settlement |
| `payment_saved` | the backend recorded payment and returned the updated job order |
| `payment_not_finalized` | the job order has no invoice-ready record yet |
| `payment_already_paid` | the invoice-ready record is already paid |

## Frontend Contract Files

- `frontend/src/lib/api/generated/job-orders/requests.ts`
- `frontend/src/lib/api/generated/job-orders/responses.ts`
- `frontend/src/lib/api/generated/job-orders/staff-web-execution.ts`
- `frontend/src/mocks/job-orders/mocks.ts`
- `frontend/src/lib/jobOrderWorkbenchClient.js`
- `frontend/src/screens/JobOrderWorkbench.js`
- `frontend/src/app/admin/job-orders/page.js`

## Contract Rules

- `technician` may load assigned execution detail and append progress only when assigned
- `technician`, `service_adviser`, and `super_admin` may attach photo evidence when backend access rules allow it
- only the responsible `service_adviser` or `super_admin` may finalize or record invoice payment
- finalization is not a status update; it is a dedicated invoice-ready generation route
- `finalize_blocked_by_qa` must stay distinct from generic validation or network failure
- payment recording requires a finalized job order with an invoice-ready record and must keep already-paid conflicts explicit
- lack of job-order list/filter remains a planned API gap, not a client-side fake queue

## Acceptance States

- known job order detail loaded
- assigned technician progress saved
- unassigned technician progress blocked
- photo evidence saved
- finalization saved with invoice-ready record
- finalization blocked by QA or readiness rules
- invoice payment saved
- already-paid invoice conflict represented
- forbidden role represented
- missing job-order list/filter documented as planned

## Notes

- This slice extends the `T516` job-order workbench instead of creating a parallel execution page.
- The next queued task, `T518`, owns richer QA gate review and override behavior. This task only exposes finalization blockers as backend outcomes.
