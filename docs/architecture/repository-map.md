# Repository Map

## Agent Summary

This map identifies code ownership boundaries, runtime ports, contract authority, and the
verification route for changes that cross the backend, staff web, and customer mobile surfaces.

## Runtime Boundaries

| Directory | Responsibility | Runtime |
| --- | --- | --- |
| `backend/apps/main-service` | identity, bookings, workshop, QA, customer records | NestJS `3000` |
| `backend/apps/ecommerce-service` | catalog and commerce operations | NestJS `3001` |
| `frontend` | authenticated staff and administrator web | Next.js `3002` |
| `mobile` | customer registration, booking, profile, and orders | Expo `8081` |
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

## Performance Budgets

- `npm run performance:web` checks the built Job Orders board, focused workspace, and QA Audit
  route against a committed 5% raw JavaScript growth budget.
- The route report is written to `frontend/.next/web-bundle-report.json` and uploaded by the
  staff web CI job.
- The current mobile Android export baseline is 3.74 MiB. Expo upgrades and dashboard extractions
  must record and review changes above 5%.
