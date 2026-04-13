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

- `T105-bookings-operations-and-queue.md`
- `T106-job-orders-core.md`
- `T107-job-order-progress-and-photo-evidence.md`
- `T108-invoice-generation-from-job-orders.md`
- `T109-back-jobs-review-and-validation.md`
- `T110-insurance-inquiry-core.md`
- `T111-notifications-reminders-core.md`
- `T115-vehicle-lifecycle-ai-summary-review.md`
- `T116-quality-gates-foundation.md`
- `T117-quality-gate1-semantic-resolution-auditor.md`
- `T118-quality-gate2-discrepancy-risk-engine.md`
- `T119-quality-gate-manual-override.md`
- `T120-google-signup-and-email-otp-customer-enrollment.md`
- `T121-staff-pending-activation-google-email-otp.md`
