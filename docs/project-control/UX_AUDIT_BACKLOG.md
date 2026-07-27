# UX Audit Backlog

Last updated: 2026-07-25

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

- Current focus: End-to-end customer booking and staff service-delivery flow
- Current status: Mobile booking and staff workflow redesign implemented; fresh booking-to-cash, role-access, lifecycle, build/export, and responsive evidence passed on 2026-07-25
- Remaining follow-up: first-time booking sign-in comprehension, mobile vehicle-card polish, timed session proof, and legacy Billing form-field naming
- Primary implementation files: `mobile/src/screens/Dashboard.js`, `frontend/src/app/bookings/BookingsList.js`, and the Intake, Job Orders, QA, and Billing workspaces
- Handoff rule: keep workflow changes tied to fresh browser evidence and record remaining usability findings without overstating closure

## Current Findings - Mobile Book First Pass

| ID | Source | Severity | Status | Screen / Flow | Finding | Recommended Fix | Acceptance Criteria | QA Check | Linked Objective / Panel Feedback |
|---|---|---|---|---|---|---|---|---|---|
| UX-001 | UX Audit Pro mobile book flow report | Critical | QA Needed | Book entry guardrail | `Customer session required` is too technical and blocks the user before explaining the value of signing in. | Rewrite the guardrail as a booking-focused onboarding step with clear benefits, friendly copy, and a `Continue Browsing` escape hatch. | First-time customers understand why sign-in is needed before they are interrupted. | Manual 5-second comprehension check on the Book entry screen. | Objective 1, Objective 6, Ms. Abad `Mobile UX`, Ms. Abad `Mobile Auth` |
| UX-002 | UX Audit Pro mobile book flow report | Critical | QA Passed | Customer dashboard after login | Dashboard hierarchy mixes notifications, booking status, greeting, and payment urgency without a single obvious next action. | Rebuild the home booking surface around one primary next-step card per booking state, then place alerts and secondary modules underneath. | A customer can identify the required next action in under 3 seconds. | Fresh mobile helper tests and booking-to-cash browser flow passed on 2026-07-25. | Objective 1, Objective 6, Ms. Abad `Mobile UX` |
| UX-003 | UX Audit Pro mobile book flow report | Critical | QA Passed | Mobile Book information architecture | `Discover & Track`, `Discover Options`, `Track Progress`, and lifecycle/tracking concepts overlap and force users to decode system language. | Rename the Book module to customer language and split the two modes into `Choose Services` and `Active Services`. | Navigation labels read like customer tasks instead of internal workflow terms. | Fresh mobile web snapshot and booking-to-cash browser flow passed on 2026-07-25. | Objective 1, Objective 6, Ms. Abad `Mobile UX` |
| UX-004 | UX Audit Pro mobile book flow report | Critical | QA Passed | Mobile booking hierarchy | The booking tab leads with vehicle selection instead of helping the customer understand what they are booking first. | Reorder the booking flow into a guided journey: services, vehicle, schedule, then review and submit. | The screen presents one dominant decision at a time and ends with a clear review state. | Fresh booking-to-cash browser flow and Android export passed on 2026-07-25. | Objective 1, Ms. Abad `Mobile Booking`, Ms. Abad `Mobile UX` |
| UX-005 | UX Audit Pro mobile book flow report | Critical | QA Passed | Reservation payment state | Reservation payment urgency is described with technical phrasing and timestamp formatting instead of clear human urgency. | Replace technical deadline copy with plain-language urgency and clearer payment actions on home/track surfaces. | Users understand when to pay and what happens if they do not. | Fresh booking-to-cash flow passed reservation payment through final invoice payment on 2026-07-25. | Objective 1, Objective 3, Objective 6, Ms. Abad `Billing`, Ms. Abad `Mobile UX` |
| UX-006 | UX Audit Pro mobile book flow report | High | In Progress | Mobile vehicle cards | Vehicle cards lean on plate metadata and operational tags more than customer recognition cues. | Reduce plate prominence, keep the owned state secondary, and present the vehicle choice as part of a booking step instead of the first decision on the page. | Vehicle selection feels like a customer choice rather than an internal record lookup. | Screenshot comparison of old/new Mobile Book vehicle cards. | Objective 1, Objective 6, Ms. Abad `Mobile UX` |

## Current Findings - Staff Service Flow

| ID | Source | Severity | Status | Screen / Flow | Finding | Recommended Fix | Acceptance Criteria | QA Check | Linked Objective / Panel Feedback |
|---|---|---|---|---|---|---|---|---|---|
| UX-007 | Panelist usability review and staff booking screenshot | Critical | QA Passed | Booking Schedule | The watchlist, schedule controls, filters, closures, slot administration, and booking actions competed for attention before staff could see what needed action. | Default to a `Needs Attention` queue, show one primary action per booking, and place filters and schedule administration behind disclosure controls. | The first viewport shows the work queue and a clear next action without exposing routine administration. | Desktop/mobile screenshots and booking-to-cash Playwright passed on 2026-07-25. | Objective 3, Objective 6, panelist user-friendly workflow feedback |
| UX-008 | End-to-end service-flow review | Critical | QA Passed | Booking to Billing | Staff lost the selected booking/job context while moving through Intake, Job Orders, QA, and Billing. | Preserve record IDs in route handoffs and show one shared lifecycle header with owner, blocker, and next action. | Staff can move forward or back without reselecting the record, and every stage explains the next step. | Booking-to-cash, role-access, and lifecycle/readable-ID Playwright passed on 2026-07-25. | Objectives 1, 2, 3, 5, 6 |
| UX-009 | Staff queue review | High | QA Passed | QA Audit and Invoices & Orders | Long native dropdowns made record selection slow and error-prone. | Add visible searchable queues while retaining the native select as an accessible compatibility control. | Staff can find and open a job or invoice directly from a scan-friendly queue. | Responsive screenshots, direct-link checks, and targeted Playwright passed on 2026-07-25. | Objectives 3, 5, 6 |
| UX-010 | Chrome accessibility issue scan | Medium | Deferred | Invoices & Orders | Chrome reports seven legacy form fields without an `id` or `name`. | Add stable field identifiers during the next Billing form cleanup. | Chrome reports no unnamed form controls on the Billing workspace. | Re-run the Chrome issue scan after the focused accessibility patch. | Objective 6 |

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
| 4 | Staff QA Audit | Objective 5 must be immediately understandable to panelists and Service Advisers. |
| 5 | Staff Invoices & Orders | Billing/payment completion must be clear before booking moves to completed history. |
