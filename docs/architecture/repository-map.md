# Repository Map

## Agent Summary

This map identifies code ownership boundaries, runtime ports, contract authority, and the
verification route for changes that cross the backend, staff web, and customer mobile surfaces.

## Runtime Boundaries

| Directory | Responsibility | Runtime |
| --- | --- | --- |
| `backend/apps/main-service` | identity, bookings, workshop, QA, customer records, bounded Accessories domain | NestJS `3000` |
| `frontend` | authenticated staff and administrator web | Next.js `3002` |
| `mobile` | customer registration, booking, garage, insurance, rewards, and profile | Expo `8081` |
| `qa/playwright` | cross-surface acceptance flows | Playwright |

## Contract Authority

Implemented HTTP behavior is defined by backend controllers, DTOs, and live Swagger. Canonical
business rules live under `docs/architecture/`. Generated transport contracts are derived
artifacts and must not introduce business behavior.

## Change Routing

- Backend-only behavior: focused Jest tests, TypeScript build, and relevant integration tests.
- API contract: backend tests, Swagger check, deterministic contract check, and affected clients.
- Staff web: Node/Vitest tests, Next build, role/access review, and Playwright where applicable.
- Mobile: Node/Jest Expo tests, Expo Doctor, Android export, and device smoke flow.
- Database: generated migration, migration consistency check, disposable database test, and
  rollback notes.

## Safety Boundaries

Database repair and seed commands default to dry-run. Production execution requires explicit
authorization and an audit reason. Generated output, caches, runtime logs, and local screenshots
are excluded from dependency graphs and source control.

The retired ecommerce service and port `3001` remain prohibited. New accessory commerce is
isolated under `backend/apps/main-service/src/modules/accessories`, customer mobile
`screens/accessories` and `lib/accessories`, staff `/admin/accessories` routes, and
`/api/accessories` contracts. These paths form the `02-accessories-store` worktree partition.

## Performance Budgets

- `npm run performance:web` checks the built Job Orders board, focused workspace, and QA Audit
  route against a committed 5% raw JavaScript growth budget.
- The route report is written to `frontend/.next/web-bundle-report.json` and uploaded by the
  staff web CI job.
- The current mobile Android runtime-bytecode baseline is 2.93 MiB. The export emits its source
  map separately so debug metadata is not counted as shipped runtime code; changes above 5% must
  still be recorded and reviewed.
