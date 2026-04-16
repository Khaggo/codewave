# T405 RBAC Regression Matrix

## Slice ID

`T405`

## Source Of Truth

- `docs/architecture/rbac-policy.md`
- `docs/architecture/domains/main-service/auth.md`
- `docs/architecture/domains/main-service/users.md`
- `docs/architecture/tasks/04-quality-and-ops/T405-rbac-regression-matrix.md`
- regression suite:
  - `backend/apps/main-service/test/rbac-regression.integration.spec.ts`

## Covered Protected Routes

| Route | Customer | Technician | Service Adviser | Super Admin | Notes |
| --- | --- | --- | --- | --- | --- |
| `GET /api/auth/me` | `allow` | `allow` | `allow` | `allow` | baseline authenticated identity |
| `GET /api/bookings/daily-schedule` | `deny` | `deny` | `allow` | `allow` | schedule visibility stays staff-only |
| `GET /api/chatbot/intents` | `deny` | `deny` | `allow` | `allow` | intent review stays adviser/admin only |
| `POST /api/admin/staff-accounts` | `deny` | `deny` | `deny` | `allow` | staff provisioning path |
| `PATCH /api/admin/staff-accounts/:id/status` | `deny` | `deny` | `deny` | `allow` | staff activation/deactivation path |
| `GET /api/insurance/inquiries/:id` | `own only` | `deny` | `allow` | `allow` | customer ownership enforced |
| `GET /api/users/:id/notification-preferences` | `own only` | `deny` | `allow` | `allow` | customer ownership enforced |
| `GET /api/job-orders/:id` | `deny` | `assigned only` | `allow` | `allow` | assignment boundary stays intact |
| `POST /api/job-orders/:id/progress` | `deny` | `assigned only` | `deny` | `deny` | service-level rule is stricter than controller role list |
| `GET /api/job-orders/:id/qa` | `deny` | `assigned only` | `allow` | `allow` | QA review visibility |
| `PATCH /api/job-orders/:id/qa/override` | `deny` | `deny` | `deny` | `allow` | override stays super-admin only |

## Test Files

- `backend/apps/main-service/test/rbac-regression.integration.spec.ts`

## Frontend Contract Files

This slice does not add or change frontend DTO contract files.

It protects backend access behavior that frontend role-aware screens depend on.

## Notes

- The matrix intentionally mixes guard-level role checks and service-level ownership or assignment checks so regressions fail even when a controller decorator remains unchanged.
- `POST /api/job-orders/:id/progress` is an important closed-path check: the controller admits `service_adviser` and `super_admin`, but the service still denies them because only the assigned technician may append progress.
- The suite includes both privileged write paths called out in the task: staff provisioning and QA override.
