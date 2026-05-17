# 2026-05-14 Insurance Module Phase 2 Collections Design

## Goal
Add a focused collections operations layer to the insurance module so staff can manage unpaid cases, verify proof of payment, track due dates, mark overdue accounts, and log payment follow-up actions without relying on manual chat as the main workflow.

## Scope
Included:
- Add a proper backend workflow-update route for payment and related insurance workflow metadata
- Add a collections-focused staff web workspace for unpaid and proof-of-payment follow-up
- Support proof-of-payment verification, due dates, overdue tagging, and reminder logging
- Preserve the customer mobile proof-of-payment flow and improve customer-facing payment wording only where needed
- Keep renewals compatible with the phase-2 contract, but do not build a full renewals workspace in this phase

Excluded:
- direct insurer integration
- full accounting or billing subsystem
- campaign or promo broadcast tools
- bulk messaging engine
- full renewals queue and quote workflow

## Current Context
Phase 1 already delivered:
- customer intake
- requirements checklist
- binary insurance document upload
- staff list/detail insurance workspace
- status tracking
- payment and renewal visibility fields
- lightweight activity history

Two important post-phase-1 alignment fixes were also made:
- the staff web save path now matches the live backend `PATCH /api/insurance/inquiries/:id/status` contract by sending only `status` and `reviewNotes`
- the mobile customer wording now matches real insurance-record timing more closely and no longer treats `approved_for_record` as canonical customer-facing status copy

This means phase 2 should not overload the narrow status patch route again. A broader workflow route should be introduced explicitly for payment and later renewal operations.

## Business Problems To Solve
- Staff need one place to see which insurance cases are unpaid, overdue, or waiting for proof verification
- Proof of payment is still too manual to review and confirm consistently
- Due dates and overdue risk need first-class visibility
- Reminder actions should be logged inside the case instead of disappearing into Messenger-only history
- Customers need clear payment-state visibility and one obvious way to upload proof of payment

## Product Direction
Phase 2 should prioritize `collections first`, not combined collections plus renewals.

Why:
- the interview pain is more urgent around unpaid balances and proof-of-payment follow-up
- the current data model already contains payment fields, upload flow, and activity history that collections can build on
- renewals will benefit from the same workflow-update and reminder patterns after collections are stable

Recommended phase ordering:
- `Phase 1`: intake, document collection, review, status tracking
- `Phase 2`: collections operations
- `Phase 3`: renewals workspace
- `Phase 4`: targeted campaigns and outreach

## Collections Model
Collections should stay inside the insurance case lifecycle rather than becoming a separate module.

The insurance inquiry remains the main record.

Collections uses:
- `status`
- `paymentStatus`
- `paymentDueAt`
- `reviewNotes`
- activity history
- uploaded proof-of-payment documents

Primary payment statuses:
- `not_required`
- `unpaid`
- `proof_submitted`
- `verifying`
- `paid`
- `overdue`

Recommended meaning:
- `unpaid`
  Payment is required and still outstanding.
- `proof_submitted`
  The customer uploaded proof and staff still need to check it.
- `verifying`
  Staff are actively reviewing the payment proof.
- `paid`
  Payment is accepted and collections follow-up is complete.
- `overdue`
  The due date passed without confirmed payment completion.

## Backend Design
### New Workflow Route
Add a live route dedicated to broader insurance workflow updates:

- `PATCH /api/insurance/inquiries/:id/workflow`

This route should exist alongside the existing narrow route:
- `PATCH /api/insurance/inquiries/:id/status`

Route split:
- `PATCH /status`
  Keep as the simple status-plus-review-notes route already aligned with the current web screen.
- `PATCH /workflow`
  Use for broader staff operations updates such as collections and later renewals.

### Workflow Payload
Recommended live fields for the new route:
- `status`
- `documentStatus`
- `paymentStatus`
- `paymentDueAt`
- `renewalStatus`
- `policyExpiryAt`
- `renewalDueAt`
- `assignedStaffId`
- `reviewNotes`

### Validation And Rules
- only `service_adviser` and `super_admin` may use the workflow route
- preserve existing status-transition rules
- allow payment metadata updates without requiring unrelated status changes
- reject invalid enum values and malformed dates
- keep the route internal-workflow only, with no insurer-side implications

### Activity Logging
Collections actions should append activity entries to the insurance case.

Recommended activity actions:
- `payment_reminder_sent`
- `payment_proof_submitted`
- `payment_verification_started`
- `payment_marked_paid`
- `payment_marked_overdue`
- `payment_due_date_updated`

### Read Model
Do not introduce a separate collections API first unless the main list route becomes too limited.

Recommended first approach:
- keep using `GET /api/insurance/inquiries`
- rely on filters for:
  - `status`
  - `paymentStatus`
  - `renewalStatus`

Optional later improvement:
- `GET /api/insurance/collections`
  only if a dedicated collections read-model becomes necessary for performance or clarity

## Staff Web Design
Phase 2 should make the staff web the primary collections operations workspace.

### Information Architecture
Recommended insurance subpages after phase 2:
- `All Insurance`
- `Collections`
- `Renewals` later

### Collections Page
Purpose:
- isolate payment follow-up work from the general insurance review list

Recommended summary cards:
- `Unpaid`
- `Proof Submitted`
- `Verifying`
- `Overdue`
- `Paid This Week`

Recommended table columns:
- inquiry ID
- customer
- vehicle
- insurance type
- processing status
- payment status
- payment due date
- days overdue
- proof uploaded
- last activity
- assigned staff
- actions

Recommended filters:
- payment status
- overdue only
- due today
- due this week
- with proof uploaded
- assigned staff
- insurance status

Recommended row actions:
- set due date
- mark unpaid
- mark verifying
- mark paid
- mark overdue
- open proof document
- log reminder sent
- add payment note

### Collections Detail
The case detail view should show a focused payment section with:
- payment status
- payment due date
- proof-of-payment attachments
- latest payment-related note
- reminder history
- payment activity timeline

### UX Rules
- unsupported workflow fields should not be editable through a route that cannot save them
- the collections page should use the broader workflow route once it exists
- the general insurance page may remain narrower if that keeps roles and workflows clearer

## Customer Mobile Design
Phase 2 mobile work should stay small and action-focused.

Recommended customer behavior:
- show payment card only when relevant
- show due date clearly when present
- show overdue state clearly
- keep proof-of-payment upload simple
- show verification outcome using customer-safe copy

Recommended payment prompts:
- `unpaid`
  Payment is still needed for this request.
- `proof_submitted`
  Your proof of payment is on file and waiting for review.
- `verifying`
  Staff are reviewing your proof of payment now.
- `paid`
  Payment has been confirmed.
- `overdue`
  This request is overdue for payment. Upload proof after payment or contact staff for help.

The customer app should not gain a complex collections form in this phase. The main customer action remains uploading proof and checking current payment state.

## Contracts And Docs
Phase 2 contract updates will likely touch:
- insurance backend contract docs
- staff web collections flow contract
- customer mobile payment follow-up contract
- insurance domain architecture doc

The docs should clearly distinguish:
- the narrow `PATCH /status` contract
- the broader `PATCH /workflow` contract

## Risks
- if the broader workflow route is not introduced, collections UX will drift out of sync with the backend again
- if collections and renewals are built together, the scope may become too broad and blur operator workflows
- if payment actions are not logged as activities, follow-up history will remain fragmented

## Recommendation
Ship collections as its own phase with this order:
- backend workflow route
- shared API/client updates
- staff web collections workspace
- small mobile payment-state polish if needed
- contracts and docs sync

Keep renewals out of the implementation scope except for preserving compatible fields in the shared workflow contract.
