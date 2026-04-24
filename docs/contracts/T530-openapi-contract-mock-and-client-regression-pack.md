# T530 OpenAPI Contract Mock And Client Regression Pack

## Slice ID

`T530`

## Source Of Truth

- `docs/architecture/api-strategy.md`
- `docs/architecture/frontend-backend-sync.md`
- `docs/architecture/dto-policy.md`
- `docs/architecture/tasks/05-client-integration/T530-openapi-contract-mock-and-client-regression-pack.md`
- `docs/team-flow-engineering-source-of-truth.md`

## Runtime Observation

- on `2026-04-22`, live Swagger at `http://127.0.0.1:3000/docs-json` was unreachable because the backend was not running
- this pack therefore uses checked-in typed route contracts with `source: 'swagger'` as the current machine-readable OpenAPI baseline instead of pretending a live fetch succeeded
- when the backend is running again, re-run the T530 check pass against live Swagger before treating new route work as fully revalidated

## Regression Artifacts

- typed regression registry:
  - `frontend/src/lib/api/generated/regression/client-regression-pack.ts`
- mock coverage registry:
  - `frontend/src/mocks/regression/mocks.ts`

## Route Drift Matrix

The full machine-readable per-route matrix lives in `frontend/src/lib/api/generated/regression/client-regression-pack.ts`.
Use that file when you need route-by-route rows. The summary below shows the highest-signal live-versus-planned boundaries.

| Area | Task Scope | Live Route Anchors | Planned Or Gap Anchors |
| --- | --- | --- | --- |
| bookings | `T501-T506` | `frontend/src/lib/api/generated/bookings/requests.ts` | none |
| auth and surface guardrails | `T507`, `T508`, `T509`, `T529` | `frontend/src/lib/api/generated/auth/requests.ts`, `frontend/src/lib/api/generated/auth/staff-web-session.ts` | no planned auth routes in this slice; restore drift is tracked as a client guardrail issue |
| customer profile and garage | `T510`, `T511` | `frontend/src/lib/api/generated/users/requests.ts`, `frontend/src/lib/api/generated/vehicles/requests.ts` | no planned routes in the current client pack |
| inspections and lifecycle | `T512`, `T513` | `frontend/src/lib/api/generated/inspections/requests.ts`, `frontend/src/lib/api/generated/vehicle-lifecycle/requests.ts` | no planned routes in the current client pack |
| insurance | `T514`, `T515` | `frontend/src/lib/api/generated/insurance/requests.ts` | `GET /api/insurance/review-queue` remains task-planned only through `staff-web-insurance.ts` |
| notifications | `T520` | `frontend/src/lib/api/generated/notifications/requests.ts` | read and unread persistence endpoints remain future work and must stay local-session-only in clients |
| job orders, QA, back-jobs | `T517`, `T518`, `T519` | `frontend/src/lib/api/generated/job-orders/requests.ts`, `quality-gates/requests.ts`, `back-jobs/requests.ts` | no new planned routes in the completed client pack |
| analytics | `T523` | `frontend/src/lib/api/generated/analytics/requests.ts` | date-range filters and export routes remain future work |
| catalog and inventory | `T524`, `T527` | `frontend/src/lib/api/generated/catalog/requests.ts` | `/inventory/products/:productId` and `/inventory/adjustments` remain task-planned only |
| checkout and order tracking | `T525`, `T526` | `frontend/src/lib/api/generated/cart/requests.ts`, `orders/requests.ts`, `invoice-payments/requests.ts` | no new planned routes in the completed client pack |
| derived sync honesty | `T528` | notification, loyalty, order, and invoice route contracts stay live | no new planned routes; drift is consistency-model wording, not missing endpoints |

## Mock Coverage Checklist

The machine-readable coverage matrix lives in `frontend/src/mocks/regression/mocks.ts`.
It tracks which completed client slices cover `happy`, `empty`, `error`, `unauthorized`, `forbidden`, and `conflict` families, plus which families are intentionally not applicable.

| Area | Primary Mock Files | Coverage Notes |
| --- | --- | --- |
| bookings | `frontend/src/mocks/bookings/mocks.ts` | strongest coverage set; includes happy, empty, auth, forbidden, and conflict states |
| auth and guardrails | `frontend/src/mocks/auth/mocks.ts` | covers activation, blocked session, downgraded session, unauthorized customer-mobile access, and forbidden web route states |
| users, vehicles, inspections, insurance | `users`, `vehicles`, `inspections`, `insurance` mock folders | cover the main CRUD happy-paths plus ownership, forbidden, validation, and conflict cases |
| analytics, catalog, cart, orders, inventory, commerce-sync | matching mock folders under `frontend/src/mocks/` | cover the slice-specific empty, runtime-failure, and state-honesty cases needed for staff/admin web and customer mobile flows |
| job orders, quality gates, back-jobs, chatbot | matching mock folders under `frontend/src/mocks/` | cover workbench conflicts, QA block states, rework lineage, and escalation flows without inventing unsupported behaviors |

## Acceptance Notes

- T530 does not add new runtime business behavior; it adds a shared regression layer over the completed client queue
- the regression registry exists to stop silent drift between:
  - task truth
  - contract-pack truth
  - typed route contracts
  - mock-state coverage
- if a future slice changes a live route, the typed route contract should be updated first, then T530 should be refreshed as the final audit layer
