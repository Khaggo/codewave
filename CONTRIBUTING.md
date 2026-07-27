# Contributing

## Working Agreement

1. Preserve unrelated worktree changes.
2. Keep behavior changes, formatting, generated contracts, and dependency upgrades in separate
   commits.
3. Treat `docs/architecture/` and live Swagger as the sources of truth.
4. Add focused tests for changed behavior before broad refactoring.
5. Do not use `npm audit fix --force`, production `db:push`, or unguarded data repair scripts.

## Branches and Reviews

Use a short-lived `codex/` or feature branch. Pull requests must explain behavior, data or
contract impact, tests run, migration requirements, and rollback steps. CODEOWNERS review and
required CI checks must pass before merge.

## Repository Boundaries

- Staff and administrator web behavior belongs in `frontend/`.
- Customer behavior belongs in `mobile/`.
- Public transport contracts originate in backend Swagger.
- Framework-independent shared code belongs in `packages/`.
- React, React Native, Next, Nest, and database implementations stay inside their applications.

## Verification

Run the smallest relevant tests first, then:

```powershell
npm run check
```

For backend contract changes, also compare Swagger and generated clients. For browser-visible
changes, include desktop and mobile screenshots plus console/network inspection.
