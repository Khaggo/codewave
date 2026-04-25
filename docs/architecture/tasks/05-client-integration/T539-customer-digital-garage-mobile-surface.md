# Customer Digital Garage Mobile Surface

## Task ID

`T539`

## Title

Make the Digital Garage module clearly discoverable in the customer mobile app.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/vehicles.md`
- `../../domains/main-service/vehicle-lifecycle.md`
- `../../frontend-backend-sync.md`
- `T511-customer-vehicle-onboarding-and-management-mobile-flow.md`
- `T513-vehicle-timeline-and-reviewed-summary-mobile-flow.md`

## Depends On

- `T511`
- `T513`

## Goal

Make the progress-report `Digital Garage Module` visible as an obvious customer mobile surface instead of only being discoverable through profile fields, booking vehicle selection, or the home vehicle card.

## Deliverables

- a customer-facing Garage entry point from the dashboard, profile, or bottom navigation pattern
- owned-vehicle list or summary using the existing customer vehicle APIs
- clear links from each vehicle to booking, lifecycle timeline, and insurance inquiry paths
- explicit labels for unsupported garage actions such as archive vehicle or set default vehicle if endpoints are not yet available

## Implementation Notes

- mobile stays customer-only; do not expose staff vehicle administration here
- use existing owned-vehicle normalization from the mobile API boundary
- do not invent archive/default-vehicle client calls until backend endpoints exist
- keep the responsive-layout fixes from `T536` in mind so the Garage surface works across compact and larger phones

## Acceptance Checks

- a customer can find the Digital Garage without needing to open booking first
- the Garage surface displays at least the customer-owned vehicles and primary/default context available today
- booking, lifecycle, and insurance flows can be reached from the relevant vehicle context
- unsupported garage actions are labeled as planned instead of silently missing
- the surface remains usable on compact, baseline, and larger phone widths

## Implementation Summary

- Added a customer-only Digital Garage client boundary in `mobile/src/lib/digitalGarageClient.js` that reuses the live owned-vehicle API and records related live routes.
- Replaced the bottom navigation `Timeline` tab with `Garage` while preserving lifecycle timeline visibility inside the selected-vehicle garage context.
- Added dashboard quick action, profile section entry, owned-vehicle cards, and per-vehicle actions for booking, lifecycle timeline, and insurance inquiry.
- Added explicit planned labels for set-default and archive vehicle actions instead of creating client-only ownership truth.
- Added responsive card and action-grid styles so the garage surface stacks on compact devices and remains readable on larger phones.

## Required API Gaps Captured

- `PATCH /api/users/:id/vehicles/:vehicleId/default` for backend-owned default-vehicle selection.
- `PATCH /api/vehicles/:id/archive` for backend-owned vehicle archive behavior that preserves history.

## Acceptance Evidence

- Mobile screen: `mobile/src/screens/Dashboard.js`
- Mobile client boundary: `mobile/src/lib/digitalGarageClient.js`
- Live route dependencies: `GET /api/users/:id/vehicles`, `GET /api/vehicles/:id/timeline`, `POST /api/bookings`, `POST /api/insurance/inquiries`

## Validation Evidence

- `cd D:\mainprojects\codewave\mobile && npx expo export --platform android --output-dir .runtime/export-t539-digital-garage` passed.
- `cd D:\mainprojects\codewave\backend && npm run docs:validate` passed.

## Out of Scope

- staff/admin vehicle-record management
- archive vehicle and set-default backend endpoint implementation
- native document, camera, or media upload work
