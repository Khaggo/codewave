# Insurance Demo Seed Design

## Goal

Create a reusable local seed script for the real updated system that populates a full insurance demo dataset for manual QA and product review.

The seed should support:

- web staff/admin testing
- mobile customer testing
- repeatable refresh of the same demo scenarios
- safe cleanup of prior demo records without touching normal local data

This seed is for the live local app DB behind `http://127.0.0.1:3002`, not just automated test fixtures.

## Scope

The seed covers the insurance module and the linked records needed to make it feel real in both web and mobile.

Included:

- demo customer accounts
- owned demo vehicles
- insurance inquiries across all implemented phases
- insurance documents where useful
- insurance activity history
- in-app reminder and broadcast notification history
- customer-visible insurance history for completed cases
- printed output with credentials and scenario notes

Not included:

- bookings/job orders unrelated to insurance
- email or SMS notification channels
- randomized data generation
- permanent fixture changes to non-demo local data

## Design Principles

The seed should be:

- repeatable
- safe
- readable
- realistic enough for demos
- tagged so cleanup is precise

The script should use a dedicated demo tag or namespace and only delete or replace records that belong to that tagged set.

## Demo Dataset Strategy

Use multiple customers with different insurance states instead of one customer with many records.

Why:

- better queue variety
- clearer staff-side filtering
- easier mobile login testing
- more realistic reminders and broadcasts

The seed should create one clear scenario per customer, with a small number of supporting secondary records where helpful.

## Demo Scenarios

### Customer 1: review queue

Purpose:

- basic insurance queue visibility
- detail panel review
- workflow status update testing

Records:

- one `submitted` inquiry
- one `under_review` inquiry

### Customer 2: missing documents

Purpose:

- required document checklist behavior
- document upload prompts
- missing-document reminders

Records:

- one `needs_documents` inquiry
- incomplete required documents

### Customer 3: payment follow-up

Purpose:

- collections workspace review
- proof-submitted workflow
- manual reminder actions

Records:

- one `payment_pending` inquiry
- one inquiry with `paymentStatus = proof_submitted`
- proof-of-payment document on the proof-submitted case

### Customer 4: overdue payment

Purpose:

- overdue queue filters
- urgency badges
- payment reminder testing

Records:

- one `payment_pending` inquiry
- `paymentStatus = overdue`
- overdue due date

### Customer 5: renewal workflow

Purpose:

- renewals queue
- renewal timing
- awaiting-customer follow-up
- renewal-related broadcasts

Records:

- one `for_renewal` inquiry
- one inquiry with `renewalStatus = awaiting_customer`
- renewal due and/or policy expiry metadata

### Customer 6: completed history

Purpose:

- customer history view
- staff visibility of non-active items
- vehicle insurance records after closure

Records:

- one `active` or `closed` insurance record suitable for history
- linked customer-safe history visibility

## Linked Data Requirements

Each demo customer should have:

- a unique login email
- a known password
- an owned vehicle
- at least one insurance inquiry

Where relevant, inquiries should also include:

- provider name
- policy number
- payment due date
- renewal due date
- policy expiry date
- assigned staff id if supported
- review notes/activity notes

## Reminder and Broadcast Coverage

The demo data should include evidence of:

- workflow-triggered in-app reminders
- manual reminder history
- custom broadcast history

This does not require a huge feed. A few representative entries are enough as long as they are visible in the product and tied to demo cases.

Recommended examples:

- missing documents reminder
- payment overdue reminder
- renewal follow-up reminder
- one custom insurance broadcast tied to active cases

## Reset/Replace Behavior

The script should behave as a demo reset, not a pure append.

Expected behavior:

1. find all demo-tagged records
2. remove or replace only those records
3. recreate the known demo set
4. print the final seeded summary

This should be safe to run repeatedly before demos.

## Tagging Strategy

All demo data should be tagged in a consistent and easy-to-clean way.

Recommended approaches:

- email prefix such as `demo.insurance.*@example.com`
- inquiry subject prefixes such as `DEMO_INS_`
- notes/activity tags such as `demo.insurance.seed`

Use whichever combination is easiest to query safely in the current schema.

## Script Placement

The implementation should be a reusable script in the backend scripts area so it can run against the local DB directly.

Recommended location:

- `backend/scripts/seed-insurance-demo.ts`

The script should follow the style of the existing local scripts rather than inventing a new runner pattern.

## Output

After a successful run, print:

- each demo customer email
- shared or per-user password
- linked vehicle label
- main inquiry ids and statuses
- short note for what each customer is useful for testing

This output should be concise and copyable.

## Manual QA Checklist Output

After implementation, provide a separate user-facing checklist grouped by phase:

- Phase 1: insurance queue and workflow basics
- Phase 2: collections
- Phase 3: renewals
- Phase 4A: automatic in-app reminders
- Phase 4B: manual reminders
- Phase 4C: custom broadcasts
- mobile customer verification

This checklist does not need to be generated by the script itself; it can be delivered after the seed is implemented.

## Safety Constraints

The seed must not:

- wipe unrelated local users
- wipe unrelated insurance records
- mutate production-like local data outside the demo tag set

If required environment variables or DB access are missing, the script should fail loudly with a clear message instead of partially seeding.

## Success Criteria

The seed is successful when:

- it can be rerun safely
- the insurance web queue becomes meaningfully populated
- mobile customer accounts can log in and see matching scenarios
- reminders and broadcast history are visible on representative cases
- the demo set supports end-to-end manual review of all implemented insurance phases
