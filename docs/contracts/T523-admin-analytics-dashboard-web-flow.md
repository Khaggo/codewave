# T523 Admin Analytics Dashboard Web Flow

## Slice ID

`T523`

## Source Of Truth

- `docs/architecture/domains/main-service/analytics.md`
- `docs/architecture/tasks/05-client-integration/T523-admin-analytics-dashboard-web-flow.md`
- `docs/contracts/T113-admin-dashboard-analytics-v1.md`
- live controller: `backend/apps/main-service/src/modules/analytics/controllers/analytics.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/analytics/dashboard` | `live` | Swagger/controller |
| `GET /api/analytics/operations` | `live` | Swagger/controller |
| `GET /api/analytics/back-jobs` | `live` | Swagger/controller |
| `GET /api/analytics/loyalty` | `live` | Swagger/controller |
| `GET /api/analytics/invoice-aging` | `live` | Swagger/controller |
| `GET /api/analytics/audit-trail` | `live` | Swagger/controller |

## Web Surface

- protected hub route: `frontend/src/app/admin/summaries/page.js`
- primary workspace: `frontend/src/screens/AdminAnalyticsWorkspace.js`
- preserved secondary tab: `frontend/src/screens/SummaryVerificationWorkspace.js`
- route label in staff portal: `Analytics & Summaries`

## Frontend Contract Files

- `frontend/src/lib/api/generated/analytics/requests.ts`
- `frontend/src/lib/api/generated/analytics/responses.ts`
- `frontend/src/lib/api/generated/analytics/errors.ts`
- `frontend/src/lib/api/generated/analytics/staff-web-dashboard.ts`
- `frontend/src/lib/analyticsAdminClient.js`
- `frontend/src/mocks/analytics/mocks.ts`

## Frontend States To Cover

- full live analytics load across overview, operations, back-jobs, loyalty, invoice aging, and audit trail
- partial-load state when one or more analytics sections fail while others remain usable
- empty snapshot state when analytics refresh succeeds but returns zeroed or empty read-model sections
- forbidden state for non-adviser and non-admin roles
- loading and refreshing states with visible read-model freshness labels
- preserved summary-review access from the same protected route without replacing analytics with transactional edits

## Derived-State Guidance

- analytics must remain read-only and rebuildable
- service invoice counts are invoice-ready signals, not settled-payment totals
- invoice-aging values are derived from reminder-policy state, not direct payment truth
- audit trail visibility is observational only and must not expose transactional edit actions
- freshness labels should call out that snapshot sections can lag behind source-domain writes

## Known API Gaps

- date-range filters are not yet live-backed and should stay documented as future work
- CSV or PDF exports are not yet live-backed and should not be invented in the client

## Notes

- `/admin/summaries` now acts as a shared adviser/admin hub for analytics plus the existing summary-review surface, which avoids breaking existing navigation while satisfying the analytics task.
- The client loads all analytics routes in parallel and tolerates partial failure so one slow section does not blank the entire page.
- Summary review stays lazy-loaded so the analytics route does not pay the full summary-workspace boot cost unless the reviewer actually opens that tab.
