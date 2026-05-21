# Objective Compliance Matrix

Last updated: 2026-05-22

The panel said only one objective was considered passed. This file tracks what must be proven for each objective.

## Objective 1

Objective:

Design a mobile application that lets users book an appointment, view and purchase automotive products, earn rewards, and submit insurance requests.

Current status: In Progress

Evidence available:

- Playwright QA covers customer mobile login, booking with seeded vehicle, reservation fee flow, and completed history after service/payment.
- The latest AI-assisted Playwright rerun is green again and includes the full booking-to-cash flow in addition to role and access checks.
- A targeted recovery verification pass on 2026-05-21 patched customer same-slot availability conflicts and reservation-fee reference persistence, with backend tests and web build passing.
- The panelist QA audit passed mobile session/access, technician mobile access, insurance screen structure, insurance module view tests, and Android export.
- Targeted source/helper proof now verifies that the mobile booking composer keeps multi-service selection state and submits the live `serviceIds` payload.
- Targeted source/helper proof now verifies that the customer garage/lifecycle screen supports adding another vehicle and paginating owned vehicles.
- The panelist flow QA on 2026-05-21 proved live mobile multi-service booking stores two requested services when run against `QA_MOBILE_BASE_URL=http://127.0.0.1:8090`.
- The panelist flow QA on 2026-05-21 proved live customer garage add-vehicle and pagination behavior.
- A targeted mobile proof pass on 2026-05-21 now verifies that booking history/detail render explicit requested-service chips for multi-service bookings and that the app shell persists/restores signed-in sessions across refreshes.
- A first-pass Mobile Book UX redesign is now code-patched from UX Audit Pro findings, including friendlier booking sign-in copy, a clearer dashboard next-step card, guided four-step booking order, and human-readable reservation fee urgency text.
- Insurance QA on 2026-05-21 proves OR/CR, policy, and police report uploads can remain attached to one insurance request, and staff API can read the same three documents.
- Loyalty QA on 2026-05-21 proves service rewards do not accrue from reservation-fee payment or unpaid finalization, and accrue after the qualifying paid service invoice event.
- Shop/ecommerce QA on 2026-05-21 proves customer mobile checkout can create an ecommerce order/invoice, Rewards updates only after the fully paid ecommerce invoice, and reward unlock progress reflects the new balance.

Gaps:

- Mobile session persistence now has targeted source/view proof for AsyncStorage-backed restore, but still needs real device/manual restart and expiry proof.
- Mobile UX is confusing and needs redesign.
- The first-pass Mobile Book redesign is code-patched but still needs Playwright/manual screenshot verification before it can count as usability evidence.
- Customer multiple vehicles and garage pagination now have live proof; keep this in the repeatable Playwright setup instead of relying on ad hoc data.
- Multiple services per booking now have live storage proof plus targeted history/detail visibility proof; it still needs a fresh live panel QA rerun to close the customer-facing visibility finding.
- Shop/product purchase flow now has live QA proof, and the ecommerce UX follow-up rerun QA-closed the staff manual payment action plus business-readable mobile product code.
- Rewards service-payment and ecommerce paid-order timing now have live proof; written qualification standards still need completion.
- Insurance request flow supports multi-file same-request storage and staff open/download now passes live QA; road-accident process requirements still need completion.

Required proof:

- Mobile E2E covering login persistence, multi-car garage, multi-service booking, shop purchase, reward display, and insurance request submission.

## Objective 2

Objective:

Develop a module that consolidates every service record and insurance-related transaction on a customer's vehicle into a unified timeline.

Current status: QA Passed on Tested Flow / Demo Polish Remaining

Evidence available:

- Vehicle lifecycle-related modules exist in the codebase.
- Booking-to-cash flow creates service/invoice records.
- The panelist QA audit passed vehicle lifecycle, vehicle, inspection, insurance, job-order, invoice, and quality-gate related service/view tests.
- Targeted source/helper proof now verifies garage pagination, add-another-vehicle flow wiring, and customer-visible reviewed lifecycle summary rendering.
- The panelist flow QA verified the live mobile lifecycle pager and a customer-visible reviewed summary card after adviser approval.
- Fresh Objective 2 Playwright QA on 2026-05-21 created a live service flow for the seeded vehicle, created a same-vehicle insurance request, verified staff insurance visibility, verified mobile service lifecycle milestones, and verified the reviewed summary card.
- A targeted Objective 2 recovery verification pass on 2026-05-21 proved in code that `/api/vehicles/:id/timeline` can project insurance inquiry/record events plus explicit invoice/payment milestones, that Job Orders/workbench detail prefers readable customer/vehicle labels, and that service invoice references no longer derive from job-order UUID fragments.
- A fresh May 22 live rerun on a clean current-source mobile runtime (`QA_MOBILE_BASE_URL=http://127.0.0.1:8096`) passed end to end with no structured findings and proved the same tested vehicle timeline includes insurance request/history evidence alongside booking, job order, QA, invoice/payment, and reviewed summary milestones.

Gaps:

- Timeline needs UX polish and panel-ready proof.
- The earlier May 22 negative rerun against `8090` is now known to have been a stale-runtime false signal. Future Objective 2 QA should treat a fresh current-source mobile runtime as the source of truth when `8090` copy/reference behavior drifts from the checked-in code.
- Explicit invoice/payment milestones and the previous Job Orders/readable-ID leaks are now proven clean on the fresh current-source rerun. The broader all-surface readable-ID sweep is now automated and passes after the Mobile Rewards activity and Mobile Shop Orders cleanup, including ecommerce-backed staff surfaces with `3001` available.
- Initial inspection issue notes are supported, and the customer lifecycle screen now renders approved summary text; a polished demo screenshot path is still needed.

Required proof:

- Demo one vehicle timeline showing booking, job order, QA, invoice/payment, insurance request, inspection issues, and generated lifecycle summary, plus panel-ready screenshots/video captured from a fresh current-source runtime.

## Objective 3

Objective:

Develop a web application for administrators to manage booking, inventory, create loyalty rewards, and configure earning rules.

Current status: In Progress

Evidence available:

- Staff web supports booking schedule, job orders, QA audit, invoices.
- Booking-to-cash QA passed through staff web.
- Job Orders source-picking and evidence-feedback recovery fixes were applied on 2026-05-21 and passed frontend build verification.
- The panelist QA audit passed staff web build plus inventory, loyalty, invoice/order, QA audit, insurance, back-job, vehicle records, and booking service helper/view tests.
- Targeted proof tests now verify readable booking/job-order references across the critical booking, Job Orders, QA Audit, and invoice lookup screens.
- Insurance/loyalty QA on 2026-05-21 proves backend insurance document storage, staff insurance open/download, and service paid-invoice loyalty accrual timing.
- Shop/ecommerce rewards QA on 2026-05-21 proves staff catalog visibility for a runtime-created product, customer mobile checkout, staff UI partial/final ecommerce payment recording, ecommerce paid-invoice reward accrual, Reward Config versus Earning Rules separation, deactivated reward behavior, deactivated earning-rule behavior, and adviser lockout from direct earning-rule configuration.
- Admin CRUD / pricing / billing QA on 2026-05-21 proves staff can create catalog products/categories, create inventory-backed products, adjust inventory quantity, create active/inactive booking services, view Reward Config separately from Earning Rules, and complete ecommerce billing from `Invoices & Orders`.
- The panelist flow QA on 2026-05-21 found a fresh booking-to-cash blocker: Job Orders handoff references could render as `BK-YYYYMMDD-PENDING` and fail to match the customer-visible booking reference.
- A targeted recovery patch on 2026-05-21 now persists durable booking references on the backend and passes that same reference through Job Orders handoff candidates; this fix is test-verified and awaiting a fresh live rerun.
- A follow-up recovery patch on 2026-05-21 now removes the current-month blind spot from `Invoices & Orders` service-record loading and makes selector labels prefer unique source booking references when available; this is locally verified and awaiting a fresh live rerun.

Gaps:

- Shop/catalog/runtime-created product visibility and basic staff CRUD now have live E2E proof. The latest admin QA rerun closes catalog hidden-state/category controls, Service Management pricing/edit/readable-code behavior, loyalty product/category pickers, and service invoice detail; the remaining Objective 3 admin-data blocker, inventory low-stock threshold persistence, is now code-fixed and awaiting a fresh live rerun.
- Service pricing is live QA-closed for the tested admin flow: Service Management creates services with visible `Base Price (PHP)`, persists backend `basePriceCents`, and service invoice detail renders total/subtotal/reservation-fee deduction.
- Loyalty earning logic has service-payment and ecommerce paid-order live proof, but written standards still need documentation.
- Staff insurance document review open/download behavior is QA-closed for locally uploaded OR/CR, policy, and police report files.
- Billing details and quotation/pricing have live admin QA evidence for service invoice detail and service price/rate configuration; the remaining admin blocker is inventory threshold persistence, now code-fixed pending live rerun, not billing detail.
- Live panel QA must confirm the patched booking-reference handoff stays consistent from mobile booking history through Job Orders creation and that `Invoices & Orders` now surfaces the just-finalized service record reliably.

Required proof:

- Staff admin E2E rerun confirming the inventory stock-policy persistence fix so edited low-stock thresholds save correctly in live staff QA.

## Objective 4

Objective:

Develop a module to oversee back-job or rework cases reported by a customer.

Current status: Staff-Linked Full Rework E2E Passed / Customer Initiation Unproven

Evidence available:

- Back-jobs module exists in staff navigation and backend references.
- The panelist QA audit passed `back-jobs.service.spec.ts` and the staff back-jobs view helper test.
- Live Playwright QA on 2026-05-21 passed the staff-linked Back-Jobs flow: a service adviser created a back-job from a finalized prior job order, the created record retained customer/vehicle/original job order/booking lineage, and a non-finalized job order was rejected as invalid origin work.
- The same run verified the rework job-order action is gated until the selected back-job is approved for rework and has no linked rework job order.
- A follow-up live Playwright rerun on 2026-05-21 verified the staff Back-Jobs detail/table no longer expose raw UUIDs for the case, customer, vehicle, original job order, or original booking lineage.
- The full follow-through QA on 2026-05-21 created completed return inspection evidence and confirmed pre-approval rework creation stays blocked, but then failed at the first staff status transition with a false optimistic-concurrency 409.
- A targeted backend recovery patch on 2026-05-21 now makes `BackJobsRepository.updateStatus` use millisecond-safe `updatedAt` matching, and focused backend service/integration/repository verification now passes.
- The final live follow-through rerun on 2026-05-21 passed: completed return inspection evidence, approval to rework, linked rework job order creation, technician progress/evidence, head-technician QA release, adviser finalization, and resolved back-job outcome.
- The Back-Jobs polish live rerun on 2026-05-21 passed with no findings: linked return-inspection display no longer exposes the raw UUID after approval, and same-day rework job-order selector labels no longer duplicate across adviser, QA Audit, or technician selector steps.

Gaps:

- Staff-linked creation, lineage proof, raw-UUID display cleanup for primary lineage, and full staff-linked rework follow-through now have live QA evidence.
- Need customer report path proof if the final demo claims customer self-service back-job initiation.

Required proof:

- E2E/manual QA for customer back-job report only if the final defense claims customer self-service initiation.

## Objective 5

Objective:

Integrate a quality audit service completion module using NLP and a rule-based scoring model to detect discrepancies, plus generative AI for customer-facing summaries.

Current status: In Progress

Evidence available:

- Playwright QA passed technician progress/evidence, ready-for-QA, head technician release, adviser finalization.
- Backend quality-gate services and QA Audit workspace exist.
- Head technician access bug was fixed and QA passed.
- The panelist QA audit passed quality-gate service specs covering semantic/rule findings and head-technician verdict behavior.
- `docs/project-control/OBJECTIVE5_DEMO_PROOF.md` now ties together the backend discrepancy engine, QA Audit visible risk/finding sections, and the customer-facing lifecycle summary route.
- Targeted proof tests now verify QA Audit risk/discrepancy section anchors plus customer mobile rendering of the reviewed lifecycle summary.
- The panelist flow QA verified live QA Audit anchors for Risk Score, Semantic Match, Blocking Findings, and Review Needed, and verified a customer-visible reviewed summary card after adviser approval.

Gaps:

- Visible proof of NLP/rule scoring outputs now exists in automated view/source checks plus backend specs, but a guided panel demo capture is still missing.
- Customer-facing generative AI summary text is now exposed on the mobile lifecycle route and has live reviewed-summary proof; it still needs repeatable Playwright data setup.
- Discrepancy scenario proof now exists in backend QA specs and the Objective 5 proof note, but not yet in a fresh panel-style live walkthrough.
- Technician should be checklist-only.

Required proof:

- E2E or guided QA showing evidence gap/discrepancy detection, risk score, NLP/rule finding, head technician blocked/pass verdict, and generated customer summary.

## Objective 6

Objective:

Evaluate the mobile and web application using ISO/IEC 25010 focused on functional suitability, reliability, usability, compatibility, and security.

Current status: In Progress

Evidence available:

- Playwright QA suite exists and currently passes.
- Role access and validation tests exist.
- The latest AI-assisted Playwright rerun confirms both role-access coverage and the critical booking-to-cash lifecycle pass.
- Targeted regression verification on 2026-05-21 passed after patching the four residual booking-to-cash QA findings in code.
- The panelist QA audit added backend, staff web, mobile helper/view, Android export, and objective-level evidence in `docs/project-control/PANELIST_SYSTEM_QA_AUDIT_2026-05-21.md`.
- Insurance/loyalty QA on 2026-05-21 added targeted backend, helper/view, and live Playwright evidence; the final live rerun passed staff insurance document open/download behavior and service-payment loyalty timing.
- Shop/ecommerce rewards QA on 2026-05-21 added live Playwright evidence for customer checkout, staff UI ecommerce invoice payment timing, mobile Rewards update, loyalty admin role separation, staff catalog visibility, and no raw mobile product UUID display.

Gaps:

- Need formal ISO/IEC 25010 evaluation table with metrics, tools, respondents/testers, and results.
- Need broader usability evidence for web/mobile.
- Need compatibility evidence for mobile/web environments.
- Need security evidence beyond role access.

Required proof:

- Evaluation chapter/table with QA results, usability testing, compatibility matrix, security role tests, and reliability defect log.
