# Mobile Insurance Mode Redesign

Date: 2026-05-16
Repo: `C:\Vscode\Main\codewave`
Surface: `mobile/src/screens/InsuranceInquiryScreen.js`

## Goal

Redesign the mobile insurance experience into a clearly partitioned insurance-only mode that feels professional, modern, and easy to follow.

The redesign should solve the current problems:
- the module feels like a long pile of stacked cards
- request, documents, payment, renewal, and history all compete on one screen
- the customer does not get a clear sense of where they are or what to do next
- the current UI update is not visually distinct enough from the older insurance screen

The new experience should:
- feel like entering a dedicated insurance workspace
- partition insurance tasks through an insurance-only internal nav
- remove the "mini dashboards inside dashboards" feeling
- reduce repeated framing, repeated copy, and repeated empty-state panels
- preserve the current backend-driven insurance behavior and customer-safe workflow boundaries

## Product Direction

Use an `Insurance mode` structure.

- Keep the app-wide bottom tab bar unchanged.
- Keep `Insurance` as the app entry point.
- Convert that tab into a light gateway screen instead of a full all-in-one workflow screen.
- Tapping the primary entry CTA opens a dedicated insurance-only mode with its own internal navigation.

This should feel like entering a contained insurance product inside the app, not opening a longer version of the same tab.

## Approved UX Decisions

### 1. Entry Screen Stays Lightweight

The app-level `Insurance` tab should remain as a small entry surface instead of jumping directly into a long workflow page.

It should contain:
- a strong module title
- selected vehicle context
- a concise current-state summary
- one primary CTA: `Enter insurance mode`
- optional lightweight notification or reminder summary

It should not try to hold the full insurance request form, full checklist, full status details, or full history.

### 2. Insurance Mode Gets Its Own Internal Nav

Inside insurance mode, the customer should see a dedicated insurance-only top navigation with these destinations:
- `Overview`
- `Request`
- `Docs`
- `Status`
- `History`

This nav is the main partitioning device for the redesign. It replaces the current pattern of stacking separate insurance sub-products vertically in one scroll.

### 3. Insurance Mode Opens To Overview First

The first screen inside insurance mode should be a calm overview hub.

The overview should:
- orient the user
- show the current best next action
- route into the focused full-page sections

This is preferred over opening directly into the request form because it creates a clearer sense of place and helps the module feel intentional rather than abrupt.

### 4. Task Pages Use Sectioned Layouts, Not Card Stacks

The request and documents pages should move away from repeated nested cards.

Instead, they should use:
- one clear page title
- section dividers
- cleaner grouping
- sticky bottom action area where needed
- restrained use of bordered surfaces only where emphasis matters

The visual model should feel closer to a focused workspace or editor than a dashboard of tiles.

### 5. Tracking Is Unified

Payment, renewal, and general request follow-up should no longer behave like separate stacked mini-products.

Instead:
- `Status` becomes the single tracking page
- payment and renewal appear inside status only when they are relevant
- `History` becomes a separate read-only destination for completed vehicle insurance records

This keeps the insurance model coherent:
- current work lives in `Overview`, `Request`, `Docs`, and `Status`
- past work lives in `History`

## Information Architecture

### App-Level Insurance Entry

Purpose:
- provide a clear doorway into insurance
- show just enough current-state information to justify entry
- avoid recreating the old long-scroll layout

Structure:
- eyebrow or module label
- title
- one short supporting sentence
- current vehicle strip
- current request summary or empty state summary
- primary `Enter insurance mode` CTA
- optional compact notification summary

### Insurance Mode: Overview

Purpose:
- orient the customer inside the insurance workspace
- show the best current action
- provide clean route choices to the other sections

Structure:
- insurance mode header
- internal insurance nav
- one "next best action" section
- concise route rows for:
  - request
  - documents
  - status
  - history

The overview should not become a second dashboard. It should act like a clean routing hub with one primary decision at a time.

### Insurance Mode: Request

Purpose:
- let the customer start or continue a request in a focused page

Structure:
- page title
- selected vehicle summary
- inquiry type selector
- claim details section
- insurance details section
- notes section
- sticky submit area

Copy direction:
- short labels
- customer-safe language
- no staff workflow explanation inside the form

### Insurance Mode: Docs

Purpose:
- keep the checklist and upload flow together in one focused tool

Structure:
- current request summary
- requirements/checklist section
- upload target selector
- selected file summary
- optional note field
- sticky upload action

Behavior:
- the page should show what is missing first
- uploaded files should be visible, but should not overwhelm the missing-items path
- upload actions should stay inside this page instead of being scattered through other surfaces

### Insurance Mode: Status

Purpose:
- show the current request state in one readable tracking surface

Structure:
- request summary
- next best action section
- timeline section
- latest update section
- conditional payment details when applicable
- conditional renewal details when applicable
- route CTA to the page that resolves the current blocker

Rules:
- if payment is not relevant, do not show a full payment sub-surface
- if renewal is not relevant, do not show a full renewal sub-surface
- if action is required, the sticky action should route to the exact place where the user can resolve it

### Insurance Mode: History

Purpose:
- show customer-safe completed insurance records for the selected vehicle

Structure:
- read-only record list
- most important facts surfaced first
- one clean empty state when no history exists

History should not contain active workflow management or upload actions.

## Navigation Model

Navigation should feel mode-based, not drill-down heavy.

Expected behavior:
- app bottom tab opens the lightweight insurance entry screen
- `Enter insurance mode` transitions into the insurance-only workspace
- internal nav switches between `Overview`, `Request`, `Docs`, `Status`, and `History`
- overview route rows may also jump directly to these sections
- a clear exit/back affordance should return the customer to the regular app-level insurance entry screen

The customer should always know:
- whether they are in the app-level tab or in insurance mode
- which insurance section they are currently viewing
- what their next action is

## Visual Direction

The redesign should stay within the existing premium dark family, but it must feel materially different from the current implementation.

Required visual changes:
- fewer bordered boxes competing for attention
- stronger page rhythm through spacing and section dividers
- one emphasized action area at a time
- less repetitive helper text
- more intentional typography hierarchy
- orange used as precise emphasis, not as decoration on every element

Preferred visual feel:
- premium
- composed
- modern
- operational
- less like a stacked dashboard
- more like a focused product workflow

## Copy Direction

Copy should be shortened across the module.

Guidelines:
- prefer one short support sentence instead of two or three
- do not repeat the same explanation across overview, request, docs, and status
- keep labels operational and direct
- avoid staff-only phrasing
- avoid over-explaining backend workflow details

Examples of the intended tone:
- "Start your first insurance request"
- "Upload valid ID"
- "Current blocker"
- "Completed records for this vehicle"

## Data And Behavior Constraints

This redesign is a structural and UI/UX reset, not a backend workflow rewrite.

Preserve:
- existing vehicle-scoped inquiry behavior
- remembered inquiry mapping behavior
- current live backend routes
- current inquiry creation and document upload operations
- current customer-safe history records behavior
- existing workflow-derived status logic where possible

Do not introduce:
- new backend workflow states
- new insurance business rules
- staff-only internal workflow details on customer screens
- fake progress steps that do not map to real request behavior

UI state may be reorganized, but underlying insurance data behavior should remain intact unless a current UI assumption is itself causing the poor UX and can be safely refactored without changing product meaning.

## Technical Direction

The current insurance surface should be refactored around clearer UI responsibilities.

Expected direction:
- keep backend interaction logic and derived state logic centralized in existing helper/view-model layers where it already fits
- restructure `mobile/src/screens/InsuranceInquiryScreen.js` so it is no longer acting as one giant vertically stacked experience
- introduce or expand dedicated UI units for:
  - app-level insurance entry screen
  - insurance mode shell and internal nav
  - overview hub
  - request page
  - documents page
  - status page
  - history page

Implementation should prefer:
- smaller focused presentation components
- shared section primitives where they genuinely reduce repetition
- clear boundaries between:
  - routing inside insurance mode
  - state derivation
  - request form handling
  - document upload handling
  - tracking/history rendering

## Error And Empty State Direction

Error and empty states should also follow the cleaner model.

Rules:
- show one clean empty state per page, not multiple placeholder panels
- request page should clearly explain when vehicle selection blocks request creation
- docs page should clearly explain when no request exists yet
- status page should clearly explain when there is no active request to track
- history page should clearly explain when no completed records exist

Error messages should:
- stay concise
- point to the next useful action
- avoid dumping technical detail unless there is no better customer-safe message available

## Testing Direction

Testing should focus on structure and state-driven routing, not just snapshot-like copy assertions.

Before implementation:
- update tests that assume the older hybrid card structure

During implementation:
- add or update focused tests for:
  - app-level entry state selection
  - insurance mode section routing
  - overview next-action logic
  - status-page CTA routing
  - docs-page blocked/no-request states
  - history page empty vs populated rendering

Verification should include:
- focused mobile tests
- Expo launch and manual validation in the real mobile flow
- navigation checks between insurance entry and insurance mode

## Non-Goals

This redesign should not:
- replace the global app bottom tab bar
- change backend insurance workflow rules
- add new insurance business capabilities
- redesign unrelated mobile modules
- turn insurance into a separate standalone app

## Success Criteria

The redesign is successful when:
- the insurance module visibly feels like a new product structure
- the customer no longer sees a long stack of insurance cards on one page
- the separation between entry, overview, request, docs, status, and history is obvious
- current action is easy to identify
- documents feel easier to manage
- payment and renewal no longer feel like separate cluttered mini-products
- history feels clean and read-only
- the overall mobile insurance experience feels more professional, modern, and easier to navigate than both the old screen and the current hybrid redesign
