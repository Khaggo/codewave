# Mobile Insurance Minimal Shell Redesign

Date: 2026-05-16
Owner: Codex
Status: Draft for review

## Goal

Replace the current mobile insurance experience with a dedicated insurance-only screen that opens directly from the app's main `Insurance` tab and feels like a clean sub-app, not a stack of cards.

The redesign must fix the current problems called out by the user:

- too many stacked cards
- long, bulky copy
- wrong entry flow
- cluttered vehicle selection
- floating reload control outside the layout
- no clear insurance-only navigation model

## Outcome

Tapping the app's main `Insurance` tab should open directly into a dedicated insurance screen with:

- a slim header
- an internal tab bar
- a header-based vehicle picker
- pull-to-refresh
- short operational copy
- minimal section-based layout

This insurance screen will use four internal tabs:

- `Home`
- `Request`
- `Documents`
- `Status`

`History` is not a top-level tab. It is folded into the `Status` screen.

## Product Direction

### Entry behavior

The current extra entry step must be removed.

Old behavior:
- open `Insurance`
- see another entry card
- tap `Enter insurance mode`
- then reach the real insurance UI

New behavior:
- tap `Insurance`
- land directly inside the insurance-only shell

There should be no separate app-level insurance hero card, no `Protection center` entry block, and no second confirmation CTA to enter the module.

### Visual direction

The module should follow a `minimal app-shell` approach:

- dark background
- compact header
- fixed internal tab row
- thin dividers
- restrained status pills
- one orange primary action per screen
- very limited bordered containers

Spacing should do most of the separation work. Cards should only exist where containment is truly useful, such as:

- uploaded file rows
- a single status alert
- a bottom sheet

Large wrapper cards, hero cards, and repeated rounded boxes around every section should be removed.

## Information Architecture

### Insurance shell

The dedicated insurance screen contains:

1. Header
2. Vehicle selector trigger
3. Internal tab bar
4. Active tab content
5. Optional fixed footer action on tabs that need submission/upload

### Header

The header should be simple:

- title: `Insurance`
- vehicle trigger near the title or under it
- optional notification affordance only if it already belongs to the existing app shell

The floating reload control must be removed from the body entirely.

### Vehicle selection

The big `Select vehicle` block must be removed from the body.

Instead:

- show the active vehicle in the header as a compact pill or text button
- tapping it opens a bottom-sheet vehicle picker
- all tabs use the selected vehicle context

The vehicle picker should:

- show vehicle label
- show plate / identifier
- indicate current selection clearly
- dismiss cleanly after selection

### Refresh behavior

Manual refresh becomes pull-to-refresh only.

There should be:

- no floating refresh button
- no stray reload affordance outside the layout

If the module needs explicit retry after failure, show that inline in the failed state only.

## Tab Design

### Tab 1: Home

Purpose: lightweight control center

This is not a hero card screen. It is a compact overview with:

- active vehicle
- one-line current case state
- one primary next action
- short shortcuts into `Request`, `Documents`, and `Status`

Content shape:

- top summary row
- current state line
- primary CTA
- simple section links list

Allowed copy length:

- one short line per supporting text block
- no paragraphs

Example copy direction:

- `Overview`
- `Ready to start a request`
- `Missing 1 required file`
- `Payment follow-up pending`

### Tab 2: Request

Purpose: start or continue a customer-safe request

The screen should feel like a proper mobile form page, not a card pile.

Structure:

- compact section title
- inquiry type selector
- claim details group
- insurance details group
- fixed submit area

Layout rules:

- use section headers and dividers
- avoid boxing each section in a large rounded card
- keep helper copy to one line where possible

Footer:

- fixed bottom action
- clear primary button
- short state label only if helpful

### Tab 3: Documents

Purpose: manage supporting files

Structure:

- checklist summary
- already uploaded files
- target document selector
- selected file summary
- short note field
- fixed upload action

Layout rules:

- checklist should read as a clean section, not a grid of panels
- uploaded files should be list items, not oversized cards
- upload controls should be grouped tightly
- no repeated heavy containers

### Tab 4: Status

Purpose: current case tracking plus history

This tab combines:

- current stage
- latest update
- timeline
- payment or renewal follow-up when relevant
- historical records below

This replaces the separate `History` top-level destination.

Structure:

- current status summary
- timeline / next step area
- actionable payment or renewal section if present
- history section below

History should feel secondary to the active case, not like another full screen.

## Copy Direction

Copy must be shortened across the module.

Rules:

- no marketing-style intros
- no repeated explanations of what insurance mode is
- no long operational paragraphs
- one sentence max for helper copy in most places

Target tone:

- direct
- calm
- professional
- operational

Examples:

- `Insurance inquiry center` -> remove
- `Open the dedicated insurance workspace for requests, documents, updates, and history.` -> remove
- `Review the current blocker, latest update, and next action in one place.` -> `Current status and next step`
- `Vehicle ownership is the backend gate for insurance intake.` -> remove or shorten to `Selected vehicle`

## Component Boundaries

### Keep

- backend request / upload / tracking behavior
- current normalized inquiry and record shapes
- focused test coverage
- insurance-only internal navigation concept

### Replace or simplify

- app-level insurance entry card
- floating reload affordance
- large body vehicle selector card
- repeated stacked wrapper cards
- long hero copy
- separate history tab

## Expected Screen Structure

### Insurance shell frame

- `InsuranceScreenShell`
  - `InsuranceHeader`
  - `VehiclePickerSheet`
  - `InsuranceTabBar`
  - `InsuranceHomeTab | InsuranceRequestTab | InsuranceDocumentsTab | InsuranceStatusTab`

### Layout principle

The shell owns navigation and shared chrome.

Each tab owns its own content.

Only `Request` and `Documents` should own fixed bottom actions.

`Home` and `Status` should feel lighter and scroll naturally.

## Data Flow

- Main app `Insurance` tab opens the insurance shell immediately
- selected vehicle lives at shell level
- active internal tab lives at shell level
- tab content consumes the selected vehicle context
- request, documents, and status continue to use the current backend-driven data
- history shown inside `Status` uses the existing normalized records

## Error Handling

### Empty states

- no vehicle: concise inline state, plus vehicle picker CTA
- no request yet: short request-start guidance
- no uploaded files: simple empty file list state
- no history yet: short empty history line in `Status`

### Failures

Network or load failures should render inline in the active tab:

- one short error line
- one retry action if needed

Do not use giant failure cards unless the entire screen cannot function.

## Testing

Keep focused mobile tests and expand source-level structure coverage for:

- direct entry into insurance shell
- internal four-tab structure
- no extra insurance-entry gate
- status tab includes history surface
- header-driven vehicle picker
- no floating reload body control
- fixed footer ownership limited to request/documents

## Acceptance Criteria

The redesign is complete when all of the following are true:

- tapping the main app `Insurance` tab opens directly into the dedicated insurance shell
- there is no extra `enter insurance mode` screen
- internal navigation uses exactly four tabs: `Home / Request / Documents / Status`
- `History` is inside `Status`, not its own top-level tab
- vehicle selection is moved to a header-triggered bottom sheet
- the floating reload button is removed
- refresh uses pull-to-refresh
- the body no longer relies on stacked large cards as the main layout pattern
- copy is noticeably shorter and more operational
- the module feels like a clean insurance-only sub-app on mobile

## Out of Scope

- backend workflow changes
- changing insurance business logic
- adding new insurance features
- redesigning unrelated tabs outside the insurance module

## Implementation Notes

This redesign supersedes the current mobile insurance shell direction where the module still behaves like:

- an app-level entry screen
- a second entry CTA into insurance mode
- a card-heavy vertical stack

Implementation should treat the user's latest feedback as the source of truth over the earlier intermediate layouts.
