# Service Flow Workspaces Redesign

## Goal

Redesign the `Job Orders`, `QA Audit`, and `Invoices & Orders` web workspaces so they feel like cleaner, more professional, queue-first operational screens that align with the real service flow described in the interview.

The redesigned workspaces should:

- reflect the actual order of work across service execution, release review, and financial completion
- reduce dashboard clutter and bulky explanation blocks
- make the main queue the primary focus of each page
- move details and actions below the queue so the table/list stays readable
- keep the modules logically connected without forcing loud “next step” banners everywhere

This redesign should stay aligned with the recent insurance and intake cleanup work on the real local app at `http://127.0.0.1:3002`.

## Product Position

These three workspaces are already functionally connected, but their UI should express that connection more clearly and more calmly.

They should be treated as three specialized stages of one service pipeline:

- **Job Orders**
  - active execution workspace
  - technician assignment
  - progress capture
  - evidence capture
  - finalize readiness

- **QA Audit**
  - release decision workspace
  - quality gate review
  - block / pass / override handling
  - pre-release verification

- **Invoices & Orders**
  - completion and payment workspace
  - invoice readiness
  - payment-entry review
  - record completion
  - linked order visibility where relevant

This means the pages should feel connected in workflow logic, but still remain separate and specialized operational screens.

## Scope

This redesign covers:

- the real root web app on the local `3002` system
- `JobOrderWorkbench.js`
- `QAAuditWorkspace.js`
- `InvoiceOrderManagementWorkspace.js`
- helper/view copy cleanup in related `.mjs` files when needed
- layout, labels, queue structure, section ordering, and supporting action placement

This redesign does **not** aim to:

- merge the three modules into one giant board
- rebuild backend contracts for these modules unless a small frontend-safe adjustment is truly required
- add new unrelated analytics dashboards
- redesign booking or intake in this spec
- add new communication channels

## Interview Alignment

The interview context suggests staff need operational workspaces that reflect the actual path of work, not pages overloaded with secondary explanation and dashboard noise.

Relevant alignment points:

- staff follow a practical flow from intake to execution, review, and completion
- workspaces should help the staff see what needs action now
- customer/service concerns should not get buried behind decorative analytics
- release decisions and financial completion should feel like natural downstream stages of execution

So the redesign should make each page answer one clear operational question:

- **Job Orders**: what work is actively being executed now?
- **QA Audit**: what work is waiting for release review?
- **Invoices & Orders**: what work is ready for invoice/payment completion?

## Shared Redesign Rules

All three modules should follow the same structural principles.

### Queue First

Each page should center on one main queue first.

That means:

1. compact page header
2. lean summary indicators only if they help
3. filter row
4. main queue/table
5. selected-row detail below the queue
6. supporting actions below the detail

### Detail Below the Queue

The detail/action area should open **below** the queue instead of side-by-side with it.

This keeps:

- more visible table width
- easier row scanning
- better visual hierarchy
- less cramped columns

### Less Copy, Less Dashboard Clutter

Each workspace should:

- reduce intro copy
- remove helper panels that repeat obvious information
- use shorter section descriptions
- avoid many equal-weight cards before the real work list

### Subtle Workflow Connection

The pages should acknowledge their place in the service flow, but without heavy tutorial language or loud “NEXT STEP” banners.

Use only:

- clearer titles
- better status language
- narrower section purpose
- cleaner stage-specific filtering

## Job Orders Redesign

### Role in the Flow

This page should feel like:

`active workshop execution`

It should focus on:

- active job-order queue
- technician assignments
- progress updates
- evidence/photos
- blockers
- readiness for QA

### What to Keep

Keep:

- work queue
- selected job detail
- status updates
- assignment updates
- progress-note entry
- evidence/photo entry
- finalize / payment-prep actions where valid

### What to Reduce or Remove

Reduce:

- oversized hero and explainer copy
- too many competing summary panels
- duplicated operational hints
- anything that makes execution feel secondary to presentation

### Recommended Layout

1. compact page header
2. lean execution summary indicators if useful
3. filter row
4. main job-order queue
5. selected job-order detail below
6. action sections below detail:
   - Overview
   - Assignments
   - Progress
   - Evidence
   - Finalize

### Recommended Queue Fields

- job order id
- customer / vehicle
- service summary
- assigned technician
- execution phase
- current status
- target date
- blocker / warning if present

## QA Audit Redesign

### Role in the Flow

This page should feel like:

`release decision workspace`

It should focus on:

- work waiting for QA review
- blocking findings
- review-needed findings
- pass / block / override decision
- release protection

### What to Keep

Keep:

- QA queue
- quality gate summary
- findings list
- verdict action
- override action for allowed roles
- pre-check summary if it helps the decision

### What to Reduce or Remove

Reduce:

- long descriptive copy before the queue
- too many summary cards that compete with the queue
- oversized secondary metadata panels
- anything that hides what work is actually waiting for audit

### Recommended Layout

1. compact page header
2. filter row
3. main QA queue
4. selected audit detail below
5. findings and release actions below detail:
   - Overview
   - Pre-Check Summary
   - Blocking Findings
   - Review Needed
   - Verdict / Override
   - History

### Recommended Queue Fields

- job order id
- customer / vehicle
- QA state
- blocking findings count
- review-needed findings count
- latest updated
- override present yes/no

## Invoices & Orders Redesign

### Role in the Flow

This page should feel like:

`completion and payment workspace`

It should focus on:

- invoice-ready work
- payment status
- record completion
- payment entries
- linked order visibility where relevant

### What to Keep

Keep:

- invoice-ready queue or record queue
- payment entries
- invoice/PDF state
- ecommerce/service order linkage when relevant
- aging/unpaid indicators if they actually help action

### What to Reduce or Remove

Reduce:

- metric overload at the top
- route/technical info in the main workspace
- duplicated load-status narration
- oversized “finance dashboard” framing before the actual queue

### Recommended Layout

1. compact page header
2. filter row
3. main invoice/order queue
4. selected record detail below
5. payment and invoice sections below detail:
   - Overview
   - Invoice
   - Payment Entries
   - Linked Orders
   - History

### Recommended Queue Fields

- job order / record id
- customer / vehicle
- invoice status
- payment status
- total amount
- due / aging indicator when relevant
- linked ecommerce/service order state

## UI/UX Cleanup Priorities

Implementation should prioritize:

1. convert each page into a queue-first layout
2. move detail/actions below the queue
3. reduce bulky helper text and explanation blocks
4. simplify cards and remove competing sections
5. tighten labels, empty states, and action emphasis
6. visually align all three modules with the recent insurance cleanup

## Expected Result

After redesign:

- `Job Orders` should feel like active execution
- `QA Audit` should feel like release review
- `Invoices & Orders` should feel like financial completion

Together they should read as a cleaner service pipeline without forcing extra visible workflow coaching.

The result should be:

- easier to scan
- easier to act on
- more visually consistent
- more professional
- more aligned with the interview-driven service flow
