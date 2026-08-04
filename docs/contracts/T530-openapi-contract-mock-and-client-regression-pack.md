# T530 OpenAPI Contract Mock And Client Regression Pack

## Slice ID

`T530`

## Status

Historical contract pack; implementation superseded.

## Current Sources Of Truth

- `packages/contracts/openapi/main-service.json`
- `frontend/src/lib/api/generated/`
- backend integration tests
- staff-web behavioral tests
- customer-mobile behavioral tests

The canonical OpenAPI document is generated from backend DTOs and controllers.
`npm run contracts:check` regenerates it in isolation and fails when committed
output has drifted.

## Retired Artifacts

The following aggregate artifacts were removed during workspace consolidation:

- `frontend/src/lib/api/generated/regression/client-regression-pack.ts`
- `frontend/src/mocks/regression/mocks.ts`

They must not be used or restored as a fallback contract. Their route matrix
mixed implemented and planned surfaces and became stale after the commerce scope
was removed.

## Maintained Verification

- OpenAPI routes and schemas: `npm run contracts:check`
- Documentation links and canonical files: `npm run check:docs`
- Repository policy and file-growth limits: `npm run check:policy`
- Supported product behavior: backend, web, and mobile test suites through
  `npm run check`

This document remains at its original path so historical task links do not break.
