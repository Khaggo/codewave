# Verification and Scale Evidence

## Backend Targeted Verification

Command:

```powershell
npm test -- job-orders.service.spec.ts job-orders.integration.spec.ts quality-gates.service.spec.ts quality-gates.integration.spec.ts
```

Result:

- 4 suites passed.
- 40 tests passed.
- Runtime: about 77 seconds.

Coverage represented by these suites includes:

- Job Order creation and source validation;
- assignment validation and assignment repair;
- progress and evidence rules;
- finalization eligibility and adviser ownership;
- back-job behavior;
- payment behavior;
- workbench and booking handoff integration;
- duplicate/unauthorized handling;
- quality audit and discrepancy outcomes;
- QA blockers and verdicts;
- super-admin overrides;
- re-entry into QA;
- finalization after passed/overridden quality gate.

These tests do not cover the staff queue concurrency matrix described below.

## Staff Web Targeted Verification

Command:

```powershell
node --test qaAuditView.test.mjs jobOrderServiceWorkflowView.test.mjs jobOrderServiceProgressModel.test.mjs workspaceCopyCleanup.test.mjs
```

Result:

- 35 tests passed.
- No failures.

Limit:

Many of these tests exercise pure view helpers or inspect source structure/text. They do not mount the queue and QA workspace together with overlapping delayed requests. Therefore, the suite passes while the live stale-detail issue is reproducible.

## Playwright Inventory

Discovered scenarios include:

- authentication and role/access checks;
- Booking to Job Order to QA to Finalization to Payment;
- human QA Job Order Step 6 route;
- technician-profile checklist/evidence workflow;
- responsive staff workflows;
- retired technician access rejection.

`playwright test --list` found 10 tests. The list command exceeded the 30-second command window after printing the inventory, so this collection does not claim a completed Playwright run.

## Mobile Verification

### Unit/source tests

- 73 tests passed.
- Node emitted `MODULE_TYPELESS_PACKAGE_JSON` warnings for ES-module mobile client files.

### Android export

Command:

```powershell
npx expo export --platform android --output-dir .runtime/detailed-context-export
```

Result:

- Passed.
- 1,063 modules bundled.
- Android bundle: approximately 3.74 MB.
- 36 assets emitted.
- Output written to an ignored runtime directory.

### Expo Doctor

Status: not completed.

- Initial execution failed due to sandbox/network cache access.
- An escalated run was not approved by the execution policy.
- Offline execution failed because the package was not cached.

Do not treat Expo Doctor as passing until it is run in an environment with registry access.

## Live Browser Verification

Verified:

- staff login;
- Job Orders board;
- selected Job Order claim;
- focused Job Order workspace;
- global Job Order badge and resume action;
- simultaneous one Job Order claim and one QA claim for the same adviser;
- QA next-work dispatch;
- QA Pass mutation;
- queue count decrement;
- automatic next QA claim;
- claim release and pause cleanup.

Reproduced:

- stale QA detail after Pass and automatic next dispatch.

The browser console had no warnings/errors after the flow. The defect is application state correctness rather than a visible JavaScript exception.

## Missing Critical Test Matrix

### Queue and claim integration

Add database-backed tests for:

1. Three staff dispatch concurrently and receive three unique entities.
2. Three staff claim the same selected entity and exactly one succeeds.
3. One user attempts two active claims in the same queue.
4. One user holds one active claim in each of the two queues.
5. Heartbeat extends only the matching active claim.
6. Expired claim becomes eligible for another worker.
7. Released claim becomes eligible immediately.
8. Paused session does not receive auto-dispatch.
9. Completion auto-dispatches the next eligible entity.
10. Admin reassignment requires role and reason and writes audit history.
11. Missing, wrong, expired, and released claim headers reject protected mutations.

### QA frontend behavior

Mount `QAAuditWorkspace` with a controllable fake client:

1. Load record A.
2. Submit Pass for A.
3. Dispatch record B.
4. Keep A's GET pending.
5. Resolve B, then resolve A.
6. Assert only B can render and submit.

Repeat with:

- A resolves before B;
- verdict fails;
- next dispatch fails;
- claim expires;
- record B is released while loading;
- rapid manual row selection.

### Finalization failure injection

Inject failures at:

- invoice insertion;
- Job Order status update;
- event/outbox persistence;
- PDF generation;
- notification/email;
- payment-provider reconciliation.

Assert durable state is either fully committed or safely retryable.

## Local Synthetic Queue Scale

These values describe seeded local data only.

| Metric | Observed |
| --- | ---: |
| Active Job Order summaries | 40 |
| History Job Order summaries | 37 |
| Job Order queue | 4 total, 4 unassigned, 1 overdue |
| QA queue after one test Pass | 17 total, 17 unassigned, 8 overdue |
| Oldest waiting fixtures | about 65 days |
| Technician profiles | 2 |
| Recently present adviser sessions | 1 |

### Sample service/evidence shape

Sample: 25 active Job Orders.

| Metric | Average | Maximum |
| --- | ---: | ---: |
| Service items | 1.00 | 1 |
| Photos | 1.24 | 2 |
| Progress entries | 1.48 | 3 |

This fixture set is too small and uniform to estimate production rendering cost for large, multi-service work.

### Seeded lifecycle timing

For 25 historical synthetic records:

- average overall elapsed time was about 0.02 hours;
- average post-audit-to-verdict QA time was about 0.59 minutes.

These are test-fixture timings and must not be used for staffing, capacity, or SLA planning.

## Local Loopback Response Timings

Five requests per surface:

| Surface | p50 | Average | Maximum |
| --- | ---: | ---: | ---: |
| Job Order queue API | 20.6 ms | 23.8 ms | 36.3 ms |
| QA queue API | 30.8 ms | 30.2 ms | 32.0 ms |
| Active workbench summaries | 76.8 ms | 73.7 ms | 87.8 ms |
| Job Orders page HTML | 370.6 ms | 346.1 ms | 397.3 ms |

These are localhost development timings. They exclude production network distance, database contention, cold starts, asset caching, user volume, and client hydration cost.

## Production Data Still Required

No trustworthy production measurements were available for:

- active Job Orders per day;
- QA submissions per day;
- peak queue depth;
- peak concurrent advisers/admins;
- adviser and technician-profile counts;
- average services/photos/progress logs per Job Order;
- claim conflicts and expiry rate;
- average Job Order active-work time;
- average QA decision time;
- blocked/rework rate;
- browser route loading percentiles;
- backend endpoint percentiles and error rate;
- database size and slow-query inventory;
- mobile crash-free sessions and network-error rate.

## Telemetry to Add Before Capacity Decisions

### Queue events

- claim attempted/succeeded/conflicted;
- dispatch latency;
- heartbeat accepted/rejected;
- lease expired;
- release reason;
- reassignment reason;
- time from eligible to claimed;
- time in active claim;
- auto-dispatch result.

### Workflow events

- handoff created/existing;
- stage entered/completed;
- blocker applied/cleared;
- sent to QA;
- QA passed/blocked/overridden;
- correction returned;
- finalized;
- invoice artifact ready/failed;
- payment completed/failed.

### Frontend measurements

- route navigation to usable;
- queue request and render duration;
- workspace request and render duration;
- stale-response discard count;
- mutation error by code;
- unsaved-draft abandonment;
- client build/version and correlation ID.

### Privacy

Use IDs/references only where operationally necessary. Avoid logging notes, customer names, email addresses, plate numbers, photo URLs, auth headers, tokens, or payment payloads.

## Acceptance Baseline

Before broad visual restructuring:

- targeted backend suites remain green;
- a new queue concurrency suite is green;
- a mounted QA race regression test is green;
- the live QA flow advances detail and queue together;
- all claim-protected mutations fail closed;
- finalization failure injection proves atomic or idempotent recovery;
- 500 seeded queue records still render only one bounded page;
- desktop, tablet, and mobile screenshots show no sticky control covering the work area.
