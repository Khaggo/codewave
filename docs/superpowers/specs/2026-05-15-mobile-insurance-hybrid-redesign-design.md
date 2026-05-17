# Mobile Insurance Hybrid Redesign

Date: 2026-05-15
Repo: `C:\Vscode\Main\codewave`
Surface: `mobile/src/screens/InsuranceInquiryScreen.js`

## Goal

Redesign the mobile insurance experience into a cleaner, more professional, and easier-to-navigate customer flow.

The new experience should:
- feel modern and premium
- reduce long-scroll density
- prioritize the customer's current next action
- keep the bottom tab shell intact
- preserve the existing backend-driven inquiry, document, payment, renewal, and history behavior

## Product Direction

Use a hybrid structure.

- Keep the insurance tab as the entry point inside the current app shell.
- Replace the current all-in-one long page with a home-first control center.
- Split deep tasks into focused follow-on surfaces instead of stacking everything in one screen.

## Core UX Decisions

### Shell

- Keep the existing bottom tab bar unchanged.
- Redesign only the insurance tab's internal header, hierarchy, and navigation.

### Home Priority

- If there is no active insurance request, the home hero should prioritize `Start new request`.
- If there is an active request, the home hero should prioritize `Current request` and surface the best next action.

### Home Navigation

The insurance home should expose compact entry points for:
- `Request`
- `Documents`
- `Payment`
- `Renewal`
- `History`

These should feel like clear destinations, not stacked subsections of one very long page.

## Information Architecture

### 1. Insurance Home

Purpose:
- give the customer a fast understanding of current insurance state
- surface the next best action
- provide access to focused insurance tasks

Structure:
- eyebrow
- title
- one short supporting sentence
- one primary hero card
- compact action cards below

Hero card states:
- `Start new request`
  - shown when no active request exists
  - includes the selected vehicle context
  - provides a direct CTA into the request flow
- `Current request`
  - shown when an active request exists
  - highlights the current workflow state
  - promotes the most relevant next action:
    - upload documents
    - review payment
    - review renewal
    - check status

Action cards:
- `Documents`
  - show missing/complete state
  - open the documents workspace
- `Payment`
  - show payment state
  - open payment detail
- `Renewal`
  - show renewal state
  - open renewal detail
- `History`
  - show record count or empty state
  - open history detail

### 2. Request Screen

Purpose:
- keep request creation focused and lightweight

Structure:
- back/header area
- pinned vehicle context
- inquiry type selector
- concise form fields
- single primary submit action

Fields remain customer-safe and should avoid staff-facing workflow language.

### 3. Documents Screen

Purpose:
- make requirements and uploads feel like a dedicated checklist workspace

Structure:
- active request context
- required items first
- optional items second
- uploaded files clearly separated from missing items
- upload CTA

The requirements checklist should no longer dominate the main home screen.

### 4. Status Detail Screens

Purpose:
- keep payment, renewal, and history readable without turning home into a giant dashboard

Use focused detail surfaces for:
- payment
- renewal
- history

These should all follow the same pattern:
- current status first
- next action second
- supporting detail last

## Visual Direction

The redesign should keep the existing premium dark look, but make the screen feel more intentional and less crowded.

Guidelines:
- fewer competing boxed sections on the same screen
- stronger spacing and grouping
- one featured card at a time
- quieter secondary cards
- orange used as emphasis, not as the dominant color everywhere
- shorter copy and fewer repeated explanations

## Copy Direction

Copy should:
- stay operational and customer-friendly
- avoid internal or staff-only phrasing
- avoid repeated explanatory text across sections
- keep most support text to one short sentence

Examples of desired tone:
- concise
- calm
- directional
- customer-safe

## Behavior Rules

- Preserve vehicle-scoped inquiry behavior.
- Preserve remembered inquiry mapping behavior.
- Preserve existing live backend routes and workflow-derived status logic.
- Do not invent new backend states or workflow rules for the redesign.
- Compute hero state and action-card emphasis from existing inquiry state.

## Technical Direction

Keep the backend logic and most helper behavior intact, but reorganize the UI into smaller focused surfaces.

Expected implementation direction:
- keep existing insurance helper/view-model logic in `mobile/src/screens/insuranceModuleView.mjs`
- refactor `mobile/src/screens/InsuranceInquiryScreen.js` into smaller UI components or screen sections
- introduce reusable pieces for:
  - home hero card
  - compact action card
  - vehicle context strip
  - request form section
  - documents checklist/upload section
  - shared status detail panel

Navigation should move from long-form vertical stacking to focused destination-based flows inside the insurance tab experience.

## Testing Direction

Before implementation:
- update helper tests first where home-card or hero-state behavior changes

During implementation:
- add focused tests for:
  - hero-state selection
  - action-card content
  - state-driven CTA behavior

After implementation:
- verify in the live Expo app, not just via helper tests

## Non-Goals

This redesign should not:
- replace the bottom tab shell
- add new backend workflow states
- expose staff-only insurance workflow detail to customers
- broaden scope into unrelated mobile modules

## Success Criteria

The redesign is successful when:
- the insurance home no longer feels like a long all-in-one page
- the current best action is obvious at first glance
- request creation feels focused
- documents feel easier to manage
- payment, renewal, and history feel simpler to access and understand
- the screen looks more modern, professional, and easier to navigate than the current version
