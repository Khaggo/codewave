# AUTOCARE Planning Context

Last reviewed: 2026-07-27

## Purpose

This document is a planning handoff for the AUTOCARE repository. It summarizes the
product, users, active application surfaces, backend domains, important workflows,
data and API boundaries, operational rules, testing expectations, and known risks.

Use it to orient planning tools and new contributors before proposing work. Verify
implementation details against the live code and Swagger before changing a public
contract.

Do not place credentials, tokens, production connection strings, customer data, or
other secrets in this file.

## Product Summary

AUTOCARE supports Cruisers Crib Auto Care Center across four runtime applications:

| Application | Directory | Audience | Default local port |
| --- | --- | --- | --- |
| Main API | `backend/apps/main-service` | Staff web and customer mobile | `3000` |
| Ecommerce API | `backend/apps/ecommerce-service` | Shop, orders, inventory, and payments | `3001` |
| Staff portal | `frontend` | Service advisers and super admins | `3002` |
| Customer app | `mobile` | Customers only | Expo/Metro `8081`; optional web `8090` |

The system uses PostgreSQL as its system of record, Drizzle ORM for persistence,
REST/OpenAPI for synchronous contracts, and Redis/RabbitMQ-backed infrastructure for
queues and asynchronous boundaries where configured.

## Source-Of-Truth Order

When sources disagree, use this order:

1. Implemented controllers, DTOs, schemas, and live Swagger at `/docs-json` for API
   behavior.
2. `docs/architecture/` for product rules, domain ownership, RBAC, and architecture.
3. Generated contracts in `packages/contracts` for checked-in client transport
   shapes.
4. Application tests for expected behavior.
5. `docs/project-control/` for status history, QA evidence, panel feedback, and
   handoffs.
6. `docs/contracts/` for human-readable integration notes. These are useful but are
   not the canonical API definition.

Primary indexes:

- `README.md`
- `docs/architecture/README.md`
- `docs/architecture/repository-map.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/rbac-policy.md`
- `docs/architecture/tasks/README.md`
- `docs/project-control/README.md`
- `docs/contracts/README.md`

Some project-control documents are historical snapshots. Confirm their dates and
compare them with live code and current test results before treating an old finding
as open.

## Users And Access

### Customer

- Uses the mobile app, not the staff web portal.
- Owns and manages personal profile data, addresses, vehicles, bookings, insurance
  inquiries, rewards, shop activity, and reviewed lifecycle information.
- Can only access records authorized for that customer.

### Service Adviser

- Uses the staff web portal.
- Handles booking operations, intake, Job Orders, workshop progress, QA release,
  customer records, invoices, insurance, loyalty operations, and related follow-up.
- Can assign non-login technician profiles to workshop work.

### Super Admin

- Has all service adviser capabilities.
- Provisions and deactivates staff accounts.
- Manages privileged overrides and system-level administration.
- Owns restricted catalog and user-management surfaces.
- Must provide auditable reasons for sensitive assignment or workflow overrides.

### Technician Profile

Technicians are operational profiles, not authenticated staff-web roles. A profile
can hold specialties, assignments, checklist responsibility, evidence attribution,
and work history. Older code or documents may mention technician login behavior;
that is retired and must not be reintroduced without an explicit product decision.

The only active authenticated roles are:

- `customer`
- `service_adviser`
- `super_admin`

## Staff Web Modules

The staff portal is an operational application. Customer accounts must not remain in
the portal after authentication.

| Module | Main routes | Roles | Purpose and important behavior |
| --- | --- | --- | --- |
| Authentication | Login and session routes | Adviser, admin | Email/password staff login, protected sessions, role enforcement, and retired-role rejection. Staff self-registration is not available. |
| Dashboard | `/` | Adviser, admin | Operations overview, live work ownership, alerts, and shortcuts into active work. Prefer live queue data over monthly summaries. |
| Booking Schedule | `/bookings`; legacy `/admin/appointments` redirects | Adviser, admin | Review, confirm, reschedule, or decline bookings; inspect services, vehicles, dates, and reservation status; hand confirmed work to intake/workshop. |
| Intake Inspection | `/admin/intake-inspections` | Adviser, admin | Record the physical arrival inspection, notes, condition, checklist evidence, and workshop readiness. |
| Job Orders Board | `/admin/job-orders` | Adviser, admin | Scalable My Work and Team Board views for active, unassigned, blocked, and historical Job Orders. Uses bounded server-side queue pages rather than rendering all work. |
| Job Workspace | `/admin/job-orders/[id]` | Adviser, admin | Focused workspace for one Job Order: setup, assignments, progress, evidence, QA handoff, finalization, and payment linkage. |
| QA Audit | `/admin/qa-audit` | Adviser, admin | Independently claim QA work, review findings and evidence, pass or block release, and preserve an audit trail. A blocked verdict returns the job for correction. |
| Invoices and Orders | `/admin/invoices` | Adviser, admin | Review invoice readiness, order/payment state, aging, and completion after QA. |
| Customers and Vehicles | `/admin/customers`; `/vehicles` redirects | Adviser, admin | Search customer and owned-vehicle records and inspect service context. Customer ownership and privacy rules still apply. |
| Back Jobs | `/backjobs` | Adviser, admin | Inspect reported return work, approve rework, create linked Job Orders, and preserve lineage to the original completed work. |
| Insurance | `/insurance` | Adviser, admin | Review insurance inquiries, documents, requirements, and workflow status. |
| Insurance Collections | `/insurance/collections` | Adviser, admin | Track collection and payment follow-up connected to insurance work. |
| Insurance Renewals | `/insurance/renewals` | Adviser, admin | Track renewal follow-up and customer notifications. |
| Loyalty Management | `/loyalty` | Adviser, admin | Review customer balances, ledger activity, rewards, earning, and redemption operations. |
| Catalog Administration | `/admin/catalog` | Super admin | Manage ecommerce product and category information when the ecommerce feature is enabled. |
| Inventory | `/admin/inventory` | Adviser, admin | Review stock, reservations, and adjustments when the ecommerce feature is enabled. |
| Service Management | `/admin/services` | Adviser, admin | Manage the service catalog used by bookings and workshop work. |
| Staff and Technician Profiles | `/admin/users` | Super admin | Provision/deactivate authenticated staff and maintain non-login technician profiles. |
| Analytics and Summaries | `/admin/summaries` | Adviser, admin | View operational KPIs and review generated summaries/read models. Analytics must remain rebuildable from source facts. |
| Settings | `/settings` | Adviser, admin | Staff profile, account security, preferences, and supported system settings. |
| Shop Handoff | `/shop` | Adviser, admin | Legacy navigation handoff to the active catalog and inventory surfaces. |
| Customer Timeline Handoff | `/timeline` | Adviser, admin | Explains that the customer-facing vehicle lifecycle is delivered in mobile; staff inspect source records through operational modules. |
| Notifications and My Work | Global shell | Adviser, admin | Persisted assignment, reassignment, blocker, QA return, overdue, and work-resume signals with direct links to the relevant workspace. |

### Job Order Board Behavior

- The default operational view is a dense inbox/table, not a grid of hundreds of
  cards.
- Queue requests are bounded to 25 records and use server-side search, filtering,
  sorting, aggregate counts, and stable cursor pagination.
- Main views are `My Work`, `Team Queue`, `Unassigned`, `Blocked`, and `History`.
- History is read-only and must not mount active workflow controls.
- A row can open a quick preview; the full route opens the focused workspace.
- Filters may include stage, owner, technician profile, priority, scheduled date, job
  type, overdue state, and blocker.

### Job Order And QA Concurrency

- Work ownership uses atomic claims, leases, heartbeats, expiry, and unique-owner
  protection.
- A staff member may hold multiple active claims in each queue type, bounded by configurable workload capacity.
- Defaults are 12 Job Order claims and 6 QA claims per staff member; production can tune these independently.
- Every record still has at most one active owner, and every held claim keeps its own lease, heartbeat, and audit history.
  multiple staff members receive different records.
- `Start accepting work`, `Take next`, `Pause`, and `Take this job` are explicit user
  actions.
- Selected-record claims must return a clear conflict when another staff member wins.
- Super-admin reassignment requires an audit reason.
- Passing, blocking, or releasing QA must complete/release the current QA claim,
  refresh the queue, clear stale selection, and allow the next record to be claimed.

## Customer Mobile Modules

The Expo app is the active customer experience. The main shell currently exposes
Home, Garage, Book, Insurance, Rewards, and Shop destinations.

| Module | Screens or surfaces | Purpose and important behavior |
| --- | --- | --- |
| Landing and Authentication | Landing, Register, Login | Customer entry, email or approved identity-provider enrollment, login, and session creation. |
| Email Verification | OTP | Bounded OTP verification for account activation and sensitive recovery flows. |
| Onboarding | Complete Onboarding | Collect required profile details such as phone, birthday, and initial vehicle information. |
| Password Recovery | Forgot Password Email, OTP, Reset Password | Verified password reset without exposing whether unrelated accounts exist. |
| Home | Home tab | Customer overview, active service information, useful shortcuts, and recent activity. |
| Profile | Manage Profile | Personal details and account-owned information. |
| Addresses | Profile/settings surfaces | Customer address management for supported booking and commerce flows. |
| Security | Change Password and account controls | Password changes, session-sensitive account actions, and supported account deletion. |
| Garage | Garage tab | Owned vehicles, primary vehicle, vehicle details, and entry into lifecycle information. |
| Vehicle Lifecycle | Vehicle Lifecycle screen | Paginated service timeline, inspection-backed condition events, and human-reviewed AI summaries. |
| Booking | Book tab and Booking screen | Multi-service appointment creation using owned vehicle, date, slot availability, notes, and supported reservation payment. |
| Booking History and Tracking | Booking detail/history surfaces | View booking status, workshop stages, related Job Order progress, evidence intended for customers, and completion. |
| Insurance | Insurance tab and inquiry screen | Submit an inquiry, provide supported documentation, and follow requirements and status. |
| Rewards | Rewards tab | View points/ledger activity, reward offers, eligibility, and supported redemption. |
| Shop Catalog | Shop tab, Catalog section, Store screen | Browse categories and products, inspect product details, and manage cart intent. |
| Checkout and Orders | Shop Orders section | Validate inventory, create ecommerce order/invoice checkout, view order history, and track payment state. |
| Notifications | Notification surfaces | Receive booking, insurance, invoice, follow-up, and other supported in-app/email updates. |
| Notification Preferences | Settings subsection | Control email, booking reminders, insurance updates, invoice reminders, and service follow-up preferences. |
| Chatbot | Chatbot screen | Deterministic FAQ and support routing with escalation paths; it is not an autonomous decision maker. |
| Settings and Saved UI | Menu, settings, gift, saved surfaces | Customer preferences and convenience surfaces. Confirm API backing before planning dependencies on partially implemented gift or saved-item UI. |

Relevant mobile API clients include:

- `authClient`
- `bookingDiscoveryClient`
- `digitalGarageClient`
- `vehicleLifecycleClient`
- `insuranceClient`
- `loyaltyClient`
- `notificationClient`
- `catalogClient`
- `ecommerceCheckoutClient`
- `jobOrdersClient`
- `chatbotClient`

A legacy `TechnicianDashboard.js` may still exist in the source tree. It is not an
active product surface and must not be treated as evidence of technician login
support.

## Main API Domains

| Module | Ownership |
| --- | --- |
| `auth` | Credentials, approved identity provider signup, email OTP, tokens, sessions, password recovery, and access enforcement. |
| `users` | Customer/staff profiles, addresses, account state, staff provisioning, and deactivation. |
| `vehicles` | Vehicle records, customer ownership, primary vehicle behavior, and identifiers. |
| `bookings` | Appointment intake, selected services, schedules, availability, staff actions, reservation state, and workshop handoff. |
| `inspections` | Intake, completion, and back-job physical inspection records and evidence. |
| `job-orders` | Digital Job Order lifecycle, assignments, progress, evidence, QA handoff, finalization readiness, and source lineage. |
| `staff-work-queues` | Queue dispatch, selected-record claims, leases, heartbeat, expiry, staff presence, and workload summaries. |
| `technician-profiles` | Non-login technician directory, specialties, availability context, and assignment accountability. |
| `quality-gates` | QA prechecks, findings, adviser verdicts, blocks, passes, and audited overrides. |
| `back-jobs` | Return/rework reports, approval, linked rework Job Orders, and resolution. |
| `insurance` | Inquiries, documents, workflow activity, collections, and renewal context. |
| `loyalty` | Points ledger, earning rules, reward catalog, redemption, and reversals. |
| `notifications` | Persisted in-app notifications, email delivery, preferences, read state, and workflow reminders. SMS is outside the canonical scope. |
| `vehicle-lifecycle` | Unified customer timeline and review-gated summary publication. |
| `chatbot` | Deterministic support intents, FAQ responses, and routing. |
| `analytics` | Rebuildable operational read models, summaries, and KPIs. |
| `ai-worker` | Background AI jobs and provider adapters. Outputs requiring business judgment remain human reviewed. |
| Shared database/queue/events | PostgreSQL access, queue infrastructure, transactional events, health, configuration, and throttling. |

## Ecommerce API Domains

| Module | Ownership |
| --- | --- |
| `auth` | Ecommerce-side request authentication and identity integration. |
| `catalog` | Products, categories, pricing facts, visibility, and product metadata. |
| `inventory` | Stock, reservations, releases, adjustments, and availability checks. |
| `cart` | Customer cart state and item validation. |
| `orders` | Order snapshots, lifecycle, totals, and customer order history. |
| `invoice-payments` | Invoice/payment tracking, aging, paid-state facts, and staff follow-up. |
| Shared database/queue/events | Persistence, health, queues, and reliable event/outbox boundaries with the main service. |

The ecommerce service must not silently become the owner of customer identity,
bookings, Job Orders, QA, or loyalty policy. Cross-service effects should use explicit
contracts and reliable events.

## Core Business Workflows

### 1. Customer Enrollment

1. Customer registers in mobile through email or an approved identity provider.
2. Email enrollment completes OTP verification.
3. Onboarding collects required customer and initial vehicle details.
4. The account becomes an active customer and enters the mobile application.
5. Staff accounts are provisioned separately by a super admin.

### 2. Booking To Completion

1. Customer selects an owned vehicle, one or more services, date, and available slot.
2. The customer submits the booking and completes any supported reservation payment.
3. Staff confirms, reschedules, or declines the booking.
4. Staff performs the physical intake inspection.
5. `Send to Workshop` idempotently creates or opens the existing Job Order and returns
   its identifier/reference.
6. Staff assigns technician profiles and prepares the work.
7. Workshop progress is recorded per service with checklist updates, blockers, and
   required evidence.
8. `Send to QA` moves completed work into the independent QA queue.
9. QA passes the work or blocks it with a correction reason.
10. A blocked job returns to Job Orders with its reason and required action.
11. A passed job becomes eligible for finalization and invoice/payment linkage.
12. Payment and completion publish customer lifecycle facts and qualifying loyalty
    effects.

Current Job Order status values that must remain compatible are:

- `draft`
- `assigned`
- `in_progress`
- `blocked`
- `ready_for_qa`
- `finalized`
- `cancelled`

### 3. QA Review

- Automated/AI findings are advisory and do not make the release decision.
- A human service adviser records the pass or block verdict.
- Sensitive overrides are restricted and audited.
- A completed verdict must update the rendered queue immediately and release the
  staff member to take the next eligible task.
- Ready-for-QA work remains in the QA stage; it must not be presented as finalized
  before the verdict.

### 4. Back-Job Rework

1. A return concern is linked to prior completed work.
2. Staff records an inspection and disposition.
3. Approved rework creates a linked Job Order.
4. The rework uses the normal assignment, progress, evidence, QA, finalization, and
   payment rules while retaining a visible rework label and source lineage.

Do not assume customer self-service initiation exists unless the live route and
behavior are verified.

### 5. Ecommerce Order

1. Customer browses catalog and builds a cart.
2. Checkout validates current catalog and inventory facts.
3. Inventory is reserved through the supported transaction/event boundary.
4. An order and invoice/payment record are created.
5. Staff tracks payment and aging.
6. Fully paid qualifying facts may produce loyalty effects through explicit,
   idempotent integration.

### 6. Insurance

1. Customer submits an inquiry and supported documents.
2. Staff reviews requirements and updates workflow status.
3. Staff follows collection/payment and renewal work where applicable.
4. Customer-facing notifications and lifecycle events reflect approved status
   changes.

## Important Data And Contract Rules

- Prefer stable business references in the UI while retaining internal UUIDs for
  persistence and joins.
- Persist ownership snapshots where historical responsibility must survive profile or
  staff changes.
- Public request/response changes must update backend DTOs, OpenAPI output, generated
  contracts, client mapping, and tests together.
- Client screens should map transport objects into UI models instead of spreading raw
  API payloads throughout components.
- Booking-to-workshop handoff is idempotent and returns
  `{ jobOrderId, reference, created }`.
- Cross-service events and mutations must be idempotent.
- Analytics and summaries are derived read models, not the source of business facts.
- AI-generated lifecycle or QA content remains review gated.
- File uploads require size/type/signature checks and safe path handling.
- Do not expose secrets or sensitive dependency diagnostics through health endpoints.

## Shared Packages

| Package | Scope |
| --- | --- |
| `packages/contracts` | Deterministically generated OpenAPI transport contracts and shared API primitives. |
| `packages/domain-utils` | Framework-independent validation, identifiers, dates, money, and status helpers. |

Shared packages must not import Next.js, React Native, NestJS, database adapters, or
application UI components. Apps own framework-specific mapping and behavior.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `backend/` | Main and ecommerce NestJS services, schemas, migrations, tests, and Railway configuration. |
| `frontend/` | Next.js staff and super-admin portal. |
| `mobile/` | Expo customer application and mobile tests. |
| `packages/` | Framework-independent shared contracts and domain utilities. |
| `qa/playwright/` | Cross-module browser acceptance tests. |
| `docs/architecture/` | Canonical domain, policy, architecture, agent, and task documentation. |
| `docs/project-control/` | Current-state snapshots, QA ledger, roadmap, panel feedback, and historical handoffs. |
| `docs/contracts/` | Human-readable contract handoff material. |
| `.github/` | CI, ownership, security scanning, and dependency automation. |
| `.codex/` | Repository-local skills and optional AUTOCARE workflow support. |
| `tools/` | Repository validation, contract, migration, and maintenance tooling. |

Generated and local-only directories such as `node_modules`, `.next*`, coverage,
Expo exports, `.runtime`, test results, logs, temporary files, and Graphify output
are not architecture sources and should not be committed or indexed as product code.

## Runtime And Deployment

- Required runtime: Node `22.23.x` and npm `10.9.x`.
- The repository uses npm workspaces and one root lockfile.
- Local dependencies include PostgreSQL, Redis, and RabbitMQ according to the
  environment being exercised.
- Production database changes use committed Drizzle migrations.
- `db:push:local` is only for disposable local development databases.
- Repair, import, cleanup, and seed tools must be dry-run by default. Mutation
  requires explicit execution flags and production requires additional confirmation
  and an audit reason.
- Railway service definitions live with the relevant backend/frontend application.
- Mobile release configuration uses Expo/EAS.
- Environment variable names may be documented, but values and credentials must stay
  in approved secret stores and local ignored files.

Common local commands:

```text
npm ci
npm run dev:main
npm run dev:ecommerce
npm run dev:web
npm run dev:mobile
npm run dev:mobile:web
```

Default ports:

| Service | Port |
| --- | --- |
| Main API | `3000` |
| Ecommerce API | `3001` |
| Staff web | `3002` |
| Expo/Metro | `8081` |
| Expo web | `8090` |

Check listeners and health before starting another local process. Reuse a healthy
runtime instead of creating duplicate dev servers.

## Quality And Verification

Canonical root commands:

```text
npm run check
npm test
npm run build
npm run lint
npm run audit
npm run contracts:check
npm run graph:check
npm run migration:smoke
npm run qa:e2e
```

Verification layers:

- Backend: Jest unit/integration tests, type checking, builds, schema/migration checks,
  and contract tests.
- Staff web: component/behavior tests, lint, production build, role/access checks,
  and Playwright workflows.
- Mobile: Jest/React Native tests, Expo Doctor, Android export, and device/preview
  validation.
- End to end: authentication roles, Booking to Job Order to QA to Finalization to
  Payment, concurrent queue claims, notifications, and responsive staff workflows.
- Accessibility: visible focus, keyboard use, labels, WCAG AA contrast, and layouts
  that do not cover the active work area.
- Performance: bounded queue DOM size, route/bundle baselines, and investigation of
  unexplained growth above the recorded budget.

Avoid `npm audit fix --force`. Dependency upgrades must pass the relevant build,
tests, Expo checks, and export validation.

## Security And Audit Expectations

- Production must fail closed when secrets, database configuration, OTP policy, or
  allowed origins are unsafe.
- Authentication, authorization, ownership checks, and active-account checks belong
  on the server.
- OTP attempts and expiry are bounded and atomic.
- Helmet, throttling, safe CORS, validated uploads, and restricted error output are
  part of the baseline.
- Staff provisioning, deactivation, role changes, technician assignment, Job Order
  stage changes, QA verdicts, reassignment, and overrides require auditability.
- CodeQL, secret scanning, Dependabot, and package audits support the supply-chain
  baseline.

## AI And Agent Boundaries

- AI may assist with QA findings, lifecycle summaries, support routing, and analysis.
- AI output that affects a customer, release decision, payment, entitlement, or other
  business fact requires deterministic validation and human review.
- The repository contains role contracts, skills, task queues, and validators for an
  optional AUTOCARE agent workflow.
- There is no persistent autonomous multi-agent runtime assumed by the architecture.
- Ordinary repository work should remain direct. Activate the AUTOCARE queue/role
  workflow only when explicitly requested.
- Serena is preferred for source-level code inspection. Graphify is useful for
  dependency and relationship analysis after generated/runtime directories are
  excluded.

## Current Planning Risks And Priorities

1. The working tree contains a large amount of active modernization and feature work.
   Keep new changes scoped, inspect touched files carefully, and never discard
   unrelated user changes.
2. The mobile dashboard and Job Order workbench have historically been very large.
   Continue decomposition behind existing routes and contracts using characterization
   tests.
3. Job Order and QA usability remains operationally important: queue state, ownership,
   completed verdict refresh, next-task behavior, and focused workspace layout must
   be tested as complete workflows.
4. Mobile has an unresolved transitive advisory backlog tied to the Expo/React Native
   upgrade path. Upgrade one SDK step at a time and validate Doctor, tests, Android
   export, and preview builds.
5. Keep generated contracts deterministic and reject contract drift.
6. Keep production database migration and maintenance-script safeguards intact.
7. Keep Graphify indexes free of generated build artifacts so architecture findings
   reflect source code.
8. Archive completed plans and dated reports while maintaining one clear SSOT index
   and an active task queue.

## Planning Guardrails

Before planning or implementing a change:

1. Identify the owning domain and user role.
2. Trace the current route, API DTO, persistence schema, generated contract, client
   mapping, and tests.
3. State whether the change affects staff web, customer mobile, ecommerce, or a
   cross-service workflow.
4. Preserve current public URLs, statuses, claim headers, and data contracts unless a
   migration is explicitly part of the work.
5. Define authorization, ownership, audit, idempotency, concurrency, empty, loading,
   error, and retry behavior.
6. Use server-side pagination/filtering for operational queues and large datasets.
7. Keep one clear primary action for the current workflow stage.
8. Ensure slow work does not monopolize a staff member or hide other available work.
9. Add focused behavioral tests before restructuring high-risk modules.
10. Update architecture/task documentation when ownership or a durable business rule
    changes.

## Definition Of Done For Cross-Module Work

A cross-module feature is complete when:

- The backend contract and authorization are correct.
- Database changes have a committed migration and rollback/recovery consideration.
- Generated contracts and client mappings are synchronized.
- Staff and/or customer UI handles loading, empty, success, error, stale, and conflict
  states.
- Queue ownership and concurrent actions are safe where relevant.
- Audit history is preserved for privileged workflow changes.
- Targeted unit/integration tests pass.
- The affected end-to-end workflow passes.
- Desktop and mobile/responsive layouts are visually checked.
- The relevant SSOT and active task record are updated.

## Detailed Job Order, QA, Queue, And Mobile Evidence

The implementation-ready evidence snapshot for Job Orders, QA Audit, staff queue
concurrency, current failures, tests, scale observations, mobile follow-up, and the
prioritized remediation backlog is:

`docs/project-control/evidence/autocare-detailed-context-2026-07-27/README.md`

Use that dated evidence package for planning against the 2026-07-27 repository and
local runtime state. Treat its local seeded counts and timings as diagnostic context,
not production capacity data.

## Active Critical Workflow Implementation Plan

The decision-complete release order, interfaces, migrations, tests, rollout controls,
and 17-ticket backlog for Job Orders, QA Audit, staff queues, finalization, and the
customer/staff boundary are defined in:

`AUTOCARE_Critical_Workflow_Implementation_Plan.md`

This plan is the active implementation guide for the critical workflow. Unrelated
platform modernization remains deferred until the evidence requirements listed in
that plan are available.
