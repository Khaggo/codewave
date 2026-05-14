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
| `POST /api/insurance/inquiries/:id/documents/upload` | `live` | Swagger/controller | upload PDF/image requirements, payment proof, and follow-up files |
| `POST /api/insurance/inquiries/:id/documents` | `live` | Swagger/controller | legacy reference-document fallback for file name / URL payloads |
| `GET /api/vehicles/:id/insurance-records` | `live` | Swagger/controller | load customer-safe vehicle-level insurance history and follow-on tracking records |
| `PATCH /api/insurance/inquiries/:id/status` | `live` | Swagger/controller | staff-only source of downstream status changes; not callable from customer mobile |

## Important Contract Constraint

- there is still **no customer self-list route** for insurance inquiries
- `GET /api/users/:id/insurance-inquiries` now exists, but it is staff-only customer history and is not part of the mobile contract
- customer claim-status visibility currently comes from:
  - the synchronous create response
  - `GET /api/insurance/inquiries/:id` when the mobile app knows an inquiry id
  - `GET /api/vehicles/:id/insurance-records` for follow-on vehicle record history

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
| `tracking_vehicle_records` | the selected vehicle already has one or more follow-on insurance history records |
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
- the canonical phase-1 lifecycle contract comes from the live backend statuses: `submitted`, `needs_documents`, `under_review`, `for_approval`, `approved`, `payment_pending`, `active`, `for_renewal`, `closed`, `rejected`, `cancelled`
- the shipped mobile surface still contains some legacy `approved_for_record` copy/handling; treat that as legacy client wording rather than canonical backend contract
- customer mobile must not expose `reviewNotes`, `reviewedByUserId`, or other staff-only review metadata
- customer-safe tags also surface `documentStatus`, `paymentStatus`, and `renewalStatus`
- binary uploads are the primary phase-1 document path; the reference-document route remains a compatibility path
- vehicle-level insurance records are customer-safe follow-on tracking records; they are not a replacement for staff review workflows
- `PATCH /api/insurance/inquiries/:id/status` stays staff-only even though it influences later mobile-visible status

## Acceptance States

- no vehicle available
- draft intake ready
- submitted inquiry returned from backend
- requirements checklist visible
- binary document upload available
- payment proof upload available
- renewal visibility available
- claim-status empty
- claim-status updates available
- insurance history / vehicle records available
- unauthorized session
- invalid vehicle

## Notes

- This slice upgrades the real customer mobile route instead of leaving `InsuranceInquiryScreen` as a placeholder module.
- Dashboard quick actions now link into the live insurance inquiry screen.
- The mobile client intentionally treats inquiry tracking as a known-id flow plus vehicle-record history; it does not call the live staff-only customer history route.
- Legacy `approved_for_record` wording in the mobile client should not be treated as the phase-1 lifecycle contract. Vehicle records are follow-on history, not a separate customer-facing inquiry status.
