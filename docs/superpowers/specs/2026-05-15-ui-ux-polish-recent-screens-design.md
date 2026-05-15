# UI/UX Polish for Recently Touched Screens

## Goal

Make the recently touched web and mobile screens easier to understand, easier to act on, and more visually consistent without changing the existing Cruiser's Crib dark/orange brand direction.

This is a usability-first cleanup pass. The target outcome is a product that looks cleaner, feels more guided, and removes confusing or missing actions across the recent insurance-related work and other recently touched screens.

## Scope

This cleanup covers:

- shared UI pieces recently touched and now reused across updated screens
- web screens recently touched, especially the insurance/admin flows
- mobile screens recently touched, especially insurance and related dashboard/reminder surfaces

This cleanup does **not** aim to:

- redesign the full product brand
- replace the dark theme direction
- rebuild unrelated modules that were not part of the recent implementation work
- introduce a new navigation structure for the whole app

## Product Direction

The current product direction stays the same:

- dark visual foundation
- orange as the main action/accent color
- operational/admin tone on web
- customer-guided tone on mobile

What changes is the quality of execution:

- clearer hierarchy
- better spacing
- stronger primary actions
- more consistent cards, filters, and section structure
- less visual noise
- better empty and loading states

## Primary Priorities

The cleanup should prioritize, in order:

1. fix missing or weak actions and buttons
2. improve clarity and user guidance
3. improve visual consistency and polish

This is important because a screen that looks polished but remains unclear or incomplete is still a bad experience.

## Affected Surfaces

### Shared Web UI

- page header component(s)
- button styles and action grouping
- cards and section containers
- filters and form rows
- empty states
- status chips/badges

### Web Screens Recently Touched

- insurance main workspace
- insurance collections workspace
- insurance renewals workspace
- manual reminder controls
- custom broadcast controls
- any shared admin shell or header pieces touched to support those screens

### Mobile Screens Recently Touched

- insurance home and tracking experience
- insurance inquiry flow
- mobile reminder/notification visibility where recently touched
- dashboard or entry surfaces recently touched that expose insurance actions

## UX Problems to Solve

### Common Problems

- some actions are missing, weak, or not visually obvious
- important actions compete visually with secondary actions
- large sections feel dense and harder to scan
- spacing rhythm is inconsistent across updated screens
- filters and forms are functional but not easy on the eyes
- users are not always clearly told what to do next
- empty states feel under-guided
- recently added screens feel technically complete but not fully refined

### Web-Specific Problems

- operational screens can feel crowded and flat
- action panels can blend into surrounding content
- summary sections can be visually noisy
- queue/filter areas need stronger structure
- detail and action regions need clearer priority

### Mobile-Specific Problems

- some screens can feel content-heavy instead of guided
- status and follow-up information can look equally important even when it is not
- action buttons need more predictable placement and emphasis
- document, payment, and renewal states need stronger visual separation

## Design Principles

### 1. Action First

Every screen should make the next important action easy to spot.

Primary actions should be visually distinct. Secondary actions should remain available but quieter. Destructive or risky actions should be separated enough that users do not hit them by mistake.

### 2. Guidance Over Density

Screens should feel operational but not crowded. Break large content blocks into cleaner sections with stronger headings, tighter grouping, and more breathing room.

### 3. Consistency Over Novelty

The goal is not to make every screen look unique. The goal is to make recently touched screens feel like one coherent product family.

### 4. Customer and Staff Context Should Feel Different

Web admin/staff surfaces should feel like operational workspaces.

Mobile customer surfaces should feel like guided step-by-step support flows.

## Shared UI Cleanup

### Buttons

The cleanup should standardize:

- primary buttons
- secondary buttons
- tertiary/text actions
- destructive actions
- disabled button appearance

Primary buttons should read as the clear “do this now” control.

Secondary actions should not visually compete with primary actions.

Text actions like “clear selection” or “select visible cases” should be aligned and styled intentionally rather than feeling like leftover links.

### Headers

Page headers should:

- provide better section identity
- balance title, description, and action controls
- avoid oversized or generic hero treatment when it adds no value

### Cards and Panels

Cards should become:

- more consistent in padding
- more consistent in border/radius/shadow language
- easier to scan

Panels with controls should visually distinguish:

- informational content
- action inputs
- results/feedback

### Forms and Filters

Forms and filters should be cleaned up through:

- more consistent label styling
- better spacing between fields
- clearer grouping of related inputs
- more obvious difference between editable inputs and read-only context

### Empty States

Empty states should include:

- what the section means
- why it is empty
- what the user can do next, when appropriate

## Web Cleanup Design

### Insurance Main Workspace

The insurance main workspace should feel like a cleaner operational review board.

Changes should include:

- simplify and tighten the top summary area
- make queue filters feel more like a control bar and less like loose fields
- make manual reminder and broadcast areas more obviously actionable
- improve vertical spacing between summary, filters, actions, list, and detail areas
- ensure the eye clearly understands the flow:
  - queue context
  - action tools
  - selected case details

### Collections Workspace

Collections should emphasize:

- due/payment state first
- staff action second
- supporting detail third

The screen should look less like a large plain form and more like a purpose-built collection follow-up space.

### Renewals Workspace

Renewals should emphasize:

- urgency/time windows
- renewal stage
- next staff action

The experience should feel clearer for work triage and less like a generic data panel.

### Reminder and Broadcast Controls

These are among the newest UI additions and should receive special cleanup:

- stronger grouping of target mode, audience preview, and send action
- more obvious send-readiness state
- cleaner layout for selected/visible/eligible counts
- clearer distinction between reminder tools and broadcast tools

## Mobile Cleanup Design

### Insurance Home and Tracking

The mobile insurance experience should feel like a guided assistant rather than a stack of status cards.

Changes should include:

- stronger visual order for the main action cards
- cleaner distinction between active request, document follow-up, payment follow-up, and renewal follow-up
- more readable timeline/status presentation
- more helpful action wording for upload, proof submission, and renewal response

### Inquiry Flow

The inquiry flow should feel lighter and easier to complete:

- cleaner section spacing
- stronger labels
- better hierarchy between vehicle, inquiry type, concern, and upload steps
- clearer draft/active/follow-up state

### Dashboard or Reminder Surfaces Recently Touched

Any mobile dashboard/reminder surface recently touched should be aligned so that:

- high-priority items look high-priority
- unread reminders are more noticeable
- informational cards do not overpower action-needed cards

## Functional Cleanup Included

This pass is not visual-only.

It should also fix:

- missing buttons
- awkward or unclear button labels
- missing “next step” actions in empty states
- weak placement of important controls
- inconsistent action grouping
- places where the user does not know whether they are selecting, reviewing, or sending

## Execution Strategy

The implementation should happen in this order:

1. shared UI foundation
2. web screens recently touched
3. mobile screens recently touched
4. final consistency sweep

This keeps the cleanup cohesive and avoids restyling the same patterns multiple times.

## Acceptance Criteria

This cleanup is successful when:

- recently touched screens feel consistent with one another
- important buttons are obvious and complete
- forms and filters are easier to scan
- queue/action/detail areas are easier to distinguish on web
- insurance mobile screens feel more guided and less crowded
- empty states and support text better explain what to do next
- the dark/orange brand direction remains intact but more refined

## Risks and Guardrails

### Risks

- polishing too broadly and accidentally affecting unrelated modules
- over-styling without solving action clarity
- introducing visual inconsistency by polishing screen-by-screen without shared fixes first

### Guardrails

- prioritize usability over decoration
- limit code changes to recently touched surfaces and their shared dependencies
- do shared UI cleanup first before individual screen polish
- preserve existing product identity rather than rebranding

## Recommendation

Treat this as one cleanup initiative with three internal slices:

1. shared UI foundation cleanup
2. web workspace cleanup
3. mobile cleanup

That is the safest way to make the recent work feel modern, professional, and consistent without turning the pass into an uncontrolled redesign.
