# T407 OpenAPI Contract Expansion

## Slice ID

`T407`

## Source Of Truth

- `docs/architecture/api-strategy.md`
- `docs/architecture/dto-policy.md`
- `docs/architecture/golden-domain-template.md`
- `docs/architecture/tasks/04-quality-and-ops/T407-openapi-contract-expansion.md`
- validator code:
  - `backend/scripts/swagger.contract.ts`
  - `backend/scripts/swagger-check.ts`
- regression test:
  - `backend/apps/main-service/test/openapi.integration.spec.ts`

## Expanded Route Coverage

The live main-service OpenAPI validator now requires the following implemented route families in `/docs-json`:

- auth and users baseline routes
- bookings:
  - `GET /api/services`
  - `GET /api/time-slots`
  - `POST /api/bookings`
  - `GET /api/bookings/{id}`
  - `PATCH /api/bookings/{id}/status`
  - `POST /api/bookings/{id}/reschedule`
  - `GET /api/bookings/daily-schedule`
  - `GET /api/queue/current`
- job orders:
  - `POST /api/job-orders`
  - `GET /api/job-orders/{id}`
  - `PATCH /api/job-orders/{id}/status`
  - `POST /api/job-orders/{id}/progress`
  - `POST /api/job-orders/{id}/photos`
  - `POST /api/job-orders/{id}/finalize`
- insurance:
  - `POST /api/insurance/inquiries`
  - `GET /api/insurance/inquiries/{id}`
  - `PATCH /api/insurance/inquiries/{id}/status`
  - `POST /api/insurance/inquiries/{id}/documents`
  - `GET /api/vehicles/{id}/insurance-records`
- QA routes:
  - `GET /api/job-orders/{jobOrderId}/qa`
  - `PATCH /api/job-orders/{jobOrderId}/qa/override`

## DTO Verification

The validator now requires explicit DTO schemas for:

- bookings request and response contracts
- job-order request and response contracts
- insurance request and response contracts
- quality-gate override and response contracts

This keeps the live spec aligned with the DTO policy instead of relying on inferred raw shapes.

## Test Files

- `backend/apps/main-service/test/openapi.integration.spec.ts`

## Scripts

- `npm run swagger:check`
- `npm run swagger:ready`

## Notes

- `swagger-check.ts` now reuses the same validator module as the integration test, so local and live OpenAPI checks cannot drift independently.
- `createMainServiceTestApp()` now registers Swagger by default, keeping the test harness aligned with the real main-service bootstrap path.
- On this machine, `npm run swagger:ready` may still be blocked by Docker permission issues even when the code-level OpenAPI contract is correct. That is an environment prerequisite, not a route-contract failure.
