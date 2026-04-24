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
- `05-client-integration/`: web/mobile-facing slice coordination, client contracts, mocks, and acceptance tasks
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
  - `T006-ai-governance-and-provider-adapter`
  - `T007-auth-security-and-2fa-policy`
  - `T123-booking-availability-window-and-slot-definition-governance`
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
  - `T409-orchestrator-routing-and-improvement-intake`
  - `T501-booking-cross-surface-contract-foundation`
  - `T502-customer-booking-discovery-mobile-flow`
  - `T503-customer-booking-create-and-history-mobile-flow`
  - `T504-staff-booking-schedule-and-queue-web-flow`
  - `T505-staff-booking-decision-actions-web-flow`
  - `T506-booking-status-sync-reminders-and-cross-surface-acceptance`
  - `T507-auth-users-cross-surface-identity-foundation`
  - `T508-customer-google-email-activation-mobile-flow`
  - `T509-staff-auth-session-and-role-gating-web-flow`
  - `T510-customer-profile-address-and-account-states-mobile-flow`
  - `T511-customer-vehicle-onboarding-and-management-mobile-flow`
  - `T512-inspection-capture-and-verification-web-flow`
  - `T513-vehicle-timeline-and-reviewed-summary-mobile-flow`
  - `T514-insurance-customer-intake-mobile-flow`
  - `T515-insurance-review-and-status-web-flow`
  - `T516-job-order-workbench-web-flow`
- current priority queue:
  - no `ready` tasks are currently queued

## Build Order For Agents

Use this order when the user asks to continue implementation, activate the agent system, or pick the next practical module. Keep the existing task IDs unless implementation discovers a genuinely missing slice with no task.

1. `T520-notification-preferences-delivery-states-and-reminder-sync` - done; customer notifications, reminders, status-change delivery, and preference handling now have a contract pack and local-session read-state guidance.
2. `T521-loyalty-balance-history-rewards-and-redemption-mobile-flow` - done; customer mobile loyalty now shows live balance, history, reward availability, and redemption outcomes with paid-service-first copy plus explicit legacy-drift labeling for older ledger rows.
3. `T511-customer-vehicle-onboarding-and-management-mobile-flow` - completed prerequisite; verify add, edit, first-vehicle, and default-vehicle behavior during downstream work.
4. `T514-insurance-customer-intake-mobile-flow` and `T515-insurance-review-and-status-web-flow` - completed prerequisite pair; verify customer inquiry visibility and staff review visibility before extending insurance surfaces.
5. `T517-job-order-progress-photos-and-finalization-web-flow` - done; staff/mechanic progress entries, photo evidence, finalization, and invoice/payment handoff visibility now extend the job-order workbench.
6. `T518-quality-gates-review-release-and-override-web-flow` - done; live QA lookup, release-block visibility, and super-admin override are wired into the QA Audit workspace.
7. `T513-vehicle-timeline-and-reviewed-summary-mobile-flow` - completed prerequisite; verify customer-safe lifecycle and reviewed-summary visibility as job, QA, and back-job events expand.
8. `T519-back-jobs-review-and-rework-web-flow` - done; staff back-job create, review, validation, vehicle history, and linked rework job-order actions are live-route backed.
9. `T523-admin-analytics-dashboard-web-flow` - done; the shared `/admin/summaries` hub now loads live analytics read models for overview, operations, back-jobs, loyalty, invoice aging, and audit trail while preserving summary review as a lazy secondary tab.
10. `T522-faq-chatbot-customer-support-mobile-flow` - done; customer mobile now has a live FAQ support screen with deterministic prompts, lookup-aware deep links, and explicit escalation handling after the core operational chain.
11. `T524-catalog-and-product-discovery-mobile-flow` - done; customer mobile shop browsing now uses ecommerce-service catalog/category reads, explicit empty and service-unavailable states, and fresh product-detail lookups that surface hidden products honestly.
12. `T525-cart-and-invoice-checkout-mobile-flow` - done; customer mobile now supports live ecommerce cart mutation, immutable invoice preview, billing-address capture, and invoice-backed order creation without implying payment settlement.
13. `T526-order-history-and-invoice-tracking-mobile-flow` - done; customer mobile now exposes live ecommerce order history, immutable order snapshots, invoice aging states, and manual payment-entry tracking without implying gateway settlement.
14. `T527-inventory-and-stock-visibility-web-flow` - done; staff web inventory now shows live ecommerce product visibility and refreshed product detail while quantity, reservation, and adjustment routes stay explicitly labeled as planned inventory work.
15. `T528-commerce-and-main-service-derived-state-sync` - done; customer mobile now labels ecommerce order truth, notification read-model sync, and loyalty read-model sync separately, backed by a shared derived-state glossary and scenario mocks.
16. `T529-client-rbac-navigation-and-surface-guardrails` - done; staff web session restore now revalidates live auth identity before privileged navigation renders, and customer mobile explicitly blocks unauthorized, staff, and deactivated sessions from customer-owned protected screens.
17. `T530-openapi-contract-mock-and-client-regression-pack` - done; the completed client queue now has one regression registry for traceability, live-vs-planned route drift, mock coverage families, and honest OpenAPI fallback behavior when live Swagger is unavailable.
18. `T123-booking-availability-window-and-slot-definition-governance` - done; bookings now own bounded availability-window reads, staff slot-definition governance, and shared create/reschedule date validation.
19. `T531-customer-booking-availability-calendar-mobile-flow` - done; customer mobile now pages backend-owned availability windows, surfaces day and selected-slot capacity states, and refreshes live availability after booking conflicts instead of inventing local date windows.

Active implementation should prioritize pending tasks only, and there are currently no `ready` queued tasks after `T531`. The client-integration queue is now complete through `T531`. Completed prerequisites stay `done`; any discovered gaps should be captured as follow-up verification notes unless a new implementation task is truly required.

## Operating Rules

- task files are non-canonical execution aids
- every task must point back to one or more source-of-truth docs
- task files should not redefine business rules that belong in domain docs
- frontend/backend shared slices should also produce or update a contract pack and mock set
- if a task reveals missing or conflicting business truth, update the canonical SSoT first
