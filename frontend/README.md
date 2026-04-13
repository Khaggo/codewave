# AUTOCARE Frontend Contract Workspace

This folder is the future home of the frontend codebase and already contains the first shared API contract packs and mock fixtures.

If you are importing a full frontend project from another machine, use the backend helper scripts instead of manually pasting files over this folder:

```powershell
cd backend
npm run frontend:import -- <path-to-frontend-project>
npm run frontend:inspect
```

The import flow preserves the backend-owned contracts under `src/lib/api/generated/` and the slice mocks under `src/mocks/`.

## Purpose

- give frontend work a typed starting point before every backend slice is fully implemented
- keep generated or curated API assumptions close to the workspace
- make it obvious which routes are `live` and which are only `planned`

## Current Structure

- `src/lib/api/generated/`: slice-based request, response, and error contracts
- `src/mocks/`: slice-based mock fixtures for UI and integration work

## Rules

- these files are helpers, not the source of truth
- business meaning comes from `docs/architecture/domains/...`
- execution intent comes from `docs/architecture/tasks/...`
- implemented route truth comes from backend Swagger at `/docs-json`
- if a contract file says `planned`, frontend should treat it as mock-only until the route is live
