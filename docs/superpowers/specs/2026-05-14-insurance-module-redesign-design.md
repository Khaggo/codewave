# 2026-05-14 Insurance Module Redesign Design

## Goal
Replace the current placeholder or incomplete insurance experiences on staff web and customer mobile with one coherent insurance lifecycle module that supports intake, document collection, review, collections, renewals, and customer follow-up.

## Scope
Included:
- Replace the current web admin insurance workspace content with a proper operations-focused module
- Replace the current customer mobile insurance content with a proper self-service module
- Center the redesign on one shared insurance lifecycle used by both surfaces
- Support customer document submission, status tracking, proof-of-payment submission, renewal reminders, and insurance history
- Support staff review, document verification, status progression, collections follow-up, renewals, notes, and customer outreach
- Define a phased rollout so processing ships first and collections, renewals, and campaigns layer on cleanly

Excluded:
- Direct insurer integration
- Automatic policy issuance
- Automatic approval from insurance providers
- Full accounting or billing subsystem
- Free-form chat as a required MVP dependency

## Current Context
The repo already has an insurance backend domain with inquiries, documents, statuses, records, and customer/staff API helpers. The current mobile screen already supports inquiry creation and document reference attachment, while the current web screen already supports adviser/admin review and status updates. The redesign should build on those existing domain boundaries, but the current screen content should be treated as replaceable because the flows are incomplete and do not yet reflect the intended business process from the interview.

## Business Problems To Solve
- Customers and staff currently rely too heavily on manual chat-based follow-up
- Document collection is incomplete, inconsistent, and hard to double-check
- Staff need a centralized way to see what is new, missing documents, unpaid, or nearing renewal
- Customers need a simpler way to start an insurance request without waiting for manual back-and-forth
- Proof of payment and renewal follow-up need a systemized flow instead of Messenger-only coordination
- The business wants targeted reminders and product outreach, but only after the core operational process is reliable

## Product Direction
Use one insurance module with three connected subflows:
- `Processing`: inquiry intake, documents, review, quotation/approval tracking
- `Collections and Renewals`: unpaid follow-up, proof of payment, due dates, renewal reminders
- `Customer Communication`: missing-document alerts, status updates, renewal notices, optional promos

The recommendation is a balanced lifecycle approach with phased rollout:
- `Phase 1`: intake, documents, review, status tracking
- `Phase 2`: collections and renewals
- `Phase 3`: targeted campaigns and promotional outreach

## Shared Lifecycle
Both web and mobile should operate on one shared case lifecycle.

Core processing statuses:
- `draft`
- `submitted`
- `needs_documents`
- `under_review`
- `for_approval`
- `approved`
- `payment_pending`
- `active`
- `for_renewal`
- `closed`
- `rejected`
- `cancelled`

Supporting status dimensions should stay separate from the main processing status.

Document status:
- `complete`
- `incomplete`
- `under_verification`
- `rejected`

Payment status:
- `not_required`
- `unpaid`
- `proof_submitted`
- `verifying`
- `paid`
- `overdue`

Renewal status:
- `not_applicable`
- `upcoming`
- `quoted`
- `awaiting_customer`
- `renewed`
- `expired`

This avoids overloading one field with unrelated meanings and keeps web-admin operations clearer.

## Web Admin Design
The web admin insurance module should behave like an operations workspace, not a simple status board.

### Primary View Model
Use a CRM-style table/list with filters as the primary working surface. A board-style summary can exist later as a secondary view, but should not replace the table because insurance operations require dense filtering, sorting, and follow-up management.

### Page Structure
Recommended subpages inside the insurance module:
- `Dashboard`
- `All Insurance`
- `Insurance Detail`
- `Collections`
- `Renewals`
- `Campaigns`

### Dashboard
Purpose:
- give staff a daily view of workload and urgency

Recommended summary cards:
- `New Inquiries`
- `Needs Documents`
- `Under Review`
- `Payment Pending`
- `For Renewal`
- `Overdue Follow-up`
- `Closed This Week`

Recommended quick panels:
- `Needs Attention Today`
- `Unpaid Accounts`
- `Renewals Due In 7/15/30 Days`

### All Insurance
Purpose:
- serve as the main working list for staff and admin

Recommended columns:
- inquiry or policy ID
- customer
- vehicle
- insurance type
- purpose
- processing status
- document completeness
- payment status
- renewal due date
- last activity
- assigned staff
- actions

Recommended filters:
- status
- payment status
- insurance type
- purpose
- renewal window
- missing documents
- assigned staff
- created date
- updated date

Recommended row actions:
- view details
- update status
- request documents
- mark payment pending
- mark paid
- send reminder
- flag for renewal follow-up

### Insurance Detail
Purpose:
- serve as the full case workspace

Recommended tabs:
- `Overview`
- `Documents`
- `Timeline`
- `Payment`
- `Renewal`
- `Notes and Activity`

`Overview` should show:
- customer info
- vehicle info
- insurance type
- purpose
- current status
- assigned staff
- next required action

`Documents` should show:
- uploaded files
- document type
- upload date
- readable or unreadable state
- approved or rejected state
- missing required-file checklist

`Timeline` should show:
- submitted
- reviewed
- documents requested
- quote prepared
- payment requested
- payment verified
- completed
- renewal flagged

`Payment` should show:
- amount due
- due date
- proof of payment
- payment verification state
- verified by
- verified date

`Renewal` should show:
- policy expiry
- reminder schedule
- renewal state
- renewal quote requested
- renewal follow-up notes

`Notes and Activity` should show:
- internal notes
- reminders sent
- status changes
- staff actions log

### Collections
Purpose:
- isolate unpaid and proof-of-payment follow-up work

Recommended fields:
- customer
- inquiry or policy ID
- amount due
- due date
- days overdue
- proof submitted
- last reminder sent
- action

### Renewals
Purpose:
- track expiring and renewable cases

Recommended fields:
- customer
- vehicle
- policy expiry date
- days remaining
- renewal stage
- quoted state
- customer responded state
- action

### Campaigns
Purpose:
- enable targeted outreach after core operations are stable

Recommended customer segments:
- expiring soon
- previous insurance customers
- unpaid but active customers
- customers with completed insurance transactions

Recommended uses:
- renewal reminders
- new product promotions
- service offers

## Customer Mobile Design
The customer mobile insurance module should behave like a self-service insurance assistant, not just a raw upload form.

### Screen Structure
Recommended screens:
- `Insurance Home`
- `Start Insurance Request`
- `Requirements Checklist`
- `Upload Documents`
- `Track Status`
- `Payment`
- `Renewal`
- `Insurance History`

### Insurance Home
Recommended action cards:
- `Start New Request`
- `My Active Request`
- `Upload Documents`
- `Payment`
- `Renewal Reminder`
- `History`

This keeps the module action-oriented and reduces confusion for customers who are not familiar with insurance workflows.

### Start Insurance Request
Recommended fields:
- select vehicle
- insurance type
- purpose
- provider name if known
- policy number if available
- short concern or description

The intake should prioritize speed. Customers should be able to start a case with minimal friction, then complete requirements afterward.

### Requirements Checklist
After submission, the app should show:
- required documents
- optional documents
- missing items
- upload now or later paths

This checklist is a core feature, not a nice-to-have, because missing documents were one of the main operational problems in the interview.

### Upload Documents
Recommended document categories:
- OR/CR
- old policy
- valid ID
- police report
- damage photos
- estimate or quotation copy
- proof of payment
- other supporting document

Recommended behaviors:
- support PDF and image upload
- show required versus optional categories
- show uploaded state per file
- support re-upload for rejected or unreadable files
- show a staff note when a file is unclear or incomplete

### Track Status
Show a simple customer-safe timeline using the shared processing states. Each step should include:
- what the status means
- the latest update date
- what the customer needs to do next

Customer-facing copy must stay plain-language even if internal staff terminology is more technical.

### Payment
Recommended content:
- amount due
- payment instructions
- upload proof of payment
- proof verification status
- admin note if proof is invalid or incomplete

### Renewal
Recommended content:
- expiry date
- days remaining
- renew now action
- request quote action

### Insurance History
Recommended content:
- past requests
- completed policies
- prior statuses
- prior submitted records where customer access is appropriate

## Cross-Surface Rules
- Mobile should expose only customer-safe information and actions
- Web admin should own review complexity, payment tagging, renewals, and operational follow-up
- Missing-document requests from staff should immediately surface as customer action items on mobile
- Proof-of-payment submission from mobile should immediately surface in web-admin collections workflows
- Renewal reminders should be generated from the insurance record state, not from ad hoc chat threads

## Data Shape
Recommended primary entities for the redesign:

`Insurance case`
- id
- customer_id
- vehicle_id
- insurance_type
- purpose
- provider_name
- policy_number
- description
- processing_status
- document_status
- payment_status
- renewal_status
- assigned_staff_id
- submitted_at
- updated_at
- closed_at

`Insurance document`
- id
- insurance_case_id
- document_type
- file_url
- file_name
- mime_type
- uploaded_by
- uploaded_at
- verification_status
- review_note

`Payment record`
- id
- insurance_case_id
- amount_due
- due_date
- proof_file_url
- proof_submitted_at
- verification_status
- verified_by
- verified_at
- payment_note

`Renewal record`
- id
- insurance_case_id
- policy_expiry_date
- reminder_sent_at
- renewal_status
- renewal_note

`Activity log`
- id
- insurance_case_id
- actor_type
- actor_id
- action
- note
- created_at

## MVP
Recommended version-one scope:

Web admin:
- dashboard summary cards
- insurance table with filters
- detail workspace
- document review
- status updates
- payment status tagging
- renewal due tagging
- notes and activity log

Mobile:
- insurance home
- create request
- requirements checklist
- upload documents
- track status
- upload proof of payment
- renewal reminder

## Later Phases
Phase 2:
- collections subpage
- renewals subpage
- late-filing alerts
- proof-of-payment verification queue
- saved filters
- staff workload indicators

Phase 3:
- targeted campaigns
- customer segmentation for reminders and offers
- optional board-style summary view
- exports and analytics

## Risks
- The redesign can grow too broad if collections, renewals, and campaigns are all treated as launch-critical
- The current backend may support parts of the flow but still need read-model expansion for better staff list views
- File upload UX may outpace storage-service readiness if binary upload support is incomplete
- Admin and customer terminology can diverge if customer-safe copy is not defined intentionally
- Renewal and collections logic may become tangled if they are modeled as extensions of processing status instead of separate dimensions

## Risk Mitigation
- Ship processing-first MVP, then layer collections and renewals second
- Keep one shared lifecycle but maintain separate supporting status dimensions
- Use the existing backend insurance domain where possible, and add queue/read-model endpoints intentionally rather than inventing front-end-only behavior
- Treat document completeness, unreadable files, late filing, and proof-of-payment tracking as first-class requirements
- Keep admin complexity on web and customer action prompts on mobile
