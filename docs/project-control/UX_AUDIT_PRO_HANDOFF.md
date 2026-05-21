# Combined UX Audit Handoff Pack

Last updated: 2026-05-21

Status: Ready for external flow audit, Codex restructuring, Vercel code audit, and QA closure. Current first-pass focus: Customer mobile Book flow.

## Purpose

Use this pack to improve AUTOCARE with a two-layer UX workflow:

1. UX Audit Pro, or another external visual UX reviewer, critiques the flow from screenshots and process context.
2. Vercel's `web-design-guidelines` skill audits the rebuilt code for Web Interface Guidelines, accessibility, labels, copy, form structure, and interface consistency.

The goal is not only to make screens prettier. The goal is to find places where a real customer, adviser, technician, or panelist may get confused, take the wrong action, miss feedback, or lose trust in the system flow.

UX Audit Pro is external to this Codex workspace. Send the reviewer this document plus the screenshot folder listed below. After feedback returns, convert each comment into Codex rebuild instructions, then run the Vercel skill on the changed files before QA closure.

## Current Active Review

Start with the highest-risk flow first:

- Flow: Customer mobile Book flow
- Reason: panel feedback directly calls out confusing mobile UX, unclear session/login flow, and the need for clearer multi-service booking
- Codex role in this chat: restructure and polish the flow after findings return
- QA role in the separate QA chat: verify the rebuilt flow with Playwright/manual screenshots before anything is marked passed

Use this focused packet first before moving to Garage, Lifecycle, Job Orders, QA Audit, or Invoices:

- `qa/ux-audit/2026-05-21/mobile-web-home-390-current.png`
- `qa/ux-audit/2026-05-21/mobile-web-book-entry-390.png`
- `qa/ux-audit/2026-05-21/mobile-web-sign-in-390.png`
- `qa/ux-audit/2026-05-21/mobile-web-after-login-390.png`
- `qa/ux-audit/2026-05-21/mobile-web-book-tab-390.png`
- `qa/ux-audit/2026-05-21/mobile-web-book-services-390.png`

Likely rebuild files after findings return:

- `mobile/App.js`
- `mobile/src/screens/Dashboard.js`

## Tool Status

| Tool | Current Status | How It Is Used |
|---|---|---|
| UX Audit Pro | External tool, not a Codex app/plugin in this workspace. | Review screenshots and flow descriptions for confusing steps, unnecessary complexity, weak hierarchy, and panel-demo risk. |
| Vercel `web-design-guidelines` skill | Installed at `C:\Users\casio\.codex\skills\web-design-guidelines`. Restart Codex if it does not appear in the active skill list. | Review changed UI code after Codex restructures a page or flow. |

Vercel skill source noted by the installed skill:

```text
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

## Review Context

AUTOCARE is a mobile and web-based service management and customer engagement system for Cruisers Crib Auto Care Center.

Primary panelist UX/system concerns:

- Mobile app flow feels confusing and needs better design.
- Navigation is not always intuitive across booking, garage, lifecycle, shop, rewards, and insurance.
- Business references should be readable, not raw UUID/hash fragments.
- Customers should be able to book multiple services in one appointment.
- Customers should be able to add multiple cars and page through garage vehicles.
- Technicians should have a checklist-first/checklist-only experience, not a broad staff workspace.
- Billing details and final payment flow need clearer proof.
- Objective 5 must be visibly demonstrable through QA Audit proof anchors and customer-facing reviewed summaries.

Latest automated QA evidence:

- Report: `qa/playwright/artifacts/qa-summary.md`
- Latest result at handoff time: 5 passed, 0 failed, 0 timed out, 0 skipped.
- Residual UX risk still worth reviewing: mixed Job Orders queue dates where an existing job order and a fresh booking handoff share the same work date may still be cognitively heavy for advisers.

## Screenshot Packet

Primary packet folder:

```text
qa/ux-audit/2026-05-21/
```

Existing QA proof screenshots that are also useful:

```text
qa/playwright/artifacts/mobile-lifecycle-reviewed-summary-live.png
qa/playwright/artifacts/mobile-lifecycle-garage-pager-live.png
qa/playwright/artifacts/mobile-lifecycle-live-probe.png
qa/playwright/artifacts/mobile-garage-live-probe.png
```

## Upload Limit Strategy

UX Audit Pro currently allows up to 20 uploaded files. Do not upload the entire folder by default.

Use this upload order:

1. Current target flow only.
   For the current first-pass audit, upload only the Mobile Book packet:
   - `qa/ux-audit/2026-05-21/mobile-web-home-390-current.png`
   - `qa/ux-audit/2026-05-21/mobile-web-book-entry-390.png`
   - `qa/ux-audit/2026-05-21/mobile-web-sign-in-390.png`
   - `qa/ux-audit/2026-05-21/mobile-web-after-login-390.png`
   - `qa/ux-audit/2026-05-21/mobile-web-book-tab-390.png`
   - `qa/ux-audit/2026-05-21/mobile-web-book-services-390.png`
2. Primary packet only if a broader cross-flow review is needed.
   The primary screenshot set in `qa/ux-audit/2026-05-21/README.md` is the default full packet. Do not include supplementary captures unless requested.
3. Add QA proof artifacts only when they answer a specific reviewer question.
   Useful optional adds:
   - `qa/playwright/artifacts/mobile-lifecycle-reviewed-summary-live.png`
   - `qa/playwright/artifacts/mobile-lifecycle-garage-pager-live.png`
   - `qa/playwright/artifacts/mobile-lifecycle-live-probe.png`
   - `qa/playwright/artifacts/mobile-garage-live-probe.png`

If UX Audit Pro still needs more context after the first upload, run the review in batches instead of replacing the first set:

- Batch 1: Mobile Book
- Batch 2: Mobile Garage and Lifecycle
- Batch 3: Staff Job Orders, QA Audit, and Invoices

This keeps each upload under the cap and keeps findings scoped to one flow at a time.

## Flow To Review

1. Customer opens mobile app, reaches the service entry experience, and signs in.
2. Customer opens Book, selects a seeded vehicle, selects multiple services, chooses a slot/date, and submits one appointment.
3. Customer completes or is prompted through the reservation-fee state.
4. Customer opens Garage, sees multiple vehicles, and verifies pager/vehicle actions are understandable.
5. Customer opens vehicle lifecycle and sees timeline plus reviewed customer-facing summary when available.
6. Service adviser opens staff web Bookings, confirms booking, and sends it to workshop handoff.
7. Service adviser opens Job Orders, creates/loads the job order from the booking handoff, and assigns a technician.
8. Technician updates progress/evidence.
9. Head technician opens QA Audit and performs QA release with visible Objective 5 anchors.
10. Service adviser finalizes the job order and records payment in Invoices & Orders.
11. Customer completed history should only show completion after the service, QA, invoice, and payment flow is finished.

## Evidence Map

| Step | Screenshot or Evidence | Ask UX Audit Pro To Check |
|---|---|---|
| Mobile home / entry | `qa/ux-audit/2026-05-21/mobile-web-home-390-current.png` | Can a first-time customer understand where booking, lifecycle, garage, shop, rewards, and insurance live? |
| Customer guardrail before sign-in | `qa/ux-audit/2026-05-21/mobile-web-book-entry-390.png` | Is "Customer session required" clear, friendly, and actionable? |
| Customer sign-in | `qa/ux-audit/2026-05-21/mobile-web-sign-in-390.png` | Is sign-in visually obvious, readable, and confidence-building on mobile? |
| Authenticated dashboard / reservation state | `qa/ux-audit/2026-05-21/mobile-web-after-login-390.png` | Is the reservation-payment-required alert understandable, and does it clearly say what to do next? |
| Mobile Book tab | `qa/ux-audit/2026-05-21/mobile-web-book-tab-390.png` | Are multi-service booking, vehicle selection, date/slot steps, and progress labels easy to follow? |
| Mobile Garage | `qa/ux-audit/2026-05-21/mobile-web-garage-tab-390.png` | Are vehicle actions, selected vehicle, multiple cars, and paging states obvious? |
| Vehicle lifecycle | `qa/ux-audit/2026-05-21/mobile-web-lifecycle-from-garage-390.png` | Does the lifecycle page explain service history and vehicle status clearly to a customer? |
| Customer reviewed summary proof | `qa/playwright/artifacts/mobile-lifecycle-reviewed-summary-live.png` | Is the customer-visible reviewed summary easy to find and understand? |
| Staff Bookings | `qa/ux-audit/2026-05-21/staff-adviser-bookings-current.png` | Can a service adviser quickly identify bookings that need confirmation or workshop handoff? |
| Staff Job Orders | `qa/ux-audit/2026-05-21/staff-adviser-job-orders-current.png` | Is the mixed queue source-picking copy clear enough to prevent creating/loading the wrong job order? |
| Staff QA Audit queue | `qa/ux-audit/2026-05-21/staff-adviser-qa-audit-current.png` | Does a non-head technician role understand why verdict actions may be locked? |
| Head technician QA Audit loaded | `qa/ux-audit/2026-05-21/staff-headtech-qa-audit-loaded-current.png` | Are Risk Score, Semantic Match, Blocking Findings, and Review Needed visible and meaningful as Objective 5 proof? |
| Staff Invoices & Orders | `qa/ux-audit/2026-05-21/staff-adviser-invoices-current.png` | Is the billing lookup/final payment surface clear, and can staff tell what must be loaded before payment? |
| Completed-history timing | `qa/playwright/artifacts/qa-summary.md` | Does the evidence prove completion appears only after service, QA, invoice, and payment are finished? What screenshot should be added for demo confidence? |

## Combined Workflow

Use this loop per page or flow. Do not jump straight to code polish before the flow is simplified.

1. Capture flow evidence.
   Use `qa/ux-audit/2026-05-21/` plus the missing screenshots listed near the end of this file.
2. Run the UX Audit Pro flow audit.
   Send screenshots and the flow context. Ask for removed/merged steps, confusing hierarchy, weak feedback, wrong terminology, and panel-demo risks.
3. Convert feedback into Codex rebuild instructions.
   Each finding must become a concrete instruction with screen, problem, target behavior, copy/layout requirement, acceptance criteria, and QA check.
4. Restructure the page or flow in Codex.
   Fix flow order, page hierarchy, decision points, and user feedback first. Polish visual styling second.
5. Run Vercel `web-design-guidelines`.
   Audit the changed UI files for accessibility, labels, error messages, form structure, content clarity, and interface consistency.
6. QA close the change.
   Re-run the relevant Playwright tests, capture after screenshots, and update project-control docs.

Priority screens:

- Mobile Book flow.
- Mobile Garage and Vehicle Lifecycle.
- Staff Job Orders handoff/source-picking.
- Staff QA Audit Objective 5 proof.
- Staff Invoices & Orders billing/payment completion.

## UX Audit Pro Prompt

Copy this prompt into UX Audit Pro with the screenshot packet:

```text
You are reviewing AUTOCARE, a mobile and web-based service management system for an auto care center. Treat this as a panel/demo readiness UX audit, not a general visual review.

Use the attached screenshots and flow notes to identify anything confusing, risky, misleading, hard to navigate, or likely to cause a real customer/staff user to make a mistake.

Review these areas:
1. Navigation clarity: can a first-time user tell where to go next?
2. Button/action labels: are primary actions obvious and business-readable?
3. Feedback: are loading, success, error, blocked, and payment states visible and meaningful?
4. Role clarity: does each role understand what they can and cannot do?
5. Mobile usability: spacing, hierarchy, tap targets, wording, scrolling, and flow order.
6. Data clarity: no raw UUID/hash fragments where users expect booking, vehicle, job order, invoice, or transaction references.
7. Demo risk: what would confuse a panelist during a live walkthrough?

For each finding, return:
- Severity: Critical, High, Medium, or Low.
- Screen/step affected.
- What the user sees.
- Why it is confusing or risky.
- Recommended fix.
- Acceptance criteria.
- Suggested Playwright or screenshot verification.

Prioritize fixes that improve booking, garage, lifecycle, job order handoff, QA Audit Objective 5 proof, and invoice/payment completion.
```

Recommended first-pass prompt for the current review target:

```text
You are reviewing AUTOCARE, a mobile and web-based service management system for an auto care center. Start with the customer mobile Book flow. Identify which steps can be removed or merged, what is confusing, what labels/copy should change, and what Codex should rebuild first. Return findings with severity, screen/step, what the user sees, why it is confusing, recommended fix, acceptance criteria, and suggested QA check.
```

## Codex Rebuild Instruction Format

After UX Audit Pro returns findings, convert each item into this format before changing code:

| Field | Required Content |
|---|---|
| Source finding | Paste the exact UX Audit Pro finding summary. |
| Screen / flow | Name the page, role, and step. |
| User problem | Explain what the user misunderstands or cannot complete. |
| Target behavior | Describe the desired flow after restructuring. |
| UI/copy requirements | Specify labels, feedback, state copy, hierarchy, or navigation changes. |
| Files likely affected | List likely frontend files after inspecting the repo. |
| Acceptance criteria | Define what must be visible or easier after the fix. |
| QA check | Name the Playwright/manual screenshot check that will prove it. |

## Vercel Web Interface Guidelines Code Audit

Run this only after Codex restructures a screen or flow.

If the skill is active in the current Codex session, use:

```text
/web-design-guidelines <file-or-pattern>
```

Recommended targets for AUTOCARE:

| Flow | Likely Code Targets |
|---|---|
| Mobile Book | `mobile/App.js`, `mobile/src/screens/Dashboard.js` |
| Mobile Garage / Lifecycle | `mobile/src/screens/VehicleLifecycleScreen.js`, `mobile/src/lib/vehicleLifecycleClient.js` |
| Staff Job Orders | `frontend/src/screens/JobOrderWorkbench.js`, `frontend/src/lib/jobOrderWorkbenchClient.js` |
| Staff QA Audit | `frontend/src/screens/QAAuditWorkspace.js` |
| Staff Invoices & Orders | `frontend/src/screens/InvoiceOrderManagementWorkspace.js` |

Required Vercel audit output:

- `file:line` finding location when available.
- Guideline violated.
- User impact.
- Specific recommended change.
- Whether the finding is blocking for panel demo readiness.

If the skill does not appear after installation, restart Codex and verify `C:\Users\casio\.codex\skills\web-design-guidelines\SKILL.md` exists.

## Required Reviewer Output Format

Ask UX Audit Pro to return findings in this table format:

| Severity | Screen / Step | What User Sees | Why It Is Confusing | Recommended Fix | Acceptance Criteria | Suggested QA Check |
|---|---|---|---|---|---|---|
| High | Example | Example | Example | Example | Example | Example |

Severity guide:

- Critical: blocks completion, risks wrong customer/job/order/payment, or breaks panel objective proof.
- High: likely to confuse many users or cause wrong flow decisions.
- Medium: noticeable friction, unclear copy, weak visual hierarchy, or missing confirmation.
- Low: polish, consistency, or minor wording/layout improvement.

## After Feedback Returns

Convert UX Audit Pro and Vercel findings into project work:

1. Add or update `UX_AUDIT_BACKLOG.md`.
2. Link each finding to the panelist feedback item and objective it supports.
3. Implement highest-severity UX fixes first.
4. Run Vercel `web-design-guidelines` on changed UI files.
5. Add Playwright checks for labels, role-gated copy, visible feedback, readable IDs, and completed-history timing.
6. Re-run the Playwright QA suite or the targeted affected flow.
7. Update `QA_LEDGER.md`, `PANELIST_FEEDBACK_MATRIX.md`, and `OBJECTIVE_COMPLIANCE_MATRIX.md` with what passed and what remains open.

## Capture Gaps To Fill Later

The current packet is enough for an external first-pass UX critique. For a final demo packet, add these screenshots after the next full live walkthrough:

- Mobile booking confirmation after submitting two selected services.
- Reservation-fee payment screen and post-payment state.
- Staff Bookings handoff action immediately after confirming a fresh booking.
- Technician checklist/progress/evidence screen with the technician account.
- Adviser finalization and payment-recorded state in Invoices & Orders.
- Customer completed history after invoice payment.
