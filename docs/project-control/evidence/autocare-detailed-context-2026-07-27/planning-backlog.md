# Prioritized Implementation Backlog

The order below fixes correctness and enforcement before additional visual polish.

## Release 1: Protect the Active Workflow

### QA-001: Make QA detail selection race-safe

Priority: P0

Owners: staff web

Implementation:

- Extract a QA detail controller/hook from `QAAuditWorkspace.js`.
- Key loaded data, form state, and mutations by Job Order ID.
- Use `AbortController` or monotonic request tokens.
- Ignore every response whose key does not match the latest requested entity.
- Clear prior verdict/form/link state when the claimed entity changes.
- Require rendered gate ID and active claim entity ID to match before enabling verdict.

Acceptance:

- Passing A and auto-claiming B always displays B as pending.
- Resolving A's delayed GET after B cannot alter B's screen.
- A verdict cannot be submitted for an entity different from the active claim.
- Component behavior tests cover reversed request resolution.
- Live screenshot confirms queue row and detail reference match.

### SEC-001: Make claim enforcement fail closed

Priority: P0

Owners: backend queues and all claim-protected controllers

Implementation:

- Make `StaffWorkQueuesService` a required guard dependency.
- Reject protected mutations without an active matching claim.
- Require `x-work-claim-id` where the endpoint is claim-scoped.
- Document explicit non-claim operations by route.
- Preserve stable conflict error codes.

Acceptance:

- Missing, wrong, released, expired, other-owner, and other-entity claim tests fail with the correct 409/403 response.
- Valid current claim succeeds.
- A deliberate Nest provider misconfiguration fails startup/tests rather than allowing requests.

### QA-002: Make reviewer decisions immutable and versioned

Priority: P0

Owners: backend Quality Gates and staff web

Implementation:

- Require `If-Match` for reviewer verdict.
- Accept normal verdict only from pending reviewer state.
- Return `STALE_WORK_VERSION` for stale writes.
- Add a separate audited super-admin correction operation if business policy permits changing a released verdict.
- Return authoritative completed gate and next-claim summary.

Acceptance:

- Two sessions using the same gate version produce one success and one conflict.
- Passed/blocked gates reject normal verdict replacement.
- UI refreshes from the mutation response and then validates the new claim.

### DB-001: Make finalization atomic and retryable

Priority: P0

Owners: backend Job Orders and persistence

Implementation:

- Transactionally create/read the invoice record and update Job Order state.
- Add idempotency handling for retries.
- Persist an outbox entry for post-commit lifecycle events.
- Track PDF generation separately as pending/ready/failed.
- Keep payment as a separate operation.

Acceptance:

- Failure injection cannot leave an invoice/status split.
- Repeating finalization returns the same authoritative result.
- PDF/email failure does not roll back or misreport durable finalization.
- Recovery worker can retry artifact generation.

## Release 2: Prove Concurrent Operations

### QUEUE-001: Add database-backed concurrency tests

Priority: P1

Owners: backend queues

Implement the matrix in `verification-and-scale.md`, including three simultaneous users and selected-record contention.

Acceptance:

- Tests use real concurrent database transactions.
- Exactly one active claim exists per entity.
- Each of three workers receives a different eligible record.
- Expiry, release, heartbeat, completion, pause, and reassignment behavior are deterministic.

### QUEUE-002: Replace offset cursor with keyset pagination

Priority: P1

Owners: backend queues and staff web

Implementation:

- Define stable default sort tuples for Job Orders and QA.
- Encode sort values and ID in a versioned cursor.
- Add stage, owner, technician, date, priority, blocker, overdue, and sort filters.
- Add supporting indexes after query-plan review.
- Preserve 25-row default page and aggregate counts.

Acceptance:

- 500+ seeded records create at most one page of queue rows in the DOM.
- Inserts/completions between page requests do not duplicate or skip stable records.
- Contract snapshots and generated clients are updated deterministically.

### QUEUE-003: Clarify workload and handoff states

Priority: P1

Owners: staff web UX

Implementation:

- Show both active Job Order and QA claims in My Work.
- After `Send to QA`, show handoff confirmation and `Take next Job Order`.
- After QA Pass, show completion and next-claim loading state.
- After QA Block, show the destination queue, reason, and responsible owner/unassigned state.
- Display lease expiry/recovery without requiring a page refresh.

Acceptance:

- A staff member can explain who owns the record and their next action from every stage.
- Slow QA does not prevent the sender from taking new Job Order work.
- One person holding both queue types receives an explicit workload warning rather than hidden state.

## Release 3: Complete Operations Integrity

### AUDIT-001: Add a unified append-only operational timeline

Priority: P1

Owners: backend events/persistence and staff web

Capture:

- source handoff;
- stage transitions;
- assignment changes;
- progress/evidence;
- claim/release/reassign/expiry;
- QA decisions and overrides;
- correction return;
- finalization/artifact/payment.

Acceptance:

- Timeline entries identify actor, event, entity, previous/new state, reason, time, and correlation ID.
- Sensitive note/photo/payment data is not duplicated into logs.
- History remains read-only.

### OBS-001: Add workflow and queue telemetry

Priority: P1

Owners: backend, staff web, operations

Use the metrics in `verification-and-scale.md`. Establish production baselines before setting staffing targets or SLOs.

Acceptance:

- Dashboards show queue depth, wait age, claim conflicts/expiry, workflow duration, error rate, and route/API percentiles.
- Metrics can be segmented by queue and stage without customer PII.

### RBAC-001: Remove retired authenticated workshop roles

Priority: P1

Owners: contracts, staff web, mobile, tests

Acceptance:

- Generated descriptions match controller guards.
- Mobile rejects staff roles.
- Technicians remain selectable profiles.
- Contract drift checks fail if retired roles return.

## Release 4: Modularize Behind Stable Behavior

### WEB-001: Split the QA workspace

Priority: P2

Extract:

- queue shell;
- selected-record controller;
- quality-gate detail;
- verdict form;
- completion/next-work coordinator;
- context/history drawer.

Keep `/admin/qa-audit` and API contracts stable.

### WEB-002: Split the Job Order workspace

Priority: P2

Extract:

- workspace shell;
- one component per workflow stage;
- draft-state hook;
- API adapter;
- action footer;
- context drawer;
- lifecycle derivation.

Target the shell below 1,000 lines and new modules below 500 lines.

### API-001: Split Job Orders application services

Priority: P2

Extract lifecycle, assignment, progress/evidence, QA handoff, and finalization services while keeping the controller contract and Nest module stable.

### MOBILE-001: Restore the customer-only boundary

Priority: P2

- Remove retired staff-role test assumptions.
- Add customer/staff rejection behavior tests.
- Preserve customer routes and deep links.

### MOBILE-002: Decompose the mobile dashboard

Priority: P2

Use the boundaries in `mobile-follow-up.md`. Add characterization tests before moving each feature.

### MOBILE-003: Upgrade Expo incrementally

Priority: P2

- Refresh dependency audit.
- Upgrade one SDK step at a time.
- Require tests, Expo Doctor, Android export, EAS preview, and device checks at every step.

## Release 5: Visual and Accessibility Polish

Priority: P3

Dependency: Releases 1-4 behavior and contracts are stable.

Implementation:

- Reduce oversized headers and repeated summaries.
- Keep only the application top bar sticky.
- Keep the action footer stable without obscuring work.
- Use a dense table/inbox for team queues.
- Keep details in a right-side preview or optional context drawer.
- Use restrained semantic colors, text/icon status labels, visible focus, and WCAG AA contrast.
- Validate desktop, tablet, and mobile-responsive staff layouts.

Acceptance:

- No header, drawer, or action bar covers active content.
- History never mounts active controls.
- Keyboard navigation and screen-reader labels cover all queue/workspace actions.
- Long references, names, blockers, and translated text do not overflow.
- Screenshots are reviewed at representative desktop, tablet, and mobile widths.

## Rollout Controls

1. Add regression tests before each behavioral refactor.
2. Feature-flag QA state-controller and keyset queue changes.
3. Deploy backend compatibility first, then generated clients, then UI.
4. Observe conflict/error/latency metrics.
5. Migrate active staff sessions without invalidating valid claims.
6. Remove compatibility fallbacks only after all staff clients send claim and version headers.
7. Perform visual polish after workflow correctness has remained stable.

## Definition of Complete

- Reproduced QA race is closed by automated and live verification.
- Claim and verdict mutations fail closed.
- Finalization is atomic and retryable.
- Three-worker concurrency is proven.
- 500+ queue records remain bounded and page-stable.
- Role drift is removed.
- Operational telemetry replaces fixture-based capacity guesses.
- Large modules are reduced behind stable routes/contracts.
- Customer mobile remains customer-only and passes its upgrade gates.
