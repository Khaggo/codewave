# AUTOCARE Detailed Planning Context

Snapshot date: 2026-07-27

Workspace: `D:\mainprojects\codewave`

Purpose: implementation-ready evidence for planning Job Orders, QA Audit, staff queues, and the customer mobile follow-up.

## Safety and Scope

- This package contains repository paths, public API shapes, local synthetic-data observations, test output summaries, and redacted screenshots.
- It contains no passwords, access tokens, database URLs, private keys, cookies, or full authentication headers.
- Counts and timings are from the local seeded development environment. They are not production usage statistics or service-level measurements.
- Existing user-facing routes, database statuses, and API compatibility behavior are documented as they currently work, including defects.
- One seeded QA fixture was passed while reproducing the post-verdict issue. Temporary Job Order and QA claims were released afterward.

## Authority

Use sources in this order when resolving disagreement:

1. Backend schema, controller, service, and repository code.
2. The canonical OpenAPI document at `packages/contracts/openapi/main-service.json`.
3. Frontend client adapters and route components.
4. Automated tests.
5. Existing planning and historical documentation.

The live Swagger MCP transport was unavailable during collection. The same running backend exposed `/docs-json`, so the contract snapshots were generated directly from that endpoint. Generic password examples inherited through shared OpenAPI components were replaced with `[REDACTED_EXAMPLE]`.

## Package Contents

| File | Purpose |
| --- | --- |
| [file-inventory.md](file-inventory.md) | Exact frontend, backend, schema, generated contract, test, and migration paths. |
| [workflow-rules.md](workflow-rules.md) | Current lifecycle, role permissions, claim/lease rules, QA behavior, finalization, and failure handling. |
| [stuck-scenarios-and-findings.md](stuck-scenarios-and-findings.md) | Reproducible QA issue, historical failures, security/reliability findings, and observed logs. |
| [verification-and-scale.md](verification-and-scale.md) | Test results, missing coverage, local queue scale, response timings, and unknown production metrics. |
| [mobile-follow-up.md](mobile-follow-up.md) | Customer mobile routes, tabs, API clients, storage, notifications, package versions, verification, and risks. |
| [planning-backlog.md](planning-backlog.md) | Prioritized implementation tickets with acceptance criteria and rollout order. |
| [target-workflow-and-ux-spec.md](target-workflow-and-ux-spec.md) | Proposed workflow, page specifications, conflict states, API/database changes, usability tests, and rollout. |
| [Critical Workflow Implementation Plan](../../../../AUTOCARE_Critical_Workflow_Implementation_Plan.md) | Active decision-complete releases, interfaces, migrations, tests, rollout controls, and 17-ticket backlog. |
| `../../../../../packages/contracts/openapi/main-service.json` | Canonical generated API contract for all active service workflows. |
| `screenshots/` | Current live evidence and user-reported historical captures. |

## Executive Findings

### P1: QA detail can display the previous passed job after the next claim is assigned

The issue was reproduced in the running application:

1. Claim QA record `BK-20260621-0008`.
2. Record a Pass verdict.
3. The queue count changes from 18 to 17 and the backend auto-dispatches `BK-20260524-0003`.
4. The queue row correctly marks the new record as `Yours`.
5. The detail pane still shows the previous record's `Passed` result, note, review timestamp, and Job Order link.
6. A direct API read confirms the new record remains `pending_review/pending`.

This is a correctness risk because the selected queue item and the rendered decision context disagree.

### P1: Claim enforcement has compatibility fail-open paths

- `StaffWorkQueuesRepository.assertClaimAccess` permits a mutation when no active claim exists and no `x-work-claim-id` is supplied.
- `StaffWorkClaimGuard` injects the queue service with `@Optional()` and returns success if the dependency is absent.

These paths weaken the otherwise strong atomic-claim model.

### P1: QA verdicts are mutable without mandatory optimistic concurrency

- A verdict request may omit `If-Match`.
- The repository can update an already passed or blocked gate.
- Combined with the claim compatibility path, a direct authorized request can overwrite a prior decision.

### P1: Finalization is not one transaction

Invoice-record insertion and Job Order status update occur as separate writes. Artifact generation and some post-persistence side effects also happen after the state transition. A partial failure can leave an invoice created while the Job Order is not consistently finalized, or return an error after persistence succeeded.

### P2: Queue scalability is bounded in the DOM but not yet keyset-based

The board requests 25 records at a time, so 500 records are not rendered at once. The current cursor encodes an offset, however, and the API lacks the planned stage, owner, technician, date, priority, blocker, and sort filters. Concurrent inserts or status changes can move records between offset pages.

### P2: Critical concurrency behavior has no dedicated automated suite

No focused tests were found for three simultaneous staff claims, lease expiry, heartbeat, selected-record contention, pause/resume, or auto-dispatch after completion. Current backend and frontend suites pass, but they do not exercise the reproduced UI race.

### P2: Role and generated-contract drift remains

The canonical staff web model allows service advisers and super admins. Some generated web output and mobile source-inspection tests still refer to retired `technician` and `head_technician` login roles.

### P2: Large modules remain high-risk change surfaces

- `mobile/src/screens/Dashboard.js`: about 13,296 lines.
- `frontend/src/screens/JobOrderWorkbench.js`: about 5,769 lines.
- `backend/apps/main-service/src/modules/job-orders/services/job-orders.service.ts`: about 1,965 lines.
- `mobile/App.js`: about 1,853 lines.
- `mobile/src/screens/InsuranceInquiryScreen.js`: about 2,566 lines.
- `backend/apps/main-service/src/modules/staff-work-queues/repositories/staff-work-queues.repository.ts`: about 1,022 lines.
- `frontend/src/screens/QAAuditWorkspace.js`: about 1,036 lines.

## Current Runtime Snapshot

| Surface | State during collection |
| --- | --- |
| Main API | Listening on `127.0.0.1:3000`; `/api/health` returned `status: ok`. |
| Staff web | Listening on `127.0.0.1:3002`; route returned HTTP 200. |
| Expo/Metro ports 8081, 8085, 8090 | Not listening. |
| Current browser console | No errors or warnings after the reproduced QA flow. |

## Contract Integrity

Run `npm run contracts:check` from the repository root. It deterministically verifies the canonical generated API contract against the backend DTOs and controllers.

## Screenshot Index

### Current live application

- `screenshots/job-orders-team-board.png`
- `screenshots/job-order-workspace.png`
- `screenshots/qa-queue-before-claim.png`
- `screenshots/qa-review-workspace.png`
- `screenshots/qa-after-pass-verdict.png`

### User-reported historical states

- `screenshots/reported-job-order-failed-to-fetch.png`
- `screenshots/reported-qa-open-and-stale-queue.png`
- `screenshots/reported-send-to-qa-control.png`

## Planning Boundary

The repository can support the intended operating model without a rewrite:

- one active claim per person per queue;
- one Job Order claim and one QA claim can coexist for the same adviser;
- server-side bounded pages;
- explicit take-next and selected-record claims;
- lease, heartbeat, expiry, release, and reassignment;
- Job Order handoff into QA and QA return to correction.

The immediate work is to make these guarantees fail-closed, eliminate stale UI state, make finalization transactional, add concurrency tests, and complete the queue contract promised by the redesign.
