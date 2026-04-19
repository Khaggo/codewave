---
name: backend-contract-shapes
description: Use when changing backend DTOs, schemas, repository return shapes, controller responses, or shared event contracts in this repo. This skill is for keeping request/response contracts aligned across Nest modules, persistence models, and downstream consumers without drifting fields or breaking client expectations.
---

# Backend Contract Shapes

## Overview

Use this skill when the backend contract itself is changing.
That includes request DTOs, response DTOs, schema fields, repository return values, controller payloads, and shared event contract shapes.

## Contract Layers in This Repo

- Controllers: `backend/apps/*/src/modules/**/controllers/**`
- DTOs: `backend/apps/*/src/modules/**/dto/**`
- Schemas: `backend/apps/*/src/modules/**/schemas/**`
- Repositories/services: `backend/apps/*/src/modules/**/repositories/**`, `services/**`
- Shared event contracts: `backend/shared/events/contracts/**`

## Workflow

### 1. Start with the external contract

- Decide what the API or event should look like first.
- Confirm whether the contract is request-facing, response-facing, internal-only, or event-facing.

### 2. Align the full stack of files

For API work, update these together when needed:

- request DTO
- response DTO
- controller mapping
- service return shape
- repository selection/update behavior
- schema field definitions

For event work, update:

- contract type
- publisher payload
- consumer assumptions
- relevant tests

### 3. Keep database and API shapes intentionally separate

- Database columns do not have to match response fields 1:1.
- Repositories can return richer internal rows than controllers expose.
- Controllers should return stable consumer-facing shapes, not accidental database implementation details.

### 4. Watch transaction freshness

- If an update endpoint returns the updated entity, make sure the repository or transaction returns the fresh row, not stale pre-update data.
- Be especially careful with profile, booking, loyalty, and job-order updates.

### 5. Validate the contract

```powershell
cd backend
npm test -- <targeted-specs>
node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit
```

If persistence changed:

```powershell
cd backend
npm run db:push
```

## Good Patterns

- One clear DTO for input and one clear DTO for output when the shapes differ.
- Explicit controller mapping instead of leaking raw repository rows.
- Centralized event contract types under `backend/shared/events/contracts`.
- Narrow tests that assert the returned shape, not just status codes.

## Red Flags

- Controller response fields drift away from DTO definitions.
- Repository returns snake_case or DB-only fields directly to the controller response.
- Event payload changes without updating consumers.
- A backend field rename is done without checking web/mobile callers.

