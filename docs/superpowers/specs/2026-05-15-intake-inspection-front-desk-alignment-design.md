# Intake Inspection Front-Desk Alignment

## Goal

Align the intake inspection workspace with the real front-desk process described in the interview.

The current screen behaves mostly like a technical inspection form. The redesigned screen should behave like a guided front-desk intake flow that:

- captures who arrived and why
- classifies the visit early
- checks the basic requirements the customer brought
- always records arrival condition
- routes the staff member to the right next workspace after save

This redesign should also improve UI/UX quality so the page feels clearer, lighter, and more professional, consistent with the recent insurance workspace cleanup.

## Product Position

The intake inspection page should become the **first front-desk intake screen** for both regular service and insurance-related arrivals.

However, it should **not** absorb the deeper insurance workflow.

Responsibilities should be split like this:

- **Intake inspection workspace**
  - arrival capture
  - customer and vehicle matching
  - visit classification
  - concern capture
  - requirements check
  - arrival condition inspection
  - routing to the next module

- **Insurance module**
  - insurance inquiry management
  - claims workflow
  - document follow-up
  - payment follow-up
  - renewals
  - reminders and broadcasts

This keeps intake as the reception entry point and insurance as the specialized operational workflow.

## Scope

This redesign covers:

- the real root intake inspection screen on the local `3002` system
- front-desk service and insurance arrival handling
- form structure, labels, conditional behavior, and routing
- UI/UX cleanup consistent with the recent insurance polish work

This redesign does **not** aim to:

- rebuild the full insurance module inside intake
- replace the booking system
- redesign unrelated service, QA, or invoicing workspaces
- add email or SMS communication

## Real-World Flow to Reflect

The interview indicates that staff should not begin with technical inspection alone.

The practical flow is:

1. customer arrives
2. staff greets and identifies the concern
3. staff determines whether the visit is regular service, insurance-related, complaint/back-job, or inspection-only
4. staff checks what requirements or documents the customer already has
5. staff records the arrival condition of the vehicle
6. staff routes the case to the next operational flow

The redesigned screen should follow that order.

## Recommended Page Structure

The page should become a top-to-bottom guided flow with short section titles and minimal explanation text.

### 1. Arrival

Purpose:
- establish whether this is a walk-in or booking-backed arrival
- identify the customer, vehicle, and receiving staff member

Recommended fields:
- arrival type
  - walk-in
  - with booking
- customer
- vehicle
- booking reference when available
- received by staff

Behavior:
- walk-in remains a first-class path
- booking is optional for walk-ins
- booking becomes required or strongly suggested when arrival type is booking-based

### 2. Visit Type

Purpose:
- classify the visit immediately so the rest of the page becomes more understandable

Recommended fields:
- visit type
  - regular service
  - insurance-related
  - back-job / complaint
  - inspection only
- repeat visit yes/no
- optional urgency flag

Behavior:
- this section drives later save actions and some conditional requirement prompts

### 3. Customer Concern

Purpose:
- capture what the customer actually needs before inspection details begin

Recommended fields:
- reason for visit
- requested service summary
- complaint / back-job note when applicable

Behavior:
- this should stay short and practical
- it should read like a reception summary, not a narrative report

### 4. Requirements

Purpose:
- confirm what the customer brought at intake

Recommended fields:
- booking found
- OR/CR present
- valid ID present
- old policy present
- supporting documents present
- missing requirements note

Behavior:
- requirements stay lightweight
- insurance-related visits show the insurance-relevant requirement rows
- regular service visits keep this simpler

### 5. Arrival Inspection

Purpose:
- always capture the physical arrival condition of the vehicle

This section should remain mandatory and always visible.

Keep:
- odometer / mileage
- fuel level
- condition checklist
- damage area tags
- arrival notes
- photo slots

Behavior:
- the section should be visually cleaner and more guided than the current version
- it should feel like the second half of intake, not the entire identity of the page

### 6. Inspection History

Purpose:
- show prior intake or condition records for the same vehicle

Behavior:
- display recent history in a compact summary-first format
- allow deeper inspection review only when needed
- support staff decisions without taking over the page

### 7. Next Step

Purpose:
- make the next workflow obvious after saving

Recommended save actions:
- `Save Intake`
- `Save and Continue to Service`
- `Save and Continue to Insurance`
- `Save as Inspection Only`

Behavior:
- only show the strongest next action for the current visit type
- still keep a plain save option available

## Visit-Type Routing Rules

### Regular Service

After save:
- stay in the service flow
- expose the service-oriented next step

Recommended primary action:
- `Save and Continue to Service`

### Insurance-Related

After save:
- keep the arrival context and inspection record
- route staff toward the insurance module

Recommended primary action:
- `Save and Continue to Insurance`

Recommended follow-through:
- create or open the linked insurance inquiry

### Back-Job / Complaint

After save:
- mark for priority handling
- retain complaint-specific notes

Recommended primary action:
- `Save and Flag Complaint`
or
- `Save and Continue`

The exact copy can be refined during implementation.

### Inspection Only

After save:
- store the intake record
- no forced service or insurance handoff

Recommended primary action:
- `Save Inspection`

## Data Additions

Recommended new intake fields:

- `arrivalType`
- `visitType`
- `reasonForVisit`
- `requestedServiceSummary`
- `isRepeatVisit`
- `urgencyFlag`
- `requirementsChecklist`
- `missingRequirementsNote`
- `nextRoute`

These should be added only to the extent supported by the current frontend/backend contract or staged carefully if backend changes are needed.

## Conditional Behavior

The arrival inspection remains always shown, but several parts of the page should still adapt:

- if visit type is insurance-related
  - show insurance-relevant requirements
  - show the insurance continuation action

- if visit type is back-job / complaint
  - show complaint-specific note emphasis
  - surface a priority handling cue

- if arrival type is booking-based
  - booking field becomes required or strongly encouraged

- if arrival type is walk-in
  - booking remains optional

## UI/UX Direction

This redesign should follow the same usability-first cleanup approach as the insurance screens:

- less filler text
- clearer top-to-bottom flow
- fewer competing cards
- cleaner sections
- shorter labels
- clearer next-step buttons

Specific cleanup goals:

- reduce “system-first” language
- avoid large explanation blocks
- keep section subtitles short
- make required actions more obvious
- keep form density manageable
- make the page look like a front-desk workflow, not a raw database form

## What to Reduce or Remove

The current screen likely overemphasizes technical or system fields too early.

The redesign should reduce or remove:

- long helper copy
- duplicate status explanation blocks
- early emphasis on backend-like state over customer context
- layouts that make arrival capture and concern capture feel secondary to inspection

## Technical Direction

Implementation should likely reuse the current intake workspace where possible, but reorder the form and adjust the draft model around the new intake-first structure.

Expected work areas:

- intake workspace screen layout
- intake workspace view helper
- intake workspace form helper/state
- save action handling
- route handoff behavior to insurance or service flow
- tests for visit classification, routing behavior, and copy/layout simplification

## Success Criteria

The redesign is successful when:

- staff can start from arrival context instead of raw inspection details
- walk-ins are supported cleanly
- service and insurance arrivals are both handled naturally
- concern capture happens before condition capture
- requirement checking is lightweight but useful
- arrival condition is always recorded
- next-step routing is obvious after save
- the screen feels cleaner, lighter, and more professional

## Recommendation

Treat this as a front-desk intake redesign, not a minor form tweak.

The right mental model is:

- **Intake = reception and triage**
- **Insurance = specialized follow-up**
- **Inspection = always-recorded arrival evidence**

That model fits the interview, keeps modules cleanly separated, and should produce a much more usable intake experience.
