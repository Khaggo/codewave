# OpenAPI Contract Mock And Client Regression Pack

## Task ID

`T530`

## Status

`done` (historical implementation superseded)

## Original Goal

Create a shared regression registry that traced client tasks to typed contracts,
mocks, and the backend OpenAPI surface.

## Current Disposition

The generated registry and aggregate mock matrix delivered by this task were
retired during the service-only workspace consolidation. Keeping them would
duplicate the current contract and behavioral-test sources of truth.

The maintained regression boundary is now:

- `packages/contracts/openapi/main-service.json` for deterministic backend API
  routes and transport schemas;
- domain files under `frontend/src/lib/api/generated/` for client-facing shapes;
- backend integration tests, web behavioral tests, and mobile behavioral tests
  for supported workflow states;
- `npm run contracts:check` for generated OpenAPI drift;
- `npm run check` for the repository-wide quality gate.

The deleted files must not be restored as fallback truth:

- `frontend/src/lib/api/generated/regression/client-regression-pack.ts`
- `frontend/src/mocks/regression/mocks.ts`

## Compatibility

- Existing API routes and response shapes remain governed by the canonical
  OpenAPI artifact.
- Historical task and contract links remain valid through this document.
- Retired commerce, catalog, inventory, cart, and product-order surfaces are not
  part of the supported regression boundary.

## Acceptance Checks

- `npm run contracts:check` passes.
- `npm run check:docs` passes.
- Supported backend, staff-web, and customer-mobile behavioral suites pass.
- No active documentation claims that either deleted registry file is live.
