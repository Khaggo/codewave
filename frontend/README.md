# AUTOCARE Frontend Workspace

This folder contains the imported frontend app plus the backend-owned slice contracts and mocks used for integration.

## What Stays In Git

- application source and config
- `src/lib/api/generated/` slice contract files
- `src/mocks/` slice mock fixtures
- `package.json` and lockfile
- `.env.example`

## What Stays Local Only

- `.claude/`
- `.codex-integration/`
- `.expo/`
- `.next/`
- `node_modules/`
- local `.env` files

These local-only folders are tooling or machine-specific metadata and are not part of the application contract.

## Integration Workflow

Use the durable workflow in [`docs/frontend-local-integration.md`](../docs/frontend-local-integration.md).

Current recommended first live slices:

1. `T110` insurance
2. `T111` notifications
3. `T109` back jobs
