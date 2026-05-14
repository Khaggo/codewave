# 2026-05-14 Insurance Module Phase 3 Renewals Design

## Goal
Add a focused renewals operations layer to the insurance module so staff can track expiring policies, create manual renewal follow-ups before a customer submits anything new, manage renewal progress by stage, and keep completed renewals out of the active queue.

## Scope
Included:
- Add a staff-managed renewals workspace inside the insurance module
- Support manual renewal follow-up creation with an estimated renewal target date
- Expand the renewal workflow model so staff can manage quote-prep and customer-response stages
- Add time-window driven renewal queue behavior for due-soon and overdue work
- Keep customer mobile renewal visibility lightweight and customer-safe
- Reuse the existing workflow-update route for renewal metadata and stage changes after a renewal item exists

Excluded:
- campaign or promo broadcasting
- mass automated reminder engine
- insurer-side integration
- full collections-plus-renewals merge screen
- deep policy issuance or accounting subsystem

## Current Context
Phase 1 already delivered:
- customer insurance intake
- document collection
- staff review workspace
- general status tracking
- payment and renewal metadata fields

Phase 2 already delivered:
- broad `PATCH /api/insurance/inquiries/:id/workflow` route for staff workflow metadata
- staff collections workspace
- payment proof follow-up and overdue handling
- customer-safe payment visibility

This means phase 3 does not need a brand-new insurance lifecycle. It can build on the existing inquiry record, workflow route, and shared client helpers.

Two important current limitations remain:
- there is no dedicated renewal queue in the web staff experience
- the live renewal enum is still too narrow for the approved staff workflow because it does not include `quote_preparing` or `cancelled`

## Business Problems To Solve
- Staff need one place to see which customers are due for renewal soon
- Renewal work often starts before the customer submits a new inquiry, so staff need manual follow-up creation
- Due dates and expiry risk need to be visible by urgency, not only by generic workflow status
- Staff need to track renewal quote preparation and customer response separately
- Renewed items should stop cluttering the active queue once work is complete
- Customers need a simple reminder and a clear way to express renewal interest without being forced into an admin workflow

## Product Direction
Phase 3 should prioritize `renewal queue first`.

Why:
- renewals are deadline-driven and operationally easy to miss without a dedicated queue
- the interview and later product direction both point to manual follow-up and reminders as recurring business needs
- collections already established the pattern of using a focused staff subpage on top of the shared insurance case

Recommended phase ordering:
- `Phase 1`: intake, document collection, review, status tracking
- `Phase 2`: collections operations
- `Phase 3`: renewals workspace
- `Phase 4`: targeted campaigns and outreach

## Renewal Model
Renewals should stay inside the insurance case lifecycle rather than becoming a separate top-level module.

The insurance inquiry remains the main record.

Renewals use:
- `purpose`
- `status`
- `renewalStatus`
- `policyExpiryAt`
- `renewalDueAt`
- `assignedStaffId`
- activity history

### Queue Strategy
The active queue should be driven by time windows first, with renewal stage as a secondary filter.

Recommended default windows:
- `Due in 30 Days`
- `Due in 15 Days`
- `Due in 7 Days`
- `Overdue`

### Renewal Stages
Recommended renewal statuses:
- `not_applicable`
- `upcoming`
- `quote_preparing`
- `quoted`
- `awaiting_customer`
- `renewed`
- `expired`
- `cancelled`

Recommended meaning:
- `upcoming`
  The case is in the renewal queue and still needs staff action.
- `quote_preparing`
  Staff are preparing or updating the renewal quote.
- `quoted`
  The customer has been given a renewal quote.
- `awaiting_customer`
  Staff are waiting for the customer to respond or confirm.
- `renewed`
  The renewal was completed and should move to completed history.
- `expired`
  The renewal window passed without completion.
- `cancelled`
  Staff intentionally ended the follow-up.

### Linking Rule
Renewal work should be linked to:
- the existing insurance inquiry or record when available
- otherwise the vehicle, with the customer and assigned staff still visible in the queue

### Manual Follow-Ups
Staff must be allowed to create manual renewal follow-ups before a customer opens a new case.

Required minimum:
- customer
- vehicle
- inquiry type
- subject
- description
- estimated renewal target date

Optional:
- policy expiry date
- provider name
- policy number
- assigned staff
- notes

Recommended default values for a manual follow-up:
- `purpose: renewal`
- `status: for_renewal`
- `renewalStatus: upcoming`
- `paymentStatus: not_required`

## Backend Design
### New Manual Renewal Creation Route
Add a staff-only route dedicated to manual renewal follow-ups:

- `POST /api/insurance/renewals/follow-ups`

Purpose:
- create a renewal-focused insurance inquiry without forcing the customer intake route to carry staff-only renewal planning fields

Recommended payload:
- `userId`
- `vehicleId`
- `inquiryType`
- `subject`
- `description`
- `renewalDueAt` required
- `policyExpiryAt` optional
- `providerName` optional
- `policyNumber` optional
- `assignedStaffId` optional
- `notes` optional

Recommended behavior:
- only `service_adviser` and `super_admin` may create manual renewal follow-ups
- set `purpose` to `renewal`
- set `status` to `for_renewal`
- set `renewalStatus` to `upcoming`
- append a `renewal_follow_up_created` activity entry

### Existing Workflow Route
Keep using the existing broad route for renewal updates after a case exists:

- `PATCH /api/insurance/inquiries/:id/workflow`

This route should handle:
- `status`
- `renewalStatus`
- `policyExpiryAt`
- `renewalDueAt`
- `assignedStaffId`
- `reviewNotes`

### Renewal Enum Expansion
Expand the live renewal enum to match the approved queue workflow.

Current live enum is too narrow.

Required additions:
- `quote_preparing`
- `cancelled`

### Renewal Activity Logging
Renewal actions should append activity entries to the insurance case.

Recommended activity actions:
- `renewal_follow_up_created`
- `renewal_quote_preparing`
- `renewal_quoted`
- `renewal_awaiting_customer`
- `renewal_completed`
- `renewal_expired`
- `renewal_cancelled`
- `renewal_due_date_updated`

### Read Model
Do not introduce a separate renewals API first unless the main list route becomes too limited.

Recommended first approach:
- keep using `GET /api/insurance/inquiries`
- extend it with `purpose` filtering so staff can fetch renewal work cleanly
- let the renewals web helper compute time windows from `renewalDueAt` first, with fallback to `policyExpiryAt`

Optional later improvement:
- `GET /api/insurance/renewals`
  only if a dedicated renewal read-model becomes necessary for performance or clarity

## Staff Web Design
Phase 3 should make the staff web the primary renewals operations workspace.

### Information Architecture
Recommended insurance subpages after phase 3:
- `All Insurance`
- `Collections`
- `Renewals`

### Renewals Page
Purpose:
- isolate renewal work from the general review list and from collections

Recommended summary cards:
- `Due in 30 Days`
- `Due in 15 Days`
- `Due in 7 Days`
- `Overdue`
- `Awaiting Customer`
- `Renewed This Month`

Recommended subviews:
- `Active Renewals`
- `Renewed / History`
- `Manual Follow-ups`

Recommended table columns:
- renewal or inquiry ID
- customer
- vehicle
- insurance type
- policy expiry date
- renewal target date
- time window
- renewal stage
- assigned staff
- last activity
- actions

Recommended filters:
- time window
- renewal stage
- assigned staff
- insurance type
- manual follow-up only
- overdue only

Recommended row actions:
- create manual follow-up
- set or update renewal target date
- mark quote preparing
- mark quoted
- mark awaiting customer
- mark renewed
- mark expired
- mark cancelled
- add renewal note

### Renewals Detail
The case detail view should show a focused renewal section with:
- current renewal stage
- policy expiry date
- renewal target date
- days remaining or overdue
- assigned staff
- quote and follow-up notes
- renewal activity timeline

### UX Rules
- the main queue should default to urgency by time window, not to workflow stage
- `renewed`, `expired`, and `cancelled` items should not stay in the active queue
- manual follow-up creation must require at least a target date so every item can land in a window

## Customer Mobile Design
Phase 3 mobile work should stay small and customer-safe.

Recommended customer behavior:
- show renewal reminder only when relevant
- show policy expiry or renewal target date clearly when available
- show a simple renewal status message
- allow `Request Renewal Quote` or equivalent renewal-interest action

Recommended customer prompts:
- `upcoming`
  Renewal is coming up soon. You can request a quote or wait for staff follow-up.
- `quote_preparing`
  Staff are preparing your renewal quote.
- `quoted`
  Your renewal quote is ready for review.
- `awaiting_customer`
  Staff are waiting for your response to continue the renewal.
- `renewed`
  Your renewal was completed successfully.
- `expired`
  The renewal window has passed. Contact staff if you still need help.

The customer app should not gain a complex renewal-management form in this phase.

## Contracts And Docs
Phase 3 contract updates will likely touch:
- insurance backend contract docs
- staff web renewals flow contract
- customer mobile renewal reminder contract
- insurance domain architecture doc

The docs should clearly distinguish:
- manual renewal follow-up creation
- renewal workflow updates on existing cases
- active renewal queue versus renewed history

## Risks
- if manual renewal follow-ups are forced through the customer intake route, the contract will become messy and role boundaries will blur
- if the live enum is not expanded, the approved renewal stage design cannot be represented honestly
- if renewed items remain in the active queue, overdue and due-soon work will be harder to triage
- if the list route cannot filter down to renewal work, staff pages may fetch too much unrelated data and drift into brittle client-side filtering

## Recommendation
Ship renewals as its own phase with this order:
- backend renewal enum and manual follow-up route
- shared API and client updates
- staff web renewals workspace
- small mobile renewal reminder and wording polish
- contracts and docs sync

Keep campaigns and mass outreach out of the implementation scope until the renewal queue is stable.
