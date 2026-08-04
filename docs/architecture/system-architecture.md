# System Architecture

This file is the global agent contract for the AUTOCARE backend SSoT. Domain workers should start in their domain doc; this file exists to define shared goals, routing rules, write limits, anti-corruption policy, and the improvement loop that keeps the system useful without letting it drift.

## Shared Goal

Build and maintain a correct, modular, self-improving, and implementation-ready backend SSoT for AUTOCARE so agents can ship changes quickly without breaking domain boundaries, documentation integrity, or cross-service coordination.

## Global Objectives

- Keep domain truth local to the owning domain doc.
- Keep cross-domain rules in shared control-plane docs only.
- Minimize token usage by loading only the files required for the current task.
- Prevent uncontrolled edits, heading drift, and partial Markdown updates.
- Treat prompt routing, documentation clarity, and validation coverage as system behaviors that must improve when evidence shows they are weak.
- Preserve stable contracts between the main API, staff web, and customer mobile app.
- Make every accepted documentation change explainable, validated, and reversible.
- Ensure the docs remain implementation-oriented for backend engineers and agents.

## Agent Topology

### Runtime model

- The repository contains role contracts, skills, task files, and validators. It does not contain a persistent autonomous multi-agent runtime.
- Agent mode is opt-in. Ordinary user-directed work remains a direct Codex task and does not load or claim the implementation queue.
- One Codex session applies the role contracts sequentially by default. Parallel workers require explicit user intent, disjoint write scopes, and one integration owner.
- A role handoff is an ownership checklist unless a real parallel task was explicitly created; documentation must not imply that a background process started.

### Core responsibility roles

- `Orchestrator`: is the default front door for freeform user prompts, reads routing docs, decomposes work, triages improvement evidence, assigns ownership, approves or rejects proposals, and resolves conflicts. It is proposal-only and may not directly mutate domain Markdown.
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
- Start freeform prompts in orchestrator mode unless the user explicitly names a worker role.
- Do not load unrelated domains "just in case".
- Do not duplicate shared rules inside domain docs.
- Prefer narrow dependency reads over whole-service sweeps.
- When routing or clarity problems repeat, load the smallest evidence set needed to classify them as `noise`, `observation`, or `bounded proposal`.
- When creating or normalizing a new domain, load [`golden-domain-template.md`](./golden-domain-template.md) plus the `main-service.users` and `main-service.auth` reference pair before writing.

## Write Governance

- `Orchestrator`: may propose, route, approve, reject, and escalate. It may not directly edit domain docs.
- `Domain Worker`: may edit only the assigned domain doc and only within declared `Writable Sections`.
- `Integration Worker`: may edit shared contracts or multiple domain docs only when the task is explicitly cross-domain.
- `Validator`: may update only machine-owned metadata such as hashes, versions, verification timestamps, and validation status.
- These governance rules apply when agent mode is active. A direct user task does not need to become a queue item.
- Direct worker invocation is a narrow explicit exception inside agent mode. If the user activates agent mode without naming a role, the request starts with the orchestrator.
- Domain workers do not directly edit `agent-manifest.json`.
- Structural manifest changes are orchestrator-governed by proposal and validator-checked before acceptance.
- `main-service.users` and `main-service.auth` are the current golden reference domains for documentation style and backend module shape.

## Cross-Domain Coordination

### Technical baseline

- `Next.js`: staff and super-admin web portal.
- `Expo + React Native`: customer-facing mobile application.
- `NestJS`: backend framework for both services.
- `Drizzle ORM`: typed persistence layer for PostgreSQL.
- `PostgreSQL`: transactional system of record.
- `REST + OpenAPI/Swagger`: canonical synchronous contract for public and admin-facing APIs.
- `DTO-first transport contracts`: request and response payloads should stay explicit and validation-backed.
- `BullMQ + Redis`: background jobs, retries, reminders, and derived refresh.
- `RabbitMQ`: inter-service events and reliable asynchronous handoff.
- `AI provider adapter`: approved Phase 2 AI features must route through a configurable adapter, not hard-coded model IDs.

### Production security baseline

- Production configuration must come from the deployment environment. Runtime services must not fall back to repository example env files.
- JWT access and refresh secrets must be distinct, non-placeholder values of at least 32 characters.
- OTP bypass is development-only and is rejected during production startup.
- Both Nest services apply Helmet security headers, explicit CORS allowlists, and global request throttling.
- Authentication endpoints use tighter route-level throttles, cryptographically secure OTP generation, bounded verification attempts, and atomic attempt accounting.
- Uploaded evidence is size-bounded and validated from file signatures. Local storage reads must remain inside the configured upload root.
- Internal upload URL schemes are service-owned and cannot be supplied through ordinary external-document APIs.

### Service boundaries

- `main-service` owns auth, users, vehicles, bookings, vehicle lifecycle, inspections, insurance, loyalty, back jobs, job orders, quality gates, notifications, chatbot, and analytics.
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
- The Accessories bounded context owns accessory catalog, fitment, stock, cart, pickup order, payment/refund, fulfillment, and outbox data inside `main-service`. It may reference owned vehicles and notification delivery, but must not reuse service catalog, Job Order, QA, service invoice, loyalty, or the retired ecommerce runtime.
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

1. User explicitly activates agent mode, selects queued work, or submits improvement evidence for orchestrator triage.
2. Orchestrator loads the minimum routing context, identifies ownership, and classifies the evidence as `noise`, `observation`, or `bounded proposal`.
3. If the evidence is weak, duplicated, or not actionable, the orchestrator rejects it as noise and stops.
4. If the evidence is credible but not yet a bounded change, the orchestrator logs an observation in the non-canonical improvement queue so stagnation, drift, and repeated confusion stay visible.
5. If change is warranted, the orchestrator creates a bounded proposal with target file, allowed sections, and acceptance checks.
6. The active Codex session applies the owning role checklist, or an explicitly created parallel worker edits only its permitted file scope.
7. Validator checks heading schema, links, dependencies, and manifest integrity.
8. Validator refreshes machine-owned metadata.
9. Canonical Markdown is replaced only after validation passes and the proposal remains human-approved.

Use this loop when there is evidence from implementation, tests, runtime behavior, repeated ambiguity, validator failure, doc or code drift, stale control docs, unresolved `ready` queues, conflicting docs, or repeated frontend/backend mismatch. Do not rewrite docs speculatively, but do not ignore credible evidence either.

## Markdown Integrity Rules

- Canonical docs must follow the heading contract in [`markdown-contract.md`](./markdown-contract.md).
- Domain docs must have unique `Domain ID` values.
- Canonical file names are stable and must not be renamed without a manifest update.
- Partial edits, duplicate headings, missing summaries, and undeclared cross-domain changes fail validation.
- Failed validation means the canonical Markdown stays unchanged.
- The validator owns hashes and verification metadata in [`agent-manifest.json`](./agent-manifest.json).
- The improvement queue in [`_backlog/agent-improvement-queue.md`](./_backlog/agent-improvement-queue.md) is non-canonical evidence tracking and must not replace approved task or domain updates.
