# AUTOCARE Current State

Last updated: 2026-08-05

## Project Goal

AUTOCARE is the service-management and customer-engagement system for Cruisers Crib Auto Care Center. It coordinates customer booking, vehicle records, workshop execution, quality review, invoicing, insurance assistance, notifications, service rewards, and a bounded vehicle-accessories pickup store.

## Product Surfaces

- `mobile/`: customer application for Home, Garage, Booking, Insurance, notifications, profile, and service rewards.
- `frontend/`: staff workspace for service advisers and super admins.
- `backend/apps/main-service/`: authoritative NestJS API for all active domains.
- `packages/contracts/`: generated OpenAPI transport contract.
- `packages/domain-utils/`: framework-independent shared utilities.

## Role Boundary

- Customers authenticate only through the mobile application.
- Service advisers and super admins authenticate through staff web.
- Technicians are non-login operational profiles assigned to workshop service items.
- Staff mutations are authorized by role and, where required, an active matching work claim.

## Accessories Rollout

- The old generic ecommerce service remains retired and port `3001` must not return.
- The approved Accessories domain lives inside `main-service` and uses only `/api/accessories` and `/api/admin/accessories` routes.
- Customer access is mobile-only through More and a Home shortcut; the five-tab shell does not change.
- The feature defaults to `ACCESSORY_COMMERCE_MODE=off` and rolls out through `staff_preview`, `catalog`, then `ordering`.
- Catalog and fulfillment reads, reconciliation, refunds, and order history remain available when new ordering is disabled.
- The first release is single-shop pickup with PayMongo and pay-at-shop; no delivery or installation workflow is included.

## Core Workflow

The primary service lifecycle is:

`Booking or Intake -> Job Order -> Assignments -> Progress and Evidence -> QA -> Finalization -> Payment`

- Booking and Intake handoff is idempotent.
- Job Order and QA queues use explicit ownership, leases, heartbeats, expiry, release, and conflict handling.
- QA Block returns work to Job Orders with a correction reason.
- QA Pass exposes finalization work through the Job Order queue.
- Finalization creates the service invoice record and preserves payment history.
- Back-job rework follows the same workspace with source lineage and audit history.

## Data and Contracts

- PostgreSQL is the system of record and Drizzle owns the schema.
- `backend/drizzle/0000_service_baseline.sql` is the approved service-only baseline. Accessories must be added by the forward `0001_accessories_store` migration and must never rewrite `0000`.
- Production uses committed migrations. Schema push is limited to disposable local development.
- Migration smoke verification resolves the latest snapshot from the Drizzle journal, compares every public table and column, and rejects missing or extra legacy objects.
- `packages/contracts/openapi/main-service.json` is generated deterministically from backend DTOs and controllers.
- Customer API projections must not expose staff-only notes, actor identifiers, or internal deduplication data.

## Runtime Map

| Runtime | Port | Managed command |
| --- | ---: | --- |
| Main API | `3000` | `npm run dev:main` |
| Staff web | `3002` | `npm run dev:web` |
| Storybook | `6006` | `npm run dev:storybook` |
| Expo LAN | `8081` | `npm run dev:mobile` |
| Expo web | `8090` | `npm run dev:mobile:web` |

Managed commands are detached and bounded. Use `npm run runtime:status`, `runtime:logs`, `runtime:restart`, and `runtime:stop`; do not attach long-lived development servers to automated command sessions.

## Repository Controls

- One root npm workspace and lockfile cover backend, staff web, customer mobile, contracts, and domain utilities.
- Canonical checks are `check`, `test`, `build`, `lint`, `audit`, `contracts:check`, `db:check`, and `migration:smoke`.
- GitHub Actions provide policy, backend, web, mobile, contract, migration, security, and optional Playwright jobs.
- Maintenance scripts default to dry-run and require explicit execution and production acknowledgement.
- Agent orchestration is opt-in and never starts background work automatically.

## Verification Baseline

Current panel-remediation verification (2026-08-05) reports web `230/230`, mobile `213/213`,
focused backend AI/reference/loyalty `21/21`, migration smoke passed, contract drift passed,
backend typecheck passed, and repository policy checks passed. The current evidence is focused
implementation evidence; live Playwright, production performance, and respondent survey results
remain pending.

The current scope-aligned baseline requires:

- backend typecheck, targeted tests, full serial tests, and production build;
- staff-web Node tests and Next production build;
- mobile Node tests and Android Expo export;
- runtime-manager tests;
- OpenAPI contract drift, architecture documentation, agent manifest, and migration consistency checks;
- zero stale route, import, environment, generated-contract, or runtime references outside active service workflows.

The ISO/IEC 25010 instrument and survey boundary are recorded in
[`ISO_25010_INSTRUMENT.md`](./ISO_25010_INSTRUMENT.md).

Exact results are recorded in [`QA_LEDGER.md`](./QA_LEDGER.md).

## Known Repository Findings

- The worktree contains a large set of changes from multiple completed workstreams and must be split into reviewed subsystem commits before merge. Linked worktrees and `main` contain overlapping superseded technician/shop work, so integration requires scope-aware review rather than a blind merge.
- The reviewed integration order, overlap evidence, and retired-path protections are recorded in [`WORKTREE_INTEGRATION_GUIDE.md`](./WORKTREE_INTEGRATION_GUIDE.md).
- The file-growth ratchet passes after extracting notification transport, insurance document modeling, Garage page modeling, and runtime-manager output concerns.
- Production metrics remain unknown until production telemetry exists.

## Canonical References

- [`../../context.md`](../../context.md)
- [`../architecture/README.md`](../architecture/README.md)
- [`../architecture/system-architecture.md`](../architecture/system-architecture.md)
- [`../architecture/tasks/README.md`](../architecture/tasks/README.md)
- [`../contracts/README.md`](../contracts/README.md)
- [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md)
- [`WORKTREE_INTEGRATION_GUIDE.md`](./WORKTREE_INTEGRATION_GUIDE.md)
