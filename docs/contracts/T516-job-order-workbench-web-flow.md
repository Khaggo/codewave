# T516 Job Order Workbench Web Flow

## Slice ID

`T516`

## Source Of Truth

- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/domains/main-service/bookings.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T516-job-order-workbench-web-flow.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/job-orders/controllers/job-orders.controller.ts`
- web helper: `frontend/src/lib/jobOrderWorkbenchClient.js`
- web surface: `frontend/src/screens/JobOrderWorkbench.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `GET /api/bookings/daily-schedule` | `live` | Swagger/controller | derive confirmed booking handoff candidates without inventing a job-order list |
| `POST /api/job-orders` | `live` | Swagger/controller | create a job order from confirmed booking intake |
| `GET /api/job-orders/:id` | `live` | Swagger/controller | load one job order by created id or known id |
| `PATCH /api/job-orders/:id/status` | `live` | Swagger/controller | advance job-order status using validated backend transitions |

## Important Contract Constraint

- there is **no live `GET /api/job-orders` list route** in the current backend Swagger surface
- this slice must not invent a staff job-order queue endpoint
- current web behavior therefore splits into:
  - live booking schedule read used as the booking-to-job-order handoff source
  - live create/read/status routes for job-order truth
  - no photo, progress, finalization, or QA actions yet in this slice

## Booking Handoff States

| State | Meaning |
| --- | --- |
| `handoff_loaded` | one or more confirmed bookings are available for job-order handoff |
| `handoff_empty` | no confirmed bookings are available for the selected schedule date |
| `handoff_forbidden_role` | the current portal role must not open the job-order workbench |
| `handoff_load_failed` | a non-classified failure blocked booking handoff loading |

## Job-Order Create States

| State | Meaning |
| --- | --- |
| `create_ready` | the selected confirmed booking is ready for a live create request |
| `create_submitting` | the create request is in flight |
| `create_saved` | the backend accepted the booking handoff and returned the new job order |
| `duplicate_blocked` | a job order already exists for the selected booking |
| `source_not_eligible` | the source booking is stale or no longer eligible for handoff |
| `forbidden_role` | the current role cannot create job orders |
| `create_failed` | a non-classified failure blocked creation |

## Job-Order Read And Status States

| State | Meaning |
| --- | --- |
| `detail_loaded` | a job order was loaded from the live detail route |
| `job_order_not_found` | the requested job order no longer exists |
| `forbidden_role` | the current role cannot load or update the selected job order |
| `load_failed` | a non-classified failure blocked detail loading |
| `status_update_ready` | the loaded job order is ready for a valid transition |
| `status_update_submitting` | the status update request is in flight |
| `status_update_saved` | the backend accepted the transition and returned the updated job order |
| `invalid_transition` | the requested next status is not valid for the current backend state |
| `update_failed` | a non-classified failure blocked the save |

## Frontend Contract Files

- `frontend/src/lib/api/generated/job-orders/requests.ts`
- `frontend/src/lib/api/generated/job-orders/responses.ts`
- `frontend/src/lib/api/generated/job-orders/errors.ts`
- `frontend/src/lib/api/generated/job-orders/staff-web-workbench.ts`
- `frontend/src/mocks/job-orders/mocks.ts`
- `frontend/src/lib/jobOrderWorkbenchClient.js`
- `frontend/src/screens/JobOrderWorkbench.js`
- `frontend/src/app/admin/job-orders/page.js`

## Contract Rules

- booking truth and job-order truth remain separate even when surfaced in one workbench
- only `service_adviser` and `super_admin` may use this route in the current slice
- booking handoff is derived from confirmed booking schedule state, not from a job-order-owned queue
- live create payloads must use the backend DTO fields:
  - `sourceType`
  - `sourceId`
  - `customerUserId`
  - `vehicleId`
  - `serviceAdviserUserId`
  - `serviceAdviserCode`
  - `notes`
  - `items`
  - optional `assignedTechnicianIds`
- assignment remains explicit input because a live staff-directory lookup route is not part of this slice
- blocked or duplicate creation states must stay distinct from generic save failures

## Acceptance States

- confirmed booking handoff loaded
- no confirmed booking handoff available
- job order created from booking handoff
- duplicate creation blocked
- source booking no longer eligible
- live job-order detail loaded
- job-order status update saved
- invalid transition blocked
- forbidden role

## Notes

- This slice adds a dedicated staff/admin job-order workbench route instead of hiding the workflow inside booking-only UI.
- The next web slice extends this same route with progress entries, photo evidence, and finalization behavior.
