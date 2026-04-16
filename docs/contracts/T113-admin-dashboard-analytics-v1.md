# T113 Admin Dashboard Analytics V1

## Slice ID

`T113`

## Source Of Truth

- `docs/architecture/domains/main-service/analytics.md`
- `docs/architecture/tasks/01-main-service/T113-admin-dashboard-analytics-v1.md`
- live controller when implemented: `backend/apps/main-service/src/modules/analytics/controllers/analytics.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/analytics/dashboard` | `live` | Swagger/controller |
| `GET /api/analytics/operations` | `live` | Swagger/controller |
| `GET /api/analytics/back-jobs` | `live` | Swagger/controller |
| `GET /api/analytics/loyalty` | `live` | Swagger/controller |
| `GET /api/analytics/invoice-aging` | `live` | Swagger/controller |

## Internal Contract Status

| Contract | Status | Source |
| --- | --- | --- |
| `refreshAnalyticsSnapshot` | `live` | main-service analytics service |
| `analytics_snapshots` rebuildable read model | `live` | main-service analytics repository |
| `analytics_refresh_jobs` audit trail | `live` | main-service analytics repository |

## Frontend Contract Files

- `frontend/src/lib/api/generated/analytics/requests.ts`
- `frontend/src/lib/api/generated/analytics/responses.ts`
- `frontend/src/lib/api/generated/analytics/errors.ts`
- `frontend/src/mocks/analytics/mocks.ts`

## Frontend States To Cover

- admin dashboard overview with bookings, service-invoice, insurance, and back-job cards
- operations view with service demand, peak-hour reporting, and service-adviser workload
- back-job trend view with repeat original job-order sources and severity counts
- loyalty usage view with account totals, transaction mix, and top reward redemption usage
- invoice-aging reminder view derived from reminder rules, including overdue bucket breakdowns
- forbidden state for technician/customer access to admin analytics routes

## Notes

- `T113` keeps analytics derived and rebuildable: the live endpoints read analytics snapshots, not raw transactional module tables.
- V1 sales signals are intentionally invoice-count oriented because service-side invoice-ready records do not yet carry settlement amounts.
- Invoice-aging analytics are based on `notification` reminder rules in `main-service`, so the dashboard stays consistent with the current cross-service reminder integration without pretending to own payment settlement truth.
- Each analytics refresh records an audit-friendly refresh-job row plus per-snapshot source-count metadata so KPIs can be traced back to source-domain records.
