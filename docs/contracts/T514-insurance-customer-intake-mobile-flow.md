# T514 Insurance Customer Intake Mobile Flow

## Slice ID

`T514`

## Source Of Truth

- `docs/architecture/domains/main-service/insurance.md`
- `docs/architecture/tasks/05-client-integration/T514-insurance-customer-intake-mobile-flow.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/team-flow-customer-mobile-lifecycle.md`
- live controller: `backend/apps/main-service/src/modules/insurance/controllers/insurance.controller.ts`
- mobile client helper: `mobile/src/lib/insuranceClient.js`
- mobile surface: `mobile/src/screens/InsuranceInquiryScreen.js`

## Route Status

| Route | Status | Source | Mobile Purpose |
| --- | --- | --- | --- |
| `POST /api/insurance/inquiries` | `live` | Swagger/controller | create a customer insurance inquiry for a selected owned vehicle |
| `GET /api/insurance/inquiries/:id` | `live` | Swagger/controller | refresh a known inquiry id when the mobile app already has one from the current session or a future deep link |
| `GET /api/vehicles/:id/insurance-records` | `live` | Swagger/controller | load customer-safe vehicle-level claim-status updates after staff record creation |
| `PATCH /api/insurance/inquiries/:id/status` | `live` | Swagger/controller | staff-only source of downstream status changes; not callable from customer mobile |

## Important Contract Constraint

- there is **no live customer list route** for insurance inquiries in the current backend Swagger surface
- this slice must not invent `GET /api/users/:id/insurance-inquiries`
- customer claim-status visibility currently comes from:
  - the synchronous create response
  - `GET /api/insurance/inquiries/:id` when the mobile app knows an inquiry id
  - `GET /api/vehicles/:id/insurance-records` for adviser-approved record tracking

## Intake State Model

| State | Meaning |
| --- | --- |
| `no_vehicle` | the customer has no owned vehicle available for intake |
| `draft_ready` | the customer can submit a documented inquiry draft using a selected owned vehicle |
| `submitting` | the create inquiry request is in flight |
| `submitted_inquiry` | the backend accepted the inquiry and returned canonical status |
| `validation_error` | subject or description is missing, or the backend rejected the documented payload |
| `invalid_vehicle` | the selected vehicle is missing, stale, or fails the ownership gate |
| `unauthorized_session` | the customer session is missing before intake can be submitted |
| `submit_failed` | a non-classified network or API failure prevented inquiry creation |

## Tracking State Model

| State | Meaning |
| --- | --- |
| `tracking_loading` | the mobile app is loading known inquiry status and vehicle claim-status updates |
| `tracking_empty` | no known inquiry or insurance record update exists yet for the selected vehicle |
| `tracking_latest_inquiry` | the mobile app is showing a current inquiry from a known inquiry id |
| `tracking_vehicle_records` | the selected vehicle already has one or more insurance record updates |
| `tracking_not_found` | the known inquiry id no longer resolves for the current customer |
| `tracking_unauthorized_session` | the customer session is missing before tracking can load |
| `tracking_load_failed` | a non-classified network or API failure prevented tracking data from loading |

## Frontend Contract Files

- `frontend/src/lib/api/generated/insurance/requests.ts`
- `frontend/src/lib/api/generated/insurance/responses.ts`
- `frontend/src/lib/api/generated/insurance/customer-mobile-insurance.ts`
- `frontend/src/mocks/insurance/mocks.ts`
- `mobile/src/lib/insuranceClient.js`
- `mobile/src/screens/InsuranceInquiryScreen.js`
- `mobile/src/screens/Dashboard.js`

## Customer-Safe Rules

- vehicle ownership remains the backend gate for inquiry creation
- mobile must show backend-owned insurance statuses and must not invent alternate status enums
- customer mobile must not expose `reviewNotes`, `reviewedByUserId`, or other staff-only review metadata
- vehicle-level insurance records are customer-safe claim tracking; they are not a replacement for staff review workflows
- `PATCH /api/insurance/inquiries/:id/status` stays staff-only even though it influences later mobile-visible status

## Acceptance States

- no vehicle available
- draft intake ready
- submitted inquiry returned from backend
- claim-status empty
- claim-status updates available
- unauthorized session
- invalid vehicle

## Notes

- This slice upgrades the real customer mobile route instead of leaving `InsuranceInquiryScreen` as a placeholder module.
- Dashboard quick actions now link into the live insurance inquiry screen.
- The mobile client intentionally treats inquiry tracking as a current-session or known-id flow until a backend customer history route is approved.
