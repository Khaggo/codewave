# Client Integration Tasks

This track turns the existing domain and API work into customer-mobile and staff-admin web execution slices.

## Purpose

- make client-facing delivery explicit without redefining backend business truth
- keep web and mobile state models aligned to the SSoT and live Swagger contracts
- give frontend and backend one shared task ID per surface slice
- force every client slice to produce contract packs, typed contracts, mocks, and acceptance states

## Load Order

1. `../../README.md`
2. `../../system-architecture.md`
3. `../../api-strategy.md`
4. `../../dto-policy.md`
5. `../../frontend-backend-sync.md`
6. the owning domain doc
7. the relevant team-flow doc for the target surface
8. this file
9. the specific task file

## Track Defaults

- `bookings` is the first module to be completed in this track
- `frontend/` is the active client workspace today
- `mobile` remains a target product surface even though a dedicated mobile app root does not yet exist
- each task must label routes as `live` or `planned`
- each task must define happy, empty, error, unauthorized, forbidden, and conflict states where applicable
- each task must identify whether a client-visible state is synchronous truth or an async-derived read model

## Deliverable Rules

Each completed task should update:

- the task doc
- a handoff note in `docs/contracts/`
- typed contracts in `frontend/src/lib/api/generated/`
- mocks in `frontend/src/mocks/`
- surface-specific acceptance states for `customer mobile`, `staff/admin web`, or both

## Surface Split

- `mobile`: customer registration, booking, insurance, loyalty, timeline, ecommerce, and support journeys
- `web`: staff scheduling, job execution, QA, insurance handling, admin analytics, and privileged account management
- `cross-surface`: any slice that must keep customer and staff state views aligned across one backend truth
