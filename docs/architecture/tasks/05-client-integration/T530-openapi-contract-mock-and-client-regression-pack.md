# OpenAPI Contract Mock And Client Regression Pack

## Task ID

`T530`

## Title

Create the final client regression pack across OpenAPI, typed contracts, mocks, and acceptance states.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../api-strategy.md`
- `../../frontend-backend-sync.md`
- `../../dto-policy.md`
- `../../../team-flow-engineering-source-of-truth.md`

## Depends On

- `T528`
- `T529`
- `T407`

## Goal

Close the client-integration track with one regression layer that checks task outputs, contract packs, typed contracts, mocks, and live Swagger against one another.

## Module Name

Client Regression Registry / OpenAPI Drift Audit Layer

## Description

Final client-integration slice that adds one shared regression registry for task traceability, route drift, mock coverage, and acceptance ownership across the completed AUTOCARE client queue.

## Business Value

- gives the repo one machine-readable place to trace a client slice from task file to contract pack, typed contract, and mock file
- makes live-versus-planned route drift visible before new web or mobile work builds on bad assumptions
- stops mock coverage from becoming scattered tribal knowledge across many folders
- creates a clean end-of-queue audit layer so future client work can update one regression pack instead of rediscovering historical slices

## Login, Registration, And Booking Integration Points

- login and registration remain part of the audited surface because auth, activation, session restore, and customer or staff routing are all tracked in the regression registry
- booking remains a primary cross-surface anchor because the registry includes discovery, create, history, schedule, queue, decision, and reminder-sync contracts
- downstream modules such as notifications, insurance, job orders, catalog, checkout, and analytics are all checked in relation to the same customer-mobile or staff-admin-web boundaries
- the regression pack does not replace runtime auth or booking logic; it verifies that the checked-in contract and mock layer still matches the intended product boundaries

## Required Database/API Changes

- no database migration is required for this slice
- no new backend route is required for the regression pack itself
- use checked-in typed route contracts as the OpenAPI baseline when live Swagger is unreachable
- document planned gaps explicitly instead of inventing client routes:
  - notification read or unread persistence endpoints
  - staff insurance review queue read model
  - inventory quantity detail and adjustment routes
  - analytics date-range and export routes

## Deliverables

- client regression checklist
- route-by-route drift matrix for live versus planned states
- mock coverage checklist for happy, empty, error, unauthorized, forbidden, and conflict states
- typed regression registry in `frontend/src/lib/api/generated/regression/client-regression-pack.ts`
- mock coverage registry in `frontend/src/mocks/regression/mocks.ts`
- human-readable contract pack in `docs/contracts/T530-openapi-contract-mock-and-client-regression-pack.md`

## Implementation Notes

- Swagger remains the runtime truth for implemented routes
- task and domain docs remain the intended truth for planned routes
- regression checks should surface drift, not hide it with silent fallback assumptions

## Acceptance Checks

- all client slices can be traced back to task, domain, and Swagger truth
- live routes and typed contracts stay aligned
- mocks cover the required state families across the completed client slices
- the pack records when live Swagger was unavailable instead of silently claiming a runtime check passed
- `backend npm run docs:validate` passes after the T530 docs and task updates
- `frontend npm run build` passes with the new regression registry files present

## Out of Scope

- new business-domain behavior
- infrastructure changes unrelated to contract validation
