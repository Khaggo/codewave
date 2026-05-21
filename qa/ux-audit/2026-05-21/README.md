# AUTOCARE UX Audit Screenshot Packet - 2026-05-21

Use this folder with `docs/project-control/UX_AUDIT_PRO_HANDOFF.md` and track findings in `docs/project-control/UX_AUDIT_BACKLOG.md`.

Combined audit loop:

1. Send these screenshots and flow notes to UX Audit Pro.
2. Convert UX Audit Pro output into Codex rebuild instructions.
3. After code changes, run Vercel `web-design-guidelines` on changed UI files.
4. Close each finding with Playwright or manual screenshot evidence.

Current first-pass packet:

- Focus flow: Customer mobile Book flow
- Send first: `mobile-web-home-390-current.png`, `mobile-web-book-entry-390.png`, `mobile-web-sign-in-390.png`, `mobile-web-after-login-390.png`, `mobile-web-book-tab-390.png`, and `mobile-web-book-services-390.png`
- Reviewer ask: identify removable or mergeable steps, confusing terminology, unclear hierarchy, and what Codex should rebuild first
- Rebuild targets after findings return: `mobile/App.js` and `mobile/src/screens/Dashboard.js`

Upload cap note:

- This folder currently has more than 20 files.
- Do not upload the whole folder to UX Audit Pro.
- Default rule: upload the primary captures only, and keep supplementary captures as follow-up context if the reviewer asks.
- Best current first batch: the 6 Mobile Book images listed above.
- If a broader review is needed later, send separate batches by flow instead of one combined upload.

## Primary Captures

| File | Role / Surface | Notes |
|---|---|---|
| `mobile-web-home-390-current.png` | Customer mobile web | Mobile home/entry experience at 390px width. |
| `mobile-web-book-entry-390.png` | Customer mobile web | Unauthenticated booking guardrail. |
| `mobile-web-sign-in-390.png` | Customer mobile web | Customer sign-in screen reached from booking guardrail. |
| `mobile-web-after-login-390.png` | Customer mobile web | Authenticated customer dashboard with reservation-payment alert. |
| `mobile-web-book-tab-390.png` | Customer mobile web | Authenticated Book tab showing vehicle and multi-service booking entry. |
| `mobile-web-garage-tab-390.png` | Customer mobile web | Garage page with multiple vehicles and vehicle actions. |
| `mobile-web-lifecycle-from-garage-390.png` | Customer mobile web | Vehicle lifecycle page reached from Garage. |
| `staff-adviser-bookings-current.png` | Service adviser web | Bookings workspace after clean adviser login. |
| `staff-adviser-job-orders-current.png` | Service adviser web | Job Orders mixed source-picking state. |
| `staff-adviser-qa-audit-current.png` | Service adviser web | QA Audit queue with adviser role. |
| `staff-headtech-qa-audit-loaded-current.png` | Head technician web | Loaded QA Audit showing Objective 5 proof anchors. |
| `staff-adviser-invoices-current.png` | Service adviser web | Invoices & Orders lookup and invoice detail state. |

## Supplementary Captures

These were captured while setting up the packet and can be used as extra context, but the primary captures above are the recommended review set.

| File | Notes |
|---|---|
| `mobile-web-home-current.png` | Wider in-app browser capture of the mobile web home. |
| `mobile-web-session-entry-current.png` | Wider in-app browser capture of the mobile web entry/session state. |
| `mobile-web-home-playwright-390.png` | Alternate mobile home capture. |
| `mobile-web-book-authenticated-390.png` | Same visual state as `mobile-web-after-login-390.png`. |
| `mobile-web-book-services-390.png` | Attempted services-section capture; currently similar to the Book tab top state. |
| `mobile-web-lifecycle-entry-390.png` | Unauthenticated lifecycle guardrail capture. |
| `staff-bookings-current.png` | Superseded staff capture from an existing browser session. |
| `staff-job-orders-current.png` | Superseded staff capture from an existing browser session. |
| `staff-qa-audit-current.png` | Superseded staff capture from an existing browser session. |
| `staff-invoices-current.png` | Superseded staff capture from an existing browser session. |

## Capture Notes

- Backend, staff web, and mobile web were reachable when these screenshots were captured.
- Staff adviser captures used `qa.booking.adviser@autocare.com`.
- Head technician QA capture used `qa.booking.headtech@autocare.com`.
- Customer mobile captures used the local mobile web surface at `http://127.0.0.1:8090`.
- This packet is a UX review input, not a QA closure report. Use `qa/playwright/artifacts/qa-summary.md` for automated QA status.
