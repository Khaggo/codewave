# File Inventory

This inventory identifies current implementation ownership. Paths are relative to the repository root.

## Staff Web Routes

| Route | File |
| --- | --- |
| `/admin/job-orders` | `frontend/src/app/admin/job-orders/page.js` |
| `/admin/job-orders/[id]` | `frontend/src/app/admin/job-orders/[id]/page.js` |
| `/admin/qa-audit` | `frontend/src/app/admin/qa-audit/page.js` |

## Staff Web Screens and Components

| Concern | File |
| --- | --- |
| Job Orders team board and views | `frontend/src/screens/JobOrdersOperationsBoard.jsx` |
| Focused Job Order workspace | `frontend/src/screens/JobOrderWorkbench.js` |
| QA queue and review workspace | `frontend/src/screens/QAAuditWorkspace.js` |
| Reusable queue, claims, pagination, presence | `frontend/src/components/StaffWorkQueue.jsx` |
| Lifecycle/stage display | `frontend/src/components/ServiceLifecycleHeader.js` |
| Global navigation, badge, resume action, notifications | `frontend/src/components/layout/AppShell.js` |

### Staff web state ownership

There is no dedicated Job Order or QA global store. Most active state, request state, loaded records, forms, and transitions live inside `JobOrderWorkbench.js`, `QAAuditWorkspace.js`, and `StaffWorkQueue.jsx`. The app shell separately owns global claim summaries and notification presentation.

This distributed component state is relevant to the reproduced stale QA-detail race.

## Staff Web Clients and View Models

| Concern | File |
| --- | --- |
| Staff queue API client | `frontend/src/lib/staffWorkQueueClient.js` |
| QA gate API client | `frontend/src/lib/qualityGateClient.js` |
| Job Order workspace API client | `frontend/src/lib/jobOrderWorkbenchClient.js` |
| Service progress derivation | `frontend/src/lib/jobOrderServiceProgressModel.mjs` |
| QA presentation helpers | `frontend/src/screens/qaAuditView.mjs` |

## Generated Staff Web API

### Job Orders

- `frontend/src/lib/api/generated/job-orders/staff-web-workbench.ts`
- `frontend/src/lib/api/generated/job-orders/staff-web-execution.ts`
- `frontend/src/lib/api/generated/job-orders/responses.ts`
- `frontend/src/lib/api/generated/job-orders/requests.ts`
- `frontend/src/lib/api/generated/job-orders/errors.ts`

### Quality Gates

- `frontend/src/lib/api/generated/quality-gates/staff-web-qa-review.ts`
- `frontend/src/lib/api/generated/quality-gates/responses.ts`
- `frontend/src/lib/api/generated/quality-gates/requests.ts`
- `frontend/src/lib/api/generated/quality-gates/errors.ts`

### Mock and compatibility sources

- `frontend/src/mocks/job-orders/mocks.ts`
- `frontend/src/mocks/quality-gates/mocks.ts`
- `frontend/src/shared/autocare/services/qaAudit.js`

Some generated Job Order descriptions still name retired `technician` and `head_technician` web roles. Active controllers and canonical RBAC allow service advisers and super admins only.

## Backend Job Orders

Base directory:

`backend/apps/main-service/src/modules/job-orders/`

### Runtime ownership

- `controllers/job-orders.controller.ts`
- `services/job-orders.service.ts`
- `services/job-order-evidence-storage.service.ts`
- `services/job-order-evidence-storage.service.spec.ts`
- `services/job-order-invoice-pdf.service.ts`
- `services/job-order-paymongo.service.ts`
- `services/technician-checklist-pdf.service.ts`
- `repositories/job-orders.repository.ts`
- `schemas/job-orders.schema.ts`
- `job-orders.module.ts`

### DTOs

- `dto/add-job-order-photo.dto.ts`
- `dto/add-job-order-progress.dto.ts`
- `dto/booking-handoff-response.dto.ts`
- `dto/create-job-order-item.dto.ts`
- `dto/create-job-order.dto.ts`
- `dto/customer-job-order-history.dto.ts`
- `dto/finalize-job-order.dto.ts`
- `dto/job-order-assignment.dto.ts`
- `dto/job-order-response.dto.ts`
- `dto/job-order-invoice-response.dto.ts`
- `dto/list-job-order-workbench.dto.ts`
- `dto/record-job-order-payment.dto.ts`
- `dto/replace-job-order-assignments.dto.ts`
- `dto/update-job-order-status.dto.ts`
- `dto/update-job-order-workshop-stage.dto.ts`
- `dto/upload-job-order-photo.dto.ts`

## Backend Quality Gates

Base directory:

`backend/apps/main-service/src/modules/quality-gates/`

### Runtime ownership

- `controllers/quality-gates.controller.ts`
- `services/quality-gates.service.ts`
- `services/quality-gate-discrepancy-engine.service.ts`
- `services/quality-gate-semantic-auditor.service.ts`
- `repositories/quality-gates.repository.ts`
- `schemas/quality-gates.schema.ts`
- `quality-gates.module.ts`
- `quality-gates.constants.ts`

### DTOs

- `dto/record-quality-gate-verdict.dto.ts`
- `dto/override-quality-gate.dto.ts`
- `dto/quality-gate-finding.dto.ts`
- `dto/quality-gate-provenance.dto.ts`
- `dto/quality-gate-response.dto.ts`
- `dto/quality-gate-override-response.dto.ts`

## Backend Staff Work Queues

Base directory:

`backend/apps/main-service/src/modules/staff-work-queues/`

- `controllers/staff-work-queues.controller.ts`
- `services/staff-work-queues.service.ts`
- `repositories/staff-work-queues.repository.ts`
- `schemas/staff-work-queues.schema.ts`
- `guards/staff-work-claim.guard.ts`
- `decorators/staff-work-claim.decorator.ts`
- `staff-work-queues.module.ts`

### DTOs

- `dto/claim-selected-work.dto.ts`
- `dto/list-staff-work-queue.dto.ts`
- `dto/reassign-staff-work.dto.ts`
- `dto/release-staff-work.dto.ts`
- `dto/staff-queue-session.dto.ts`

## Shared Events and Background Work

- `backend/shared/events/autocare-event-bus.service.ts`
- Background AI/QA BullMQ job definitions under the backend shared queue modules.

The Job Order audit trail is distributed across progress logs, claim history, QA overrides, version/timestamp fields, and published events. There is no single Job Order audit-history table.

## Database Tables

### Job Orders

Defined in:

`backend/apps/main-service/src/modules/job-orders/schemas/job-orders.schema.ts`

| Table | Main responsibility |
| --- | --- |
| `job_orders` | Source, customer, vehicle, adviser, status, stage, job type, parent lineage, notes, version, timestamps. |
| `job_order_items` | Service/task definition, completion, photo-evidence requirement, display order. |
| `job_order_assignments` | Technician-profile snapshot, code, name, specialty, assignment time, nullable legacy technician user ID. |
| `job_order_progress_logs` | Entry type, message, service item, technician profile, recorder, stage, completed item IDs, photo IDs. |
| `job_order_photos` | Linked entity, storage/file metadata, caption, author, soft-delete timestamp. |
| `job_order_invoice_records` | Invoice, payment, external payment, and PDF metadata. |

### Quality Gates

Defined in:

`backend/apps/main-service/src/modules/quality-gates/schemas/quality-gates.schema.ts`

| Table | Main responsibility |
| --- | --- |
| `job_order_quality_gates` | Gate/precheck state, reviewer decision, note, timestamps, risk, block reason, version, audit metadata. |
| `quality_gate_findings` | Machine and human findings and provenance. |
| `quality_gate_overrides` | Super-admin override decision, reason, actor, timestamp. |

### Staff Queues

Defined in:

`backend/apps/main-service/src/modules/staff-work-queues/schemas/staff-work-queues.schema.ts`

| Table | Main responsibility |
| --- | --- |
| `staff_queue_sessions` | Accepting/paused state and recent staff presence. |
| `staff_work_claims` | Queue, entity, owner, claim state, lease, heartbeat, completion/release data and reason. |

Active claims have two important partial unique indexes:

- one active claim for a queue/entity pair;
- one active claim for an owner/queue pair.

The database therefore permits a person to hold one active Job Order claim and one active QA claim at the same time.

## Migrations

Committed Drizzle history currently contains:

- `backend/drizzle/0000_living_the_spike.sql`
- `backend/drizzle/meta/0000_snapshot.json`
- `backend/drizzle/meta/_journal.json`

All current tables are represented in the baseline migration. There are no later incremental migrations in the committed migration directory at this snapshot.

## Automated Tests

### Backend

- Job Order service tests under the Job Order service directory.
- Job Order integration tests under the main-service test/module structure.
- Quality Gate service tests under the Quality Gate service directory.
- Quality Gate integration tests under the main-service test/module structure.
- `backend/apps/main-service/src/modules/job-orders/services/job-order-evidence-storage.service.spec.ts`

The exact targeted command and result are recorded in `verification-and-scale.md`.

### Staff web

- `frontend/src/screens/qaAuditView.test.mjs`
- `frontend/src/screens/jobOrderServiceWorkflowView.test.mjs`
- `frontend/src/lib/jobOrderServiceProgressModel.test.mjs`
- `frontend/src/screens/workspaceCopyCleanup.test.mjs`
- Playwright scenarios under `frontend/tests/` for authentication, booking-to-cash, Job Order/QA flow, and responsive workflows.

Several current frontend tests inspect source text or pure presentation helpers. They do not mount `QAAuditWorkspace` with overlapping requests, so they cannot detect the reproduced stale-data race.

### Mobile

Mobile tests run through the root/mobile test command and cover 73 current cases. Some are source-inspection tests that still expect retired workshop login roles; see `mobile-follow-up.md`.

## OpenAPI Route Inventory

### Job Orders: 23 paths

- `POST /api/job-orders`
- `POST /api/job-orders/booking-handoffs/{bookingId}`
- `GET /api/job-orders/assigned`
- `GET /api/job-orders/workbench-summaries`
- `GET /api/job-orders/workbench-calendar`
- `GET /api/job-orders/{id}`
- assignment replacement and stage/status update routes
- progress and photo routes
- photo upload and file download routes
- finalization and invoice routes
- payment, PayMongo checkout, reconciliation, and webhook routes
- vehicle and customer service-history routes
- technician checklist PDF and invoice PDF routes

The exact methods, parameters, request bodies, and responses are preserved in `packages/contracts/openapi/main-service.json`.

### Quality Gates: 3 paths

- `GET /api/job-orders/{jobOrderId}/qa`
- `PATCH /api/job-orders/{jobOrderId}/qa/verdict`
- `PATCH /api/job-orders/{jobOrderId}/qa/override`

### Staff Work Queues: 8 paths

- list queue
- update accepting/paused session
- dispatch next
- claim selected work
- list team presence/workload
- heartbeat current claim
- release current claim
- super-admin reassignment

The full route forms are preserved in `packages/contracts/openapi/main-service.json`.
