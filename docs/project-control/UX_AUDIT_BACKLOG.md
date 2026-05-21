# UX Audit Backlog

Last updated: 2026-05-21

Use this file to track findings from the combined UX Audit Pro plus Vercel `web-design-guidelines` workflow.

Status legend:

- New: finding captured but not analyzed.
- Planned: accepted and ready for implementation.
- In Progress: implementation started.
- Vercel Review Needed: flow was changed and needs `web-design-guidelines`.
- QA Needed: implementation and Vercel review are done, but Playwright/manual evidence is missing.
- QA Passed: verified and reflected in project-control docs.
- Deferred: valid but not required for the next demo milestone.

## Intake Template

| ID | Source | Severity | Status | Screen / Flow | Finding | Recommended Fix | Acceptance Criteria | QA Check | Linked Objective / Panel Feedback |
|---|---|---|---|---|---|---|---|---|---|
| UX-001 | UX Audit Pro | High | New | Example | Example | Example | Example | Example | Example |

## Workflow Rules

- UX Audit Pro findings should come from screenshots and flow descriptions.
- Vercel `web-design-guidelines` findings should come after Codex restructures code.
- Do not mark a UX finding `QA Passed` without a fresh Playwright run or explicit manual screenshot evidence.
- If a finding affects panel feedback or objective compliance, update `PANELIST_FEEDBACK_MATRIX.md` and `OBJECTIVE_COMPLIANCE_MATRIX.md`.
- If a finding is verified, update `QA_LEDGER.md` with the command or manual evidence.

## Active Review

- Current focus: Customer mobile Book flow
- Current status: UX Audit Pro findings received on 2026-05-21; Codex Mobile Book rebuild completed and awaiting QA verification
- External input to request first: remove or merge steps, clarify copy/labels, reduce navigation confusion, and identify what Codex should rebuild first
- Likely implementation files after findings return: `mobile/App.js`, `mobile/src/screens/Dashboard.js`
- Handoff rule: this chat restructures the flow; the QA chat owns Playwright/manual verification and closure

## Current Findings - Mobile Book First Pass

| ID | Source | Severity | Status | Screen / Flow | Finding | Recommended Fix | Acceptance Criteria | QA Check | Linked Objective / Panel Feedback |
|---|---|---|---|---|---|---|---|---|---|
| UX-001 | UX Audit Pro mobile book flow report | Critical | QA Needed | Book entry guardrail | `Customer session required` is too technical and blocks the user before explaining the value of signing in. | Rewrite the guardrail as a booking-focused onboarding step with clear benefits, friendly copy, and a `Continue Browsing` escape hatch. | First-time customers understand why sign-in is needed before they are interrupted. | Manual 5-second comprehension check on the Book entry screen. | Objective 1, Objective 6, Ms. Abad `Mobile UX`, Ms. Abad `Mobile Auth` |
| UX-002 | UX Audit Pro mobile book flow report | Critical | QA Needed | Customer dashboard after login | Dashboard hierarchy mixes notifications, booking status, greeting, and payment urgency without a single obvious next action. | Rebuild the home booking surface around one primary next-step card per booking state, then place alerts and secondary modules underneath. | A customer can identify the required next action in under 3 seconds. | Manual screenshot review plus targeted mobile QA of the post-login dashboard state. | Objective 1, Objective 6, Ms. Abad `Mobile UX` |
| UX-003 | UX Audit Pro mobile book flow report | Critical | QA Needed | Mobile Book information architecture | `Discover & Track`, `Discover Options`, `Track Progress`, and lifecycle/tracking concepts overlap and force users to decode system language. | Rename the Book module to customer language and split the two modes into `Choose Services` and `Active Services`. | Navigation labels read like customer tasks instead of internal workflow terms. | Playwright/manual check for updated Book labels and navigation clarity. | Objective 1, Objective 6, Ms. Abad `Mobile UX` |
| UX-004 | UX Audit Pro mobile book flow report | Critical | QA Needed | Mobile booking hierarchy | The booking tab leads with vehicle selection instead of helping the customer understand what they are booking first. | Reorder the booking flow into a guided journey: services, vehicle, schedule, then review and submit. | The screen presents one dominant decision at a time and ends with a clear review state. | Playwright booking flow rerun with screenshot checkpoints for each step. | Objective 1, Ms. Abad `Mobile Booking`, Ms. Abad `Mobile UX` |
| UX-005 | UX Audit Pro mobile book flow report | Critical | QA Needed | Reservation payment state | Reservation payment urgency is described with technical phrasing and timestamp formatting instead of clear human urgency. | Replace technical deadline copy with plain-language urgency and clearer payment actions on home/track surfaces. | Users understand when to pay and what happens if they do not. | Manual screenshot check plus targeted booking payment-state QA. | Objective 1, Objective 3, Objective 6, Ms. Abad `Billing`, Ms. Abad `Mobile UX` |
| UX-006 | UX Audit Pro mobile book flow report | High | In Progress | Mobile vehicle cards | Vehicle cards lean on plate metadata and operational tags more than customer recognition cues. | Reduce plate prominence, keep the owned state secondary, and present the vehicle choice as part of a booking step instead of the first decision on the page. | Vehicle selection feels like a customer choice rather than an internal record lookup. | Screenshot comparison of old/new Mobile Book vehicle cards. | Objective 1, Objective 6, Ms. Abad `Mobile UX` |

## Codex Rebuild Instructions - Mobile Book

| Source finding | Screen / flow | User problem | Target behavior | UI/copy requirements | Files likely affected | Acceptance criteria | QA check |
|---|---|---|---|---|---|---|---|
| Hard-block `Customer session required` screen before booking starts. | Book entry guardrail | A first-time customer hits technical language before understanding why sign-in matters. | Booking entry explains the benefit of signing in and offers a clear browse/back path. | Use `Sign in to continue booking`, explain booking/history/vehicle benefits, and replace the secondary action with `Continue Browsing`. | `mobile/App.js` | Book entry reads like onboarding instead of an auth failure. | Manual screenshot and 5-second comprehension test. |
| Dashboard stacks payment, queue state, greeting, and booking status without a clear primary action. | Home dashboard booking state | The customer cannot tell what to do next after login. | The home dashboard presents one next-step card based on the latest booking state. | Use a `Next step` treatment, clearer CTA labels like `Pay now`, `View status`, or `Start booking`, and move secondary alerts below the primary action. | `mobile/src/screens/Dashboard.js` | One primary CTA is visually dominant for each state. | Manual screenshot review of the post-login state plus targeted mobile QA. |
| `Discover & Track` and related labels overlap booking, tracking, and lifecycle language. | Book module IA | Users have to decode system terms before they can act. | The Book area uses customer-task labels for booking and active booking visibility. | Replace `Discover & Track` with `Service Booking`, `Discover Options` with `Choose Services`, and `Track Progress` with `Active Services`. | `mobile/src/screens/Dashboard.js` | A first-time customer can predict what each Book mode contains. | Playwright/manual label check on the Book module. |
| Booking starts with vehicle selection and mixes too many decisions in one scroll. | Booking flow layout | The customer is asked to pick a vehicle before understanding the service request. | The booking page behaves like a guided four-step flow. | Present `Step 1: Choose Services`, `Step 2: Select Vehicle`, `Step 3: Pick a Schedule`, and `Step 4: Review Booking`, ending with a single booking CTA. | `mobile/src/screens/Dashboard.js` | The booking path reads top-to-bottom like a guided journey. | Playwright booking flow rerun with screenshot checkpoints for each step. |
| Reservation payment warning uses technical urgency instead of customer language. | Reservation payment state | Customers do not understand the deadline or consequence of not paying. | Payment states show plain-language urgency and clearer action labels. | Replace technical deadline text with human-readable urgency, keep the due date readable, and clarify the payment action/button copy. | `mobile/src/screens/Dashboard.js` | A customer understands the deadline on first read. | Payment-state screenshot check plus targeted QA flow. |

## Vercel Guidelines Review

- Review source: fetched `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- Review mode used here: manual fallback against the fetched guideline list because the slash skill is not active in this Codex session
- Files reviewed: `mobile/App.js`, `mobile/src/screens/Dashboard.js`
- Findings applied during this pass:
  - customer-facing action labels moved toward Title Case
  - loading/button copy uses `…` instead of `...`
  - the updated payment and booking copy stays specific about the next step
- Blocking issues remaining from this pass: none found beyond the QA checks already listed above

## First Priority Review Queue

| Priority | Screen / Flow | Reason |
|---|---|---|
| 1 | Mobile Book | Panelists called out confusing mobile UX, multi-service booking, and session clarity. |
| 2 | Mobile Garage / Lifecycle | Panelists requested multiple cars, garage pagination, and Objective 2 lifecycle polish. |
| 3 | Staff Job Orders | Mixed handoff/source-picking can still be cognitively heavy and risks wrong-job selection. |
| 4 | Staff QA Audit | Objective 5 must be immediately understandable to panelists and head technicians. |
| 5 | Staff Invoices & Orders | Billing/payment completion must be clear before booking moves to completed history. |
