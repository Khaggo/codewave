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
| `GET /api/insurance/inquiries` | `live` | controller + web client | load the live staff table/list with optional workflow filters |
| `GET /api/insurance/inquiries/:id` | `live` | Swagger/controller | refresh one known insurance inquiry before staff action |
| `GET /api/users/:id/insurance-inquiries` | `live` | controller + staff client | load staff-side customer insurance history when needed |
| `PATCH /api/insurance/inquiries/:id/status` | `live` | controller + shipped web client | update inquiry status plus phase-1 workflow metadata from the staff web surface |
| `POST /api/insurance/inquiries/:id/documents/upload` | `live` | Swagger/controller | accept PDF/image uploads for inquiry evidence |
| `POST /api/insurance/inquiries/:id/documents` | `live` | Swagger/controller | keep legacy reference-document attachment available |

## Important Contract Constraint

- the phase-1 web page no longer depends on a planned mock queue contract
- the live workspace is driven by:
  - `GET /api/insurance/inquiries` for the staff list and summary filters
  - `GET /api/insurance/inquiries/:id` for detail refresh
  - `PATCH /api/insurance/inquiries/:id/status` for workflow edits
- the shipped web client drafts broader workflow fields, but the live controller still binds this route to `UpdateInsuranceInquiryStatusDto`
- because global validation uses whitelist + `forbidNonWhitelisted`, the live patch contract currently accepts only `status` and optional `reviewNotes`; extra workflow fields are not part of the exposed route contract today

## Staff Review List States

| State | Meaning |
| --- | --- |
| `queue_loaded` | live staff cases are visible in the table/list workspace |
| `queue_empty` | the live list has no cases for the current filters |
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
- the live list route accepts optional `status`, `paymentStatus`, and `renewalStatus` filters
- the web workspace shows summary cards, a live table/list, workflow detail, payment and renewal tags, staff notes, and activity visibility from the current inquiry payload
- the live patch route currently persists only:
  - `status`
  - `reviewNotes`
- broader workflow metadata exists in the backend phase-1 service/design layer, but it is not exposed by the live controller DTO on `PATCH /api/insurance/inquiries/:id/status` today
- customer intake fields such as subject, description, provider, policy number, and notes are read-only in this workspace
- role failures, missing records, and invalid transitions must remain distinct states in both contract packs and UI messaging
- this slice does not add insurer payout, settlement, or third-party integration behavior
- live phase-1 statuses are `submitted`, `needs_documents`, `under_review`, `for_approval`, `approved`, `payment_pending`, `active`, `for_renewal`, `closed`, `rejected`, and `cancelled`
- live workflow tags are `documentStatus`, `paymentStatus`, and `renewalStatus`; they complement the main inquiry status instead of replacing it

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
- The current web screen is already backed by the live staff list route rather than a mock review queue.
- The customer-history route exists for staff drill-down, but the shipped phase-1 page is centered on the live list/detail workspace.
