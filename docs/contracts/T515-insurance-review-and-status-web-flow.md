# T515 Insurance Review And Status Web Flow

## Slice ID

`T515`

## Source Of Truth

- `docs/architecture/domains/main-service/insurance.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T515-insurance-review-and-status-web-flow.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- web helper: `frontend/src/lib/insuranceStaffClient.js`
- web surface: `frontend/src/app/insurance/InsuranceContent.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `GET /api/insurance/review-queue` | `planned` | task contract | future staff queue read model for adviser/admin review |
| `GET /api/insurance/inquiries/:id` | `live` | Swagger/controller | refresh one known insurance inquiry before staff action |
| `PATCH /api/insurance/inquiries/:id/status` | `live` | Swagger/controller | update inquiry status and review notes from the staff web surface |
| `POST /api/insurance/inquiries/:id/documents` | `live` | Swagger/controller | reference route for downstream evidence additions after review asks for more files |

## Important Contract Constraint

- there is **no live staff queue list route** in the current backend Swagger surface
- this slice must not pretend that the queue is already live
- current web behavior therefore splits into:
  - planned queue cards backed by task-approved mocks
  - live detail loading through `GET /api/insurance/inquiries/:id`
  - live status updates through `PATCH /api/insurance/inquiries/:id/status`

## Staff Review Queue States

| State | Meaning |
| --- | --- |
| `queue_loaded` | mock-backed queue cards exist for adviser/admin review |
| `queue_empty` | the planned queue has no review items |
| `detail_loaded` | the selected inquiry detail is available for staff review |
| `forbidden_role` | the current portal role must not access the insurance review workspace |
| `load_failed` | a non-classified API or network failure blocked detail loading |

## Staff Status Update States

| State | Meaning |
| --- | --- |
| `status_update_ready` | the selected inquiry is ready for a valid transition |
| `status_update_submitting` | the live status update request is in flight |
| `status_update_saved` | the backend accepted the status change and returned canonical inquiry state |
| `forbidden_role` | the current role cannot update insurance review status |
| `inquiry_not_found` | the selected inquiry no longer exists |
| `invalid_transition` | the requested next status is not valid for the inquiry's current backend state |
| `update_failed` | a non-classified API or network failure blocked the save |

## Frontend Contract Files

- `frontend/src/lib/api/generated/insurance/errors.ts`
- `frontend/src/lib/api/generated/insurance/staff-web-insurance.ts`
- `frontend/src/mocks/insurance/mocks.ts`
- `frontend/src/lib/insuranceStaffClient.js`
- `frontend/src/app/insurance/InsuranceContent.js`

## Contract Rules

- only `service_adviser` and `super_admin` may use the staff insurance review workspace
- queue cards are a planned read model and must stay clearly labeled as such until the backend exposes a live list route
- live staff edits are limited to the backend DTO fields:
  - `status`
  - `reviewNotes`
- customer intake fields such as subject, description, provider, policy number, and notes are read-only in this workspace
- role failures, missing records, and invalid transitions must remain distinct states in both contract packs and UI messaging
- this slice does not add insurer payout, settlement, or third-party integration behavior

## Acceptance States

- queue loaded
- queue empty
- detail loaded
- status update saved
- forbidden role
- inquiry not found
- invalid transition
- load failed
- update failed

## Notes

- This slice upgrades the staff/admin insurance page from placeholder content into a contract-aware review workspace.
- The queue stays honest about its current status: planned read model today, live detail and status update routes right now.
- The next backend improvement for this surface is a real adviser/admin review-queue endpoint so the web page can drop the mock-backed queue layer.
