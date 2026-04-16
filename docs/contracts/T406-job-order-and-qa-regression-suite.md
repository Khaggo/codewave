# T406 Job Order And QA Regression Suite

## Slice ID

`T406`

## Source Of Truth

- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/domains/main-service/quality-gates.md`
- `docs/architecture/tasks/04-quality-and-ops/T406-job-order-and-qa-regression-suite.md`
- regression suites:
  - `backend/apps/main-service/test/job-orders.service.spec.ts`
  - `backend/apps/main-service/test/quality-gates.service.spec.ts`
  - `backend/apps/main-service/test/quality-gates.integration.spec.ts`

## Regression Coverage Added

| Area | Coverage |
| --- | --- |
| release gate pending | `assertReleaseAllowed` fails closed while QA is still `pending` |
| finalize ownership | non-owning service advisers cannot finalize another adviser’s job order |
| super-admin release path | super admin can finalize a release-ready job order after QA approval |
| override reuse | a blocked QA gate cannot be overridden twice |
| override plus finalize | overridden QA still does not bypass adviser ownership rules |

## Test Files

- `backend/apps/main-service/test/job-orders.service.spec.ts`
- `backend/apps/main-service/test/quality-gates.service.spec.ts`
- `backend/apps/main-service/test/quality-gates.integration.spec.ts`

## Frontend Contract Files

This slice does not change frontend DTO contract files.

It protects workflow guarantees that the frontend can rely on:

- release actions stay blocked until QA is truly releasable
- override actions remain super-admin controlled
- finalize actions stay owned by the responsible adviser or super admin

## Notes

- The pending-gate service test covers the state that is hardest to hold through full integration because the in-memory test queue processes AI worker jobs immediately.
- The integration coverage deliberately exercises a blocked Gate 2 case, one successful override, one rejected repeat override, and adviser-ownership checks on finalize.
- This task complements `T405` instead of duplicating it: `T405` locks route permissions broadly, while `T406` locks the workshop release flow specifically.
