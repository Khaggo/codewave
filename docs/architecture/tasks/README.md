# AUTOCARE Implementation Tasks

This folder is the execution layer derived from the canonical SSoT in `docs/architecture/`. Use it to queue concrete work without turning task files into the source of business truth.

## Purpose

- turn domain docs into actionable implementation tasks
- keep work ordered by delivery track
- give agents a stable task format with explicit source docs and acceptance checks
- keep roadmap execution separate from canonical architecture contracts

## Load Order

1. `../README.md`
2. `../system-architecture.md`
3. `../api-strategy.md` when transport, event, or job decisions matter
4. `../frontend-backend-sync.md` when a slice has frontend coordination
5. the owning domain doc
6. this file
7. the specific task file

## Folder Layout

- `00-foundation/`: workspace, infra, DB, validation, and shared tooling tasks
- `01-main-service/`: main-service domain delivery tasks
- `02-ecommerce-service/`: ecommerce-service delivery tasks
- `03-integration/`: cross-service events, contracts, and orchestration tasks
- `04-quality-and-ops/`: validation, regression, CI, and observability tasks
- `_archive/`: completed or superseded task files

## Status Legend

- `planned`: defined but not ready to assign
- `ready`: decision-complete and ready for implementation
- `in_progress`: actively being worked
- `blocked`: waiting on a direct dependency
- `done`: acceptance checks passed

## Seed Task Queue

- completed baseline tasks:
  - `T004-pm-feature-alignment-ssot`
  - `T005-rbac-policy-and-permission-matrix`
  - `T007-auth-security-and-2fa-policy`
  - `T101-bookings-v1`
  - `T102-inspections-v1`
  - `T103-vehicle-lifecycle-v1`
  - `T104-auth-users-rbac-hardening`
  - `T105-bookings-operations-and-queue`
  - `T106-job-orders-core`
  - `T107-job-order-progress-and-photo-evidence`
  - `T108-invoice-generation-from-job-orders`
  - `T109-back-jobs-review-and-validation`
  - `T110-insurance-inquiry-core`
  - `T111-notifications-reminders-core`
  - `T112-loyalty-core`
  - `T113-admin-dashboard-analytics-v1`
  - `T114-faq-chatbot-v1`
  - `T122-auth-otp-delivery-foundation`
  - `T120-google-signup-and-email-otp-customer-enrollment`
  - `T121-staff-pending-activation-google-email-otp`
  - `T115-vehicle-lifecycle-ai-summary-review`
  - `T116-quality-gates-foundation`
  - `T117-quality-gate1-semantic-resolution-auditor`
  - `T118-quality-gate2-discrepancy-risk-engine`
  - `T119-quality-gate-manual-override`
  - `T201-ecommerce-bootstrap`
  - `T202-catalog-v1`
  - `T203-cart-and-invoice-checkout`
  - `T204-order-tracking-and-purchase-history`
  - `T205-invoice-only-payment-tracking`
  - `T301-main-ecommerce-event-contracts`
  - `T302-lifecycle-event-expansion`
  - `T303-loyalty-from-service-and-purchase-events`
  - `T304-notification-trigger-integration`
  - `T305-ai-worker-jobs-with-bullmq`
  - `T405-rbac-regression-matrix`
  - `T406-job-order-and-qa-regression-suite`
  - `T407-openapi-contract-expansion`
  - `T408-audit-and-override-observability`
- current priority queue:
  - no seeded tasks are currently queued

## Operating Rules

- task files are non-canonical execution aids
- every task must point back to one or more source-of-truth docs
- task files should not redefine business rules that belong in domain docs
- frontend/backend shared slices should also produce or update a contract pack and mock set
- if a task reveals missing or conflicting business truth, update the canonical SSoT first
