# Digital Intake Inspection Web Navigation Surface

## Task ID

`T537`

## Title

Make the Digital Intake & Inspection module clearly discoverable in the staff web portal.

## Type

`client-integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/inspections.md`
- `../../domains/main-service/bookings.md`
- `../../domains/main-service/job-orders.md`
- `../../frontend-backend-sync.md`
- `T512-inspection-capture-and-verification-web-flow.md`
- `T516-job-order-workbench-web-flow.md`

## Depends On

- `T512`
- `T516`

## Goal

Make the progress-report `Digital Intake & Inspection Module` visible as a first-class staff/admin web surface instead of only being implied by bookings, vehicle records, job orders, or QA audit screens.

## Deliverables

- a clear web navigation entry, page section, or route label for intake and inspection work
- staff-facing copy that explains intake capture versus QA release review
- links from the intake/inspection surface to the existing booking, vehicle, inspection, and job-order flows
- route and RBAC visibility aligned with staff/admin-only web access

## Completion Notes

- Added `/admin/intake-inspections` as the first-class staff web surface for the progress-report `Digital Intake & Inspection Module`.
- Added the sidebar navigation entry as `Intake & Inspection` so the module is discoverable without guessing a hidden URL.
- Reused the existing live inspection routes through `inspectionStaffClient.js`:
  - `POST /api/vehicles/:id/inspections`
  - `GET /api/vehicles/:id/inspections`
- Added staff-facing copy that separates vehicle-scoped intake and completion inspection evidence from QA release review and super-admin override policy.
- Added route cards to the existing booking, vehicle, job-order, and QA surfaces without moving booking or job-order truth into inspections.
- Documented the API gap clearly in the UI: there is no broad inspection queue endpoint yet, so staff must load inspection history by known vehicle id.
- Updated staff navigation/RBAC metadata so technician, service adviser, and super-admin sessions can discover inspection capture; technicians can also discover the existing job-order execution workbench while handoff creation remains blocked in-workbench for non-adviser roles.

## Implementation Notes

- do not duplicate booking truth; intake should reference the confirmed booking or vehicle context owned by existing routes
- do not invent customer mobile inspection controls unless the source docs explicitly add a customer-safe surface
- prefer reusing `inspectionStaffClient.js` and existing inspection/job-order APIs before adding backend endpoints
- if a broad inspection queue endpoint is missing, label the gap clearly and keep vehicle/job-order-specific inspection loading intact

## Acceptance Checks

- staff/admin users can find a clearly labeled Digital Intake & Inspection entry or section from the web portal
- the surface explains which live routes are used and where broad queue support is still planned
- authorized staff can reach the existing capture/review path without manually guessing a hidden URL
- technician, service adviser, and super-admin visibility matches the RBAC navigation rules
- customer mobile remains customer-only and does not expose staff inspection controls

## Validation Evidence

- `cd D:\mainprojects\codewave\frontend && npm run build` passed.
- The production route list includes `/admin/intake-inspections`.
- No backend API or mobile customer surface was changed.

## Out of Scope

- redesigning QA audit release logic
- adding a new inspection queue backend endpoint unless implementation confirms it is required
- moving booking or job-order ownership into the inspection module
