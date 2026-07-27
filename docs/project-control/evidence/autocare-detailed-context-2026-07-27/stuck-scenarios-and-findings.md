# Stuck Scenarios and Findings

## Scenario Handoff Records

```text
Scenario: QA Pass advances the queue but leaves the previous passed record in the detail pane
User role: Service adviser
Starting page: /admin/qa-audit
Actions performed: Start accepting work, take the next QA record, enter a review note, record Pass, wait for automatic next dispatch
Expected result: The completed record leaves the queue and the newly claimed pending record loads into the detail pane with a reset verdict form
Actual result: The new row is marked Yours, but the detail pane retains the previous record's Passed verdict, note, timestamp, and Job Order link
How often it happens: Reproduced in the live local flow; deterministic automated frequency is not yet measured
Temporary workaround: Release/pause the claim and perform a full page refresh before reviewing another record; verify the queue reference matches the detail reference
Relevant error message: No console error; the defect is a mismatch between selected queue entity and rendered gate state
```

```text
Scenario: Claimed QA row's Open action appears not to load actionable work
User role: Service adviser
Starting page: /admin/qa-audit
Actions performed: Claim or receive QA work and select Open on the row
Expected result: The selected record loads into the review workspace
Actual result: User-reported historical state appeared unchanged or stale
How often it happens: Historical report; the exact old Open behavior was not reproduced after the queue UX changed to Take next/Resume/auto-open
Temporary workaround: Use the current Resume/Take next flow, then verify the detail reference before entering a verdict
Relevant error message: None shown
```

```text
Scenario: Starting or updating a Job Order service fails at the transport layer
User role: Service adviser
Starting page: /admin/job-orders/[id]
Actions performed: Open the focused Job Order workspace and start/update the service item
Expected result: Service progress is saved and the workspace updates
Actual result: A red Failed to fetch banner is shown while the workspace remains loaded
How often it happens: Historical user report; not reproduced against the current healthy local API/web runtime
Temporary workaround: Preserve the current screen, verify API availability, refresh once, and retry only after confirming the prior mutation did not commit
Relevant error message: Failed to fetch
```

## Live Reproduction: QA Queue Advances but Detail Remains on the Passed Record

Severity: P1 correctness

Status: reproducible on the local running application on 2026-07-27

### Preconditions

- Signed in as an active service adviser.
- QA queue session accepting work.
- At least two pending QA records.

### Steps

1. Open `/admin/qa-audit`.
2. Use `Take next`.
3. Confirm the claimed record is visible in both the queue and detail panel.
4. Enter a valid review note.
5. Record a Pass verdict.
6. Wait for claim completion and automatic next dispatch.

### Expected

- The completed record disappears from the pending queue.
- The next claimed row is marked `Yours`.
- The detail panel clears the old record and loads the new pending gate.
- The review form resets for the new record.

### Actual

- Queue count changed from 18 to 17.
- A different queue row, `BK-20260524-0003`, became `Yours`.
- The detail panel continued to show the prior record's:
  - `Allowed` precheck state;
  - `Passed` verdict;
  - old review timestamp;
  - old note;
  - old `Return to Job Order` destination.
- A direct backend read for the newly claimed Job Order returned `pending_review`, `pending`, and version 1.
- The screen remained stale after another short wait.

### Evidence

- Before verdict: `screenshots/qa-review-workspace.png`
- After verdict and next claim: `screenshots/qa-after-pass-verdict.png`

### Probable source-level cause

This is a likely request-order race across:

- `frontend/src/screens/QAAuditWorkspace.js`
- `frontend/src/components/StaffWorkQueue.jsx`
- `frontend/src/lib/qualityGateClient.js`

The parent completes the verdict, clears selection, and allows queue auto-dispatch. At the same time, queue refresh/open behavior can leave a quality-gate request for the previous record in flight. The new Job Order effect records the new auto-loaded ID, but `loadQualityGate` can return early while `qaLoadInFlightRef` is set. The prior request can then write the old passed gate into state, and no guaranteed retry loads the new gate.

This explanation is an inference from source and timing. A component-level deterministic race test should confirm the exact interleaving before the fix is merged.

### Required fix behavior

- Key detail state by Job Order ID.
- Abort or ignore responses whose request key no longer matches the selected/claimed record.
- Clear old gate, form, message, and link state synchronously when selection changes.
- Do not mark a record as auto-loaded until its request is accepted.
- Retry or queue the newest load when another load is active.
- Disable verdict actions until the rendered gate ID equals the selected queue entity ID.
- Add a mounted behavioral test that resolves old/new requests in reverse order.

## Historical Report: QA Open Button Did Not Appear to Act

Evidence: `screenshots/reported-qa-open-and-stale-queue.png`

The earlier screen showed an `Open` action on a claimed row while the queue and detail state did not visibly progress. The current UI uses `Take next`, `Resume`, and automatic opening of the active claim, and those actions worked during this verification.

Treat the original report as partly superseded by the newer queue UX. The underlying stale-detail problem remains and can still make an open/resume action look ineffective.

## Historical Report: Job Order Service Action Failed to Fetch

Evidence: `screenshots/reported-job-order-failed-to-fetch.png`

Observed historical UI:

- focused Job Order workspace loaded;
- service item was available;
- starting or updating service displayed `Failed to fetch`.

Current verification did not reproduce this network failure. The running API and staff web were healthy, and the current browser console contained no errors or warnings. Keep this evidence attached to future transport/error-handling work because the current message lacks:

- operation name;
- retry action;
- request correlation ID;
- offline/server distinction;
- recoverable draft state.

## Historical Report: Send to QA Control

Evidence: `screenshots/reported-send-to-qa-control.png`

The control correctly states that assignments, services, a saved update, and evidence are required. The button sends the record to QA and releases Job Order work. QA can then take time without preventing the adviser from claiming another Job Order.

The workflow confusion comes from weak visibility of the handoff and ownership transition. The workspace should explicitly confirm:

- `Sent to QA`;
- who owns the next stage;
- whether the adviser has any remaining action;
- a direct `Take next Job Order` action;
- where a blocked QA record will return.

## Reliability and Security Findings

### P1: Claim access can fail open

Affected code:

- `backend/apps/main-service/src/modules/staff-work-queues/repositories/staff-work-queues.repository.ts`
- `backend/apps/main-service/src/modules/staff-work-queues/guards/staff-work-claim.guard.ts`

Observed behavior:

- `assertClaimAccess` accepts an unclaimed mutation when both an active claim and claim header are absent.
- The guard permits access if its optionally injected queue service is unavailable.

Impact:

- A valid staff session can bypass workload ownership through a direct request.
- A module wiring regression silently disables claim enforcement.
- UI ownership labels are not a complete authorization boundary.

Required direction:

- Make queue-service injection mandatory.
- Require a valid active claim for claim-protected mutations.
- Define narrow explicit exceptions by endpoint rather than compatibility fallbacks.
- Add controller/integration tests for missing, wrong, expired, released, and conflicting claim IDs.

### P1: Reviewer verdict is not terminal and version matching is optional

Affected code:

- `backend/apps/main-service/src/modules/quality-gates/services/quality-gates.service.ts`
- `backend/apps/main-service/src/modules/quality-gates/repositories/quality-gates.repository.ts`
- `backend/apps/main-service/src/modules/quality-gates/controllers/quality-gates.controller.ts`

Observed behavior:

- `If-Match` is optional.
- Without an expected version, update conditions do not reject stale writes.
- A passed or blocked reviewer verdict can be overwritten through the normal verdict operation.

Impact:

- Lost updates between staff sessions.
- Previously released work can be silently re-decided.
- Audit interpretation becomes ambiguous.

Required direction:

- Require `If-Match` for verdict mutations.
- Reject normal verdict writes unless current state is pending.
- Model corrections as append-only audited events or a super-admin correction endpoint.
- Return the authoritative gate and next claim summary in one completion response.

### P1: Finalization can partially commit

Affected code:

- `backend/apps/main-service/src/modules/job-orders/repositories/job-orders.repository.ts`
- `backend/apps/main-service/src/modules/job-orders/services/job-orders.service.ts`

Observed behavior:

- Invoice record insertion and Job Order final-status update are separate operations.
- PDF generation and lifecycle/event side effects occur after persistence.
- A PDF failure can surface an API error even when state changes have already committed.

Impact:

- Invoice exists while Job Order state is inconsistent.
- Retry can encounter duplicate invoice constraints.
- Staff may retry an operation that already changed durable state.

Required direction:

- Wrap invoice creation and Job Order transition in one transaction.
- Persist artifact state separately (`pending`, `ready`, `failed`) and generate asynchronously or idempotently.
- Use an outbox for post-commit events.
- Return the durable finalization result even if a secondary artifact fails.

### P2: Offset cursor is unstable for a live queue

Affected code:

- `backend/apps/main-service/src/modules/staff-work-queues/dto/list-staff-work-queue.dto.ts`
- `backend/apps/main-service/src/modules/staff-work-queues/repositories/staff-work-queues.repository.ts`
- `frontend/src/components/StaffWorkQueue.jsx`

Observed behavior:

- UI fetches 25 records.
- Cursor decodes to an offset.
- Filter/sort contract remains narrower than the approved redesign.

Impact:

- Queue changes can cause duplicate or skipped rows between pages.
- Staff cannot efficiently isolate owner, stage, technician, priority, date, overdue, or blocker combinations.

Required direction:

- Keyset cursor based on stable sort tuple, such as priority/risk, waiting timestamp, and ID.
- Return next/previous cursor metadata.
- Add planned filters with indexed database predicates.
- Retain count queries independent of page materialization.

### P2: No focused three-worker queue tests

No dedicated suite was found for:

- three simultaneous claims against one queue;
- selected-record race;
- lease expiry and reclaim;
- heartbeat extension;
- pause/release/resume;
- super-admin reassign with reason;
- completion plus automatic next dispatch.

The database indexes are sound foundations, but their behavior must be proven in real concurrent transactions.

### P2: Role drift

Affected areas:

- generated Job Order web contracts and descriptions;
- mobile source-inspection tests;
- historical technician/head-technician workshop assumptions.

Canonical rule:

- staff web: service adviser and super admin;
- customer mobile: customer;
- technicians: non-login assignment profiles.

Generated artifacts and tests should fail when they reintroduce retired authenticated roles.

### P2: Audit history is fragmented

There is no unified append-only Job Order audit table. Relevant history is distributed among:

- progress logs;
- queue claim records;
- quality-gate state;
- quality-gate override records;
- invoice/payment timestamps;
- event bus publication;
- mutable Job Order version/timestamps.

This makes a complete operator timeline expensive to reconstruct and weakens incident review.

### P2: Oversized modules make race and lifecycle defects harder to isolate

The QA, Job Order, queue, and mobile dashboard files combine rendering, transport, derived state, mutation orchestration, and compatibility behavior. The approved modularization should proceed behind characterization tests.

## Runtime and Log Observations

### Current

- API health succeeded.
- Staff web returned HTTP 200.
- Browser console after the QA flow: no warnings or errors.
- Current frontend dev stderr log was empty.

### Historical local runtime log

An older `.runtime/staff-web.stderr.log` contained:

- a missing `.next` chunk module error for `/admin/invoices`;
- cross-origin development warnings;
- repeated Fast Refresh full reloads.

These entries were not reproduced in the current server. They likely represent stale Next build/runtime state and should not be presented as a current production incident.

## Error-Handling UX Requirements

For workflow mutations, replace generic `Failed to fetch` with:

- clear operation name;
- whether the draft is preserved;
- retry button where safe;
- conflict-specific action for claim/version errors;
- request correlation ID;
- current ownership and lease state;
- server-unavailable versus offline messaging;
- a refresh path that cannot submit the previous record's form to a new record.
