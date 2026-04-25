# Job Order QA Release Runtime Regression

## Task ID

`T532`

## Title

Prove and harden the live job-order ready-for-QA, QA gate, finalization, and invoice-payment chain.

## Type

`quality`

## Status

`done`

## Priority

`high`

## Owner Role

`test-worker`

## Source of Truth

- `../../domains/main-service/job-orders.md`
- `../../domains/main-service/quality-gates.md`
- `../../api-strategy.md`
- `../05-client-integration/T517-job-order-progress-photos-and-finalization-web-flow.md`
- `../05-client-integration/T518-quality-gates-review-release-and-override-web-flow.md`

## Depends On

- `T517`
- `T518`

## Goal

Confirm the technician workflow and QA release chain works in the live runtime, not only in isolated specs. The previous report verification found `PATCH /api/job-orders/:id/status` returning `500` on `ready_for_qa` while state persisted, followed by a QA gate staying `pending` and service-invoice finalization remaining blocked.

## Deliverables

- live runtime smoke script or documented manual smoke path for job order handoff
- fix for any remaining `ready_for_qa` runtime exception
- verification that QA gate processing reaches `passed`, `blocked`, or an auditable override state
- verification that finalization and service invoice payment work after QA allows release
- notes added to the progress-report verification record or task queue outcome

## Completion Notes

- Added `backend/scripts/smoke-job-order-qa-release.ts` and `npm run smoke:job-order-qa` for repeatable live runtime validation.
- Hardened quality-gate enqueue failure handling so `ready_for_qa` does not bubble a queue failure as a 500 after status persistence.
- Queue enqueue and worker failures now become blocked QA gates with failed audit metadata and explicit foundation findings.
- Confirmed the BullMQ job id is sanitized as `quality-gate__<job-order-id>` before queue submission.
- Live smoke passed against `http://127.0.0.1:3000/api` with QA `passed`, job order `finalized`, and invoice `paid`.

## Implementation Notes

- keep the booking truth separate from job-order truth; job order handoff should not rewrite booking state except through documented booking operations
- use `port-aware-dev-runtime` before starting backend, web, Expo, or worker processes
- do not start duplicate Node runtimes; reuse active healthy listeners or stop only the exact stale PID
- include the shared queue-job-id hardening in the investigation because BullMQ rejects custom ids containing `:`

## Acceptance Checks

- `PATCH /api/job-orders/:id/status` returns `200` with `status = ready_for_qa`
- `GET /api/job-orders/:jobOrderId/qa` returns a non-pending terminal QA state or a documented override path
- `POST /api/job-orders/:id/finalize` succeeds after QA allows release
- `POST /api/job-orders/:id/invoice/payments` records a paid service invoice
- no duplicate backend, web, Expo, or worker Node processes are created during validation

## Validation Evidence

- `npm test -- quality-gates.service.spec.ts job-orders.integration.spec.ts quality-gates.integration.spec.ts`
- `node_modules\.bin\tsc.cmd -p tsconfig.json --noEmit`
- `npm run swagger:up`
- `npm run smoke:job-order-qa`
- `npm run swagger:stop`
- smoke result: booking `487b0a28-98a1-43ef-89c0-06d374cc8937`, job order `4b33dd7f-5e28-4cbe-966f-a8da8bc82432`, QA `passed`, invoice `paid`

## Out of Scope

- redesigning the job-order workbench UI
- changing booking create/reschedule rules
- replacing the AI worker architecture
