# Frontend Backend Contract Packs

This folder contains human-readable handoff packs for slices that need frontend and backend to move in parallel.

## Purpose

- make one slice understandable without loading the entire architecture tree
- show which routes are `live` from Swagger and which are only `planned` from task and domain docs
- point frontend teammates to the matching TypeScript contract files and mock fixtures

## Rules

- these files are non-canonical helpers, not the source of business truth
- canonical behavior still lives in `docs/architecture/domains/...`
- execution intent still lives in `docs/architecture/tasks/...`
- live backend contract still comes from `/docs-json`
- if a route is marked `planned`, frontend must treat it as mock-only until backend Swagger exposes it

## Current Packs

- `T507-auth-users-cross-surface-identity-foundation.md`
- `T508-customer-google-email-activation-mobile-flow.md`
- `T509-staff-auth-session-and-role-gating-web-flow.md`
- `T510-customer-profile-address-and-account-states-mobile-flow.md`
- `T511-customer-vehicle-onboarding-and-management-mobile-flow.md`
- `T512-inspection-capture-and-verification-web-flow.md`
- `T105-bookings-operations-and-queue.md`
- `T106-job-orders-core.md`
- `T107-job-order-progress-and-photo-evidence.md`
- `T108-invoice-generation-from-job-orders.md`
- `T109-back-jobs-review-and-validation.md`
- `T110-insurance-inquiry-core.md`
- `T111-notifications-reminders-core.md`
- `T520-notification-preferences-delivery-states-and-reminder-sync.md`
- `T521-loyalty-balance-history-rewards-and-redemption-mobile-flow.md`
- `T522-faq-chatbot-customer-support-mobile-flow.md`
- `T524-catalog-and-product-discovery-mobile-flow.md`
- `T525-cart-and-invoice-checkout-mobile-flow.md`
- `T526-order-history-and-invoice-tracking-mobile-flow.md`
- `T527-inventory-and-stock-visibility-web-flow.md`
- `T528-commerce-and-main-service-derived-state-sync.md`
- `T529-client-rbac-navigation-and-surface-guardrails.md`
- `T530-openapi-contract-mock-and-client-regression-pack.md`
- `T531-customer-booking-availability-calendar-mobile-flow.md`
- `T517-job-order-progress-photos-and-finalization-web-flow.md`
- `T518-quality-gates-review-release-and-override-web-flow.md`
- `T519-back-jobs-review-and-rework-web-flow.md`
- `T523-admin-analytics-dashboard-web-flow.md`
- `T115-vehicle-lifecycle-ai-summary-review.md`
- `T116-quality-gates-foundation.md`
- `T117-quality-gate1-semantic-resolution-auditor.md`
- `T118-quality-gate2-discrepancy-risk-engine.md`
- `T119-quality-gate-manual-override.md`
- `T120-google-signup-and-email-otp-customer-enrollment.md`
- `T121-staff-pending-activation-google-email-otp.md`
- `T202-catalog-v1.md`
- `T203-cart-and-invoice-checkout.md`
- `T204-order-tracking-and-purchase-history.md`
- `T205-invoice-only-payment-tracking.md`
- `T301-main-ecommerce-event-contracts.md`
- `T302-lifecycle-event-expansion.md`
- `T303-loyalty-from-service-and-purchase-events.md`
- `T304-notification-trigger-integration.md`
