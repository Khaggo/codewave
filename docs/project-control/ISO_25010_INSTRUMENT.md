# ISO/IEC 25010 Evaluation Instrument

Last updated: 2026-08-05

Status: Automated evidence recorded; respondent survey pending.

## Purpose

This instrument evaluates the current AUTOCARE service-management product against the ISO/IEC
25010 characteristics that are relevant to the panel objectives. It combines repeatable
repository evidence with a five-point usability survey. It does not convert test counts into
customer satisfaction scores and does not fabricate respondents or results.

## Scope

- Customer mobile: authentication/session recovery, Home, Garage, Booking, Insurance, Loyalty,
  approved Accessories pickup, notifications, and profile.
- Staff web: Booking/Intake, Job Orders, QA Audit, Billing, Insurance, Back-Jobs, Loyalty, and
  staff administration for service advisers and super admins.
- Backend: persisted business references, customer-safe projections, review-gated lifecycle
  summaries, loyalty earning policy, migration compatibility, and role boundaries.

Technicians are non-login operational profiles. Insurance remains guided claim assistance and
document tracking. Accessories is mobile-only, single-shop pickup and is separate from service
invoices, Job Orders, QA, and loyalty accrual.

## Automated Evidence Snapshot

Evidence date: 2026-08-05.

| Characteristic | Evidence source | Current result | Boundary |
| --- | --- | --- | --- |
| Functional suitability | Web/mobile focused suites, backend AI/reference/loyalty tests, contract checks | Web `230/230`, mobile `213/213`, backend focus `21/21` | Live Playwright flow results are not claimed by this snapshot. |
| Performance efficiency | Bounded queue/Garage/timeline implementations and pagination tests | Implementation evidence present | Production latency and capacity remain unknown until telemetry exists. |
| Compatibility | Mobile/web viewport requirements and Storybook fixtures | Targets documented; fixtures added | Live viewport execution remains pending. |
| Usability | Reference-safe labels, selectors, Garage consolidation, loading/empty/error states, Storybook coverage | Implementation evidence present | Panel capture and user comprehension results remain pending. |
| Reliability | Migration smoke, concurrent-reference proof, retry-safe Insurance behavior, provider failure tests | Passed focused checks | No claim is made for a new live end-to-end run. |
| Security | Customer-safe payload checks, role/policy checks, AI evidence filtering, no UUID display fallbacks | Passed focused checks/policy gate | Broader penetration testing is outside this instrument. |
| Maintainability | Contract drift, backend typecheck, policy checks, framework-independent helpers/tests | Passed | This is repository evidence, not a production maintainability score. |
| Portability | Existing mobile export and responsive surface requirements | Existing export evidence retained; targets documented | New export/browser execution is pending for this snapshot. |

Machine-readable collection is implemented by `tools/iso-25010-evidence.mjs`. The collector marks
the test run as missing, observed, or observed with failures from actual Playwright JSON; it never
infers a result. Its survey object is always `pending` until a real instrument run is supplied.

## Usability Survey

### Respondent instructions

Ask each respondent to complete only the workflows relevant to their role, then answer each item
from 1 to 5:

1. Strongly disagree
2. Disagree
3. Neither agree nor disagree
4. Agree
5. Strongly agree

Record role, device class, workflow completed, date, and an anonymous respondent code. Do not
record customer names, passwords, tokens, or case references in the survey file.

### Customer items

| ID | Statement |
| --- | --- |
| C1 | I could tell what the next action was on the Home screen. |
| C2 | I could add or select the correct vehicle without confusion. |
| C3 | Booking services, vehicle, schedule, and review appeared in a clear order. |
| C4 | Insurance requirements and request status were understandable. |
| C5 | I could recover my request or history after returning to the app. |
| C6 | Buttons, labels, errors, and loading states were easy to understand on my device. |

### Staff items

| ID | Statement |
| --- | --- |
| S1 | The queue showed me which record needed attention first. |
| S2 | I could identify a customer, vehicle, Job Order, and insurance case without raw IDs. |
| S3 | Ownership, blockers, and the next action were clear at each handoff. |
| S4 | Job Order and QA actions prevented me from acting on the wrong record. |
| S5 | I could move a record from Booking/Intake through QA, finalization, and payment without losing context. |
| S6 | Error, conflict, empty, and success states explained what I should do next. |

### Analysis rule

Report item-level response counts, median, and interquartile range by role and device class. Do
not collapse the survey into a single quality claim when a critical journey has fewer than five
valid respondents. Keep raw responses separate from the repository and record the collection date
and sampling method in the final paper.

## Compatibility Checklist

Before marking compatibility complete, execute and attach evidence for:

- staff web at `1440x900` and `1024x768`;
- customer mobile at `320x640`, `390x844`, and `430x932`;
- no horizontal overflow, clipped labels, covered controls, or broken safe-area padding;
- keyboard/focus recovery for forms and dialogs;
- reduced-motion and dynamic text checks where supported;
- authenticated customer and staff role boundaries at each surface.

## Defense Evidence Rules

- Cite the command, fixture, or screenshot for every automated claim.
- Mark live Playwright, panel capture, and survey results as pending until actually executed.
- Keep dated historical reports linked as history; do not relabel old results as current.
- A passing focused test supports implementation confidence but does not prove production capacity,
  user satisfaction, or a successful live deployment.
