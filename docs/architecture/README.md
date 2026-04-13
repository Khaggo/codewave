# AUTOCARE Backend SSoT

This directory is the backend source of truth for engineers and agents building the AUTOCARE ecosystem.

## Shared Goal

Use the docs in this directory to build and improve the backend quickly while preserving domain ownership, service boundaries, and documentation integrity.

## Load Order

1. [`system-architecture.md`](./system-architecture.md)
2. [`api-strategy.md`](./api-strategy.md) when transport, event, job, or integration decisions matter
3. [`dto-policy.md`](./dto-policy.md) when public REST payloads, validation, or Swagger contracts are involved
4. [`frontend-backend-sync.md`](./frontend-backend-sync.md) when coordinating frontend and backend work on the same slice
5. [`rbac-policy.md`](./rbac-policy.md) when roles, permissions, staff provisioning, or service-adviser identity are involved
6. [`auth-security-policy.md`](./auth-security-policy.md) when Google verification, email OTP, signup activation, or legacy auth migration is involved
7. [`ai-governance.md`](./ai-governance.md) when lifecycle summaries, QA audits, or provider adapter decisions are involved
8. [`domain-map.md`](./domain-map.md)
9. the target domain doc
10. only the target domain's direct dependency docs if needed
11. [`golden-domain-template.md`](./golden-domain-template.md) when creating or normalizing a new domain
12. the matching role file in [`agents/`](./agents/) when agent behavior or write permissions are relevant
13. [`tasks/README.md`](./tasks/README.md) when executing a concrete implementation task

## Quick Routing

- Use [`api-strategy.md`](./api-strategy.md) for REST vs RabbitMQ vs BullMQ decisions, Swagger expectations, and current integration exclusions such as firmware and third-party APIs.
- Use [`dto-policy.md`](./dto-policy.md) for request DTOs, response DTOs, validation placement, and Swagger transport contracts.
- Use [`frontend-backend-sync.md`](./frontend-backend-sync.md) for shared slice workflow, contract-pack rules, and live-vs-planned route labeling.
- Use [`rbac-policy.md`](./rbac-policy.md) for the canonical role set, staff provisioning, and service-adviser identifier rules.
- Use [`auth-security-policy.md`](./auth-security-policy.md) for Google+email signup activation, pending-account rules, OTP ownership, and legacy auth migration boundaries.
- Use [`ai-governance.md`](./ai-governance.md) for approved AI scope, provider adapter rules, and human-review requirements.
- For new domain scaffolding or normalization, load [`golden-domain-template.md`](./golden-domain-template.md), [`domains/main-service/users.md`](./domains/main-service/users.md), and [`domains/main-service/auth.md`](./domains/main-service/auth.md) first.
- Use [`tasks/README.md`](./tasks/README.md) when you want the current execution queue or a ready-made implementation task.

- Use [`domains/main-service/auth.md`](./domains/main-service/auth.md) for login, sessions, JWT, refresh flow, and guard behavior.
- Use [`domains/main-service/users.md`](./domains/main-service/users.md) for identity, profile, addresses, and account-state questions.
- Use [`domains/main-service/vehicles.md`](./domains/main-service/vehicles.md) for vehicle master data and ownership.
- Use [`domains/main-service/bookings.md`](./domains/main-service/bookings.md) for appointment planning, service selection, and slot capacity.
- Use [`domains/main-service/vehicle-lifecycle.md`](./domains/main-service/vehicle-lifecycle.md) for timeline history and verified-vs-administrative events.
- Use [`domains/main-service/inspections.md`](./domains/main-service/inspections.md) for intake, completion, and back-job verification records.
- Use [`domains/main-service/insurance.md`](./domains/main-service/insurance.md) for inquiry intake and insurance workflow tracking.
- Use [`domains/main-service/loyalty.md`](./domains/main-service/loyalty.md) for points, rewards, and accrual/reversal logic.
- Use [`domains/main-service/back-jobs.md`](./domains/main-service/back-jobs.md) for return/rework cases linked to prior work.
- Use [`domains/main-service/job-orders.md`](./domains/main-service/job-orders.md) for digital job orders, technician assignments, work progress, and invoice readiness.
- Use [`domains/main-service/quality-gates.md`](./domains/main-service/quality-gates.md) for AI-assisted release audits, QA statuses, and manual override flow.
- Use [`domains/main-service/notifications.md`](./domains/main-service/notifications.md) for reminders, preferences, and delivery state.
- Use [`domains/main-service/chatbot.md`](./domains/main-service/chatbot.md) for deterministic inquiry routing and escalations.
- Use [`domains/main-service/analytics.md`](./domains/main-service/analytics.md) for derived dashboards and audit-friendly read models.
- Use [`domains/ecommerce/catalog.md`](./domains/ecommerce/catalog.md) for products, categories, and sellable catalog state.
- Use [`domains/ecommerce/inventory.md`](./domains/ecommerce/inventory.md) for stock, reservations, and adjustments.
- Use [`domains/ecommerce/cart.md`](./domains/ecommerce/cart.md) for pre-checkout cart behavior.
- Use [`domains/ecommerce/orders.md`](./domains/ecommerce/orders.md) for invoice-based checkout and order lifecycle.
- Use [`domains/ecommerce/invoice-payments.md`](./domains/ecommerce/invoice-payments.md) for invoice status, payment entries, and aging behavior.
- Use [`domains/ecommerce/commerce-events.md`](./domains/ecommerce/commerce-events.md) for outbox, inbox, and downstream event boundaries.

## Control-Plane Docs

- [`system-architecture.md`](./system-architecture.md): global goals, agent topology, write governance, and integrity rules
- [`api-strategy.md`](./api-strategy.md): canonical transport, event, job, and Swagger decisions
- [`dto-policy.md`](./dto-policy.md): canonical request/response DTO and validation rules for REST domains
- [`frontend-backend-sync.md`](./frontend-backend-sync.md): shared slice workflow, contract-pack rules, and frontend/backend coordination
- [`rbac-policy.md`](./rbac-policy.md): canonical role model, staff provisioning, and permission boundaries
- [`auth-security-policy.md`](./auth-security-policy.md): canonical signup activation model, OTP ownership split, and legacy-login position
- [`ai-governance.md`](./ai-governance.md): approved AI scope, provider adapter policy, and human-review requirements
- [`domain-map.md`](./domain-map.md): dependency map and load guidance
- [`golden-domain-template.md`](./golden-domain-template.md): reusable starter pattern for new domains based on auth/users
- [`markdown-contract.md`](./markdown-contract.md): required Markdown structure
- [`agent-manifest.json`](./agent-manifest.json): machine-readable manifest and validation metadata
- [`agents/`](./agents/): role-specific do's, don'ts, and handoff rules
- [`tasks/`](./tasks/): non-canonical implementation tasks derived from the SSoT

## Operating Rules

- Domain docs are the first stop for business truth.
- Shared rules belong in control-plane docs, not inside individual domains.
- Transport choices belong in [`api-strategy.md`](./api-strategy.md), while domain docs own only their local endpoints, events, and jobs.
- REST payload contracts, validation placement, and Swagger DTO discipline belong in [`dto-policy.md`](./dto-policy.md).
- Frontend and backend should coordinate by slice using the rules in [`frontend-backend-sync.md`](./frontend-backend-sync.md).
- RBAC, staff provisioning, and service-adviser identifier rules belong in [`rbac-policy.md`](./rbac-policy.md).
- Google identity verification, email OTP activation, and pending-account security rules belong in [`auth-security-policy.md`](./auth-security-policy.md).
- AI summaries and AI-assisted QA belong behind the human-review and provider-adapter rules in [`ai-governance.md`](./ai-governance.md).
- Task files are execution aids derived from the SSoT and must point back to their source docs.
- A `back job` is a formal return/rework case, not every repeat visit.
- Vehicle lifecycle entries are hybrid: administrative events can be system-generated, condition-sensitive milestones must be inspection-backed.
- Invoice payments are tracking-oriented and do not imply automated bank or gateway settlement.
- Canonical staff roles are `customer`, `technician`, `service_adviser`, and `super_admin`.
- The chatbot stays deterministic and FAQ-oriented even though AI becomes canonical Phase 2 elsewhere.
- Firmware and device protocols remain out of scope, and third-party APIs stay excluded except for approved AI provider adapters plus approved identity providers and Nodemailer-backed SMTP delivery needed for canonical account activation.

## Legacy Material

Earlier topic-based docs remain in [`_legacy/`](./_legacy/) for reference only.
