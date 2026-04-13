# System Architecture

This file is the global agent contract for the AUTOCARE backend SSoT. Domain workers should start in their domain doc; this file exists to define shared goals, routing rules, write limits, and anti-corruption policy.

## Shared Goal

Build and maintain a correct, modular, and implementation-ready backend SSoT for AUTOCARE so agents can ship changes quickly without breaking domain boundaries, documentation integrity, or cross-service coordination.

## Global Objectives

- Keep domain truth local to the owning domain doc.
- Keep cross-domain rules in shared control-plane docs only.
- Minimize token usage by loading only the files required for the current task.
- Prevent uncontrolled edits, heading drift, and partial Markdown updates.
- Preserve a stable contract between main-service and ecommerce-service.
- Make every accepted documentation change explainable, validated, and reversible.
- Ensure the docs remain implementation-oriented for backend engineers and agents.

## Agent Topology

### Permanent roles

- `Orchestrator`: reads routing docs, decomposes work, assigns ownership, approves or rejects proposals, and resolves conflicts. It is proposal-only and may not directly mutate domain Markdown.
- `Domain Worker`: owns one assigned domain at a time and may edit only that domain's writable sections.
- `Integration Worker`: owns cross-domain APIs, events, shared contracts, and service-boundary alignment.
- `Validator`: verifies structure, links, manifest consistency, and machine-owned metadata before canonical files are replaced.
- `Codex as Contract Coordinator`: compares domain intent, task intent, frontend assumptions, and live Swagger for shared slices.

### Temporary specialist roles

- `Test Worker`: used when the task is mostly validation, regression design, or acceptance coverage.
- `Refactor Worker`: used for mechanical cleanup that spans many files but must still respect domain ownership.
- `Docs Worker`: used for compression, clarification, and readability passes after implementation evidence reveals confusion.

## Token Efficiency Rules

- Load files in this order:
  1. [`README.md`](./README.md)
  2. [`system-architecture.md`](./system-architecture.md)
  3. [`api-strategy.md`](./api-strategy.md) when transport, event, job, or external integration choices are involved
  4. [`dto-policy.md`](./dto-policy.md) when public REST contracts, validation, or Swagger payloads are involved
  5. [`frontend-backend-sync.md`](./frontend-backend-sync.md) when coordinating frontend and backend work on the same slice
  6. [`rbac-policy.md`](./rbac-policy.md) when staff roles, permissions, provisioning, or service-adviser identity are involved
  7. [`auth-security-policy.md`](./auth-security-policy.md) when Google verification, email OTP, pending activation, or legacy auth migration is involved
  8. [`ai-governance.md`](./ai-governance.md) when AI summaries, AI-assisted QA, provider adapters, or review policy are involved
  9. [`domain-map.md`](./domain-map.md)
  10. the target domain doc
  11. only the target domain's direct dependency docs if needed
- Treat `Agent Summary` in each domain doc as the cheapest routing block. It should answer "when should I load this file?" in one short paragraph.
- Do not load unrelated domains "just in case".
- Do not duplicate shared rules inside domain docs.
- Prefer narrow dependency reads over whole-service sweeps.
- When creating or normalizing a new domain, load [`golden-domain-template.md`](./golden-domain-template.md) plus the `main-service.users` and `main-service.auth` reference pair before writing.

## Write Governance

- `Orchestrator`: may propose, route, approve, reject, and escalate. It may not directly edit domain docs.
- `Domain Worker`: may edit only the assigned domain doc and only within declared `Writable Sections`.
- `Integration Worker`: may edit shared contracts or multiple domain docs only when the task is explicitly cross-domain.
- `Validator`: may update only machine-owned metadata such as hashes, versions, verification timestamps, and validation status.
- Domain workers do not directly edit `agent-manifest.json`.
- Structural manifest changes are orchestrator-governed by proposal and validator-checked before acceptance.
- `main-service.users` and `main-service.auth` are the current golden reference domains for documentation style and backend module shape.

## Cross-Domain Coordination

### Technical baseline

- `NextJS`: customer-facing and admin-facing frontend.
- `NestJS`: backend framework for both services.
- `Drizzle ORM`: typed persistence layer for PostgreSQL.
- `PostgreSQL`: transactional system of record.
- `REST + OpenAPI/Swagger`: canonical synchronous contract for public and admin-facing APIs.
- `DTO-first transport contracts`: request and response payloads should stay explicit and validation-backed.
- `BullMQ + Redis`: background jobs, retries, reminders, and derived refresh.
- `RabbitMQ`: inter-service events and reliable asynchronous handoff.
- `AI provider adapter`: approved Phase 2 AI features must route through a configurable adapter, not hard-coded model IDs.

### Service boundaries

- `main-service` owns auth, users, vehicles, bookings, vehicle lifecycle, inspections, insurance, loyalty, back jobs, job orders, quality gates, notifications, chatbot, and analytics.
- `ecommerce-service` owns catalog, inventory, cart, orders, invoice payments, and commerce events.
- Immediate user-facing reads may use explicit APIs or an internal gateway.
- State propagation and side effects should prefer events.
- Global transport and integration choices live in [`api-strategy.md`](./api-strategy.md); domain docs should document only local endpoints, events, and jobs.
- Global REST payload and validation rules live in [`dto-policy.md`](./dto-policy.md); do not reinvent DTO behavior per domain.
- Global frontend/backend coordination rules live in [`frontend-backend-sync.md`](./frontend-backend-sync.md).
- Global role boundaries, staff provisioning, and service-adviser identity rules live in [`rbac-policy.md`](./rbac-policy.md).
- Global Google-verified signup, email OTP activation, pending-account, and legacy-login rules live in [`auth-security-policy.md`](./auth-security-policy.md).
- Global AI scope, provider, and human-review policy live in [`ai-governance.md`](./ai-governance.md).
- Do not model direct cross-service foreign keys.
- Store external IDs and event metadata instead of assuming write access to another domain's tables.
- Keep the canonical scope software-only unless a future hardware track is explicitly approved.
- The canonical role set is `customer | technician | service_adviser | super_admin`.
- Invoice handling remains invoice-only and tracking-oriented; do not imply payment-gateway settlement.
- Canonical account creation is Google identity verification followed by email OTP activation. Existing password-first registration remains legacy current-state until migration tasks land.
- `main-service.auth` owns activation state, Google identity linkage, and OTP challenge decisions; `main-service.notifications` owns Nodemailer-backed OTP delivery execution and delivery observability.
- `main-service.notifications` is email-only in the current canonical scope for both auth OTP and operational reminders. SMS remains backlog-only unless a future approval explicitly reintroduces it.
- `main-service.chatbot` remains deterministic and FAQ-oriented. Do not merge it with generative AI features.
- AI is canonical Phase 2, not immediate core delivery. Approved Phase 2 AI scope is limited to lifecycle layman summaries and QA audit assistance with mandatory human review.
- Prefer vertical-slice delivery where the same task ID, contract pack, backend implementation, and frontend mock mode all describe one feature boundary.

## Improvement Loop

1. Orchestrator identifies a gap, conflict, or repeated source of confusion.
2. Orchestrator issues a bounded change request with target file, allowed sections, and acceptance checks.
3. A worker edits only the permitted file scope.
4. Validator checks heading schema, links, dependencies, and manifest integrity.
5. Validator refreshes machine-owned metadata.
6. Canonical Markdown is replaced only after validation passes.

Use this loop only when there is evidence from implementation, tests, runtime behavior, or repeated ambiguity. Do not rewrite docs speculatively.

## Markdown Integrity Rules

- Canonical docs must follow the heading contract in [`markdown-contract.md`](./markdown-contract.md).
- Domain docs must have unique `Domain ID` values.
- Canonical file names are stable and must not be renamed without a manifest update.
- Partial edits, duplicate headings, missing summaries, and undeclared cross-domain changes fail validation.
- Failed validation means the canonical Markdown stays unchanged.
- The validator owns hashes and verification metadata in [`agent-manifest.json`](./agent-manifest.json).
