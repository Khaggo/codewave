# T512 Inspection Capture And Verification Web Flow

## Slice ID

`T512`

## Source Of Truth

- `docs/architecture/domains/main-service/inspections.md`
- `docs/architecture/domains/main-service/vehicles.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/tasks/05-client-integration/T512-inspection-capture-and-verification-web-flow.md`
- `docs/team-flow-staff-admin-web-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/inspections/controllers/inspections.controller.ts`
- web helper: `frontend/src/lib/inspectionStaffClient.js`

## Route Status

| Route | Status | Source | Web Purpose |
| --- | --- | --- | --- |
| `POST /api/vehicles/:id/inspections` | `live` | Swagger/controller | create intake, pre-repair, completion, or return inspection records from the staff/admin web surface |
| `GET /api/vehicles/:id/inspections` | `live` | Swagger/controller | load inspection history and detail-ready records for one vehicle |

## Staff Inspection Capture States

| State | Meaning |
| --- | --- |
| `capture_ready` | the staff session and target vehicle are valid for inspection capture |
| `capture_submitting` | the create-inspection request is in flight |
| `capture_saved_verified` | the saved inspection has findings and all findings are verified |
| `capture_saved_mixed` | the saved inspection contains a mix of verified and non-verified findings |
| `capture_saved_unverified` | the saved inspection exists but verification is not yet complete |
| `forbidden_role` | the current portal role must not open or act on the inspection workspace |
| `vehicle_not_found` | the target vehicle does not exist |
| `booking_vehicle_conflict` | the supplied booking does not belong to the selected vehicle |
| `completion_missing_findings` | completion inspection capture was attempted without at least one finding |
| `capture_failed` | a non-classified API or network failure blocked capture |

## Staff Inspection Read States

| State | Meaning |
| --- | --- |
| `history_loaded` | at least one inspection record exists for the selected vehicle |
| `history_empty` | the selected vehicle has no inspections yet |
| `detail_loaded` | one inspection record is selected for detail review from the loaded history |
| `forbidden_role` | the current portal role must not open the inspection workspace |
| `vehicle_not_found` | the requested vehicle record does not exist |
| `load_failed` | a non-classified API or network failure blocked inspection history loading |

## Frontend Contract Files

- `frontend/src/lib/api/generated/inspections/requests.ts`
- `frontend/src/lib/api/generated/inspections/responses.ts`
- `frontend/src/lib/api/generated/inspections/errors.ts`
- `frontend/src/lib/api/generated/inspections/staff-web-inspections.ts`
- `frontend/src/mocks/inspections/mocks.ts`
- `frontend/src/lib/inspectionStaffClient.js`

## Contract Rules

- inspection verification must be derived from inspection findings, not confused with lifecycle-summary review or QA override states
- the web surface may derive `verified`, `mixed_verification`, or `unverified` from finding records, but it must not invent new transport fields
- the inspections API is live for create and list only; detail review is a client selection state over the list response, not a separate API
- `forbidden_role` is a staff-portal and RBAC state, not a live inspections endpoint response in the current implementation
- missing vehicle and booking-to-vehicle mismatch must remain explicit failure states
- completion inspections should never be presented as successfully verified when the backend rejected them for missing findings

## Acceptance States

- capture ready
- capture saved verified
- capture saved mixed
- capture saved unverified
- history loaded
- history empty
- forbidden role
- vehicle not found
- booking vehicle conflict
- completion missing findings

## Notes

- This slice prepares the staff/admin web inspection boundary and verification-aware mocks; it does not add lifecycle-summary review or job-order progress behavior.
- Technician, service adviser, and super admin are the allowed staff-session roles for inspection workspace access in this slice, with `forbidden_role` handled at the portal layer.
