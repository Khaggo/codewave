# T119 Quality Gate Manual Override

## Slice ID

`T119`

## Source Of Truth

- `docs/architecture/domains/main-service/quality-gates.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/tasks/01-main-service/T119-quality-gate-manual-override.md`
- live controller when implemented: `backend/apps/main-service/src/modules/quality-gates/controllers/quality-gates.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/job-orders/:jobOrderId/qa` | `live` | Swagger/controller |
| `PATCH /api/job-orders/:jobOrderId/qa/override` | `live` | Swagger/controller |
| internal `runQualityGateAudit` | `live` | service |

## Frontend Contract Files

- `frontend/src/lib/api/generated/quality-gates/requests.ts`
- `frontend/src/lib/api/generated/quality-gates/responses.ts`
- `frontend/src/lib/api/generated/quality-gates/errors.ts`
- `frontend/src/mocks/quality-gates/mocks.ts`

## Frontend States To Cover

- blocked QA with override action hidden from non-super-admin users
- blocked QA with super-admin override form requiring an explicit reason
- overridden QA showing the original findings plus the latest override audit entry
- finalize-after-override happy path where invoice generation becomes available again

## Notes

- `T119` makes manual override live, but only for `super_admin`.
- Overrides do not erase the findings that originally blocked QA. They add an override audit row and move the QA status to `overridden`.
- Release unblocking happens through the existing finalization flow because `overridden` is now a release-allowed QA state.
- Silent, implicit, or role-bypassed overrides remain out of scope.
