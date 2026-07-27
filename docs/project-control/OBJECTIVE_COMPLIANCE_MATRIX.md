# Objective Compliance Matrix

Last updated: 2026-07-25

The panel said only one objective was considered passed. This file tracks what must be proven for each objective.

## Objective 1

Objective:

Design a mobile application that lets users book an appointment, view and purchase automotive products, earn rewards, and submit insurance requests.

Current status: QA Passed / Monitor

Evidence available:

- The latest one-command full-system Playwright rerun on 2026-05-22 passed `20` of `20` tests. It covers booking-to-cash, mobile multi-service booking, Shop/ecommerce rewards, insurance request/document handling, insurance reminder/broadcast, active-tab refresh, active-service booking block, Dashboard Insurance launcher, and service-loyalty paid-invoice timing.
- Earlier 17/20 and targeted-only recovery results are superseded by the latest 20/20 full-system rerun, but remain useful as historical evidence of which blockers were recovered.
- A targeted recovery verification pass on 2026-05-21 patched customer same-slot availability conflicts and reservation-fee reference persistence, with backend tests and web build passing.
- Historical panelist QA passed mobile session/access, legacy technician access checks, insurance screen structure, insurance module view tests, and Android export. Current role truth has since changed: technician authenticated portals are retired and replaced by adviser-owned technician-profile workflow proof.
- Targeted source/helper proof now verifies that the mobile booking composer keeps multi-service selection state and submits the live `serviceIds` payload.
- Targeted source/helper proof now verifies that the customer garage/lifecycle screen supports adding another vehicle and paginating owned vehicles.
- The panelist flow QA on 2026-05-21 proved live mobile multi-service booking stores two requested services when run against `QA_MOBILE_BASE_URL=http://127.0.0.1:8090`.
- The panelist flow QA on 2026-05-21 proved live customer garage add-vehicle and pagination behavior.
- A targeted mobile proof pass on 2026-05-21 now verifies that booking history/detail render explicit requested-service chips for multi-service bookings and that the app shell persists/restores signed-in sessions across refreshes.
- A session-stability recovery patch on 2026-05-22 now refreshes customer mobile sessions during startup hydration, every 10 minutes while active, when the app returns to the foreground, and when a 401-expiry event is detected. The staff web shell now refreshes stored sessions during restore, every 10 minutes while active, when the portal regains focus/visibility, and on staff-session unauthorized events before falling back to login.
- A first-pass Mobile Book UX redesign is now code-patched from UX Audit Pro findings, including friendlier booking sign-in copy, a clearer dashboard next-step card, guided four-step booking order, and human-readable reservation fee urgency text.
- Fresh 2026-07-25 evidence passes the complete mobile-to-staff booking-to-cash journey, all 71 mobile helper tests, Android export, and mobile-width visual inspection of the customer surface.
- A human-QA PDF closure rerun on 2026-05-22 now live-proves active `Book` tab re-tap refresh, active `Garage` tab refresh, no forced fallback service auto-selection after clearing chosen services, Dashboard Insurance launch to the request/home surface, and booking rejection when the same vehicle still has an active service job order in `assigned`, `in_progress`, `blocked`, or `ready_for_qa`.
- Insurance QA on 2026-05-21 proves OR/CR, policy, and police report uploads can remain attached to one insurance request, and staff API can read the same three documents.
- Loyalty QA on 2026-05-21 proves service rewards do not accrue from reservation-fee payment or unpaid finalization, and accrue after the qualifying paid service invoice event.
- Shop/ecommerce QA on 2026-05-21 proves customer mobile checkout can create an ecommerce order/invoice, Rewards updates only after the fully paid ecommerce invoice, and reward unlock progress reflects the new balance.

Gaps:

- The workshop execution model has moved away from technician login. Current live QA covers admin-managed non-auth technician profiles, selected specialties, adviser-owned stage tracking, checklist/PDF proof, and retired-login messaging.
- Human-QA PDF recovery is QA-closed for the tested checklist items, and insurance staff manual reminder/broadcast send is now also live QA-closed.
- Mobile and web session refresh are now code-patched and build/export verified, but still need a timed live proof that stays signed in beyond the old 10-15 minute failure window.
- The first-pass Mobile Book redesign now has Playwright, helper-test, Android-export, and mobile-width screenshot evidence. Keep the first-time sign-in comprehension check and vehicle-card polish as targeted follow-ups.
- The dedicated mobile `Vehicle Timeline & Lifecycle` screen now also has a panel/demo-oriented redesign in the current tree with compact top actions, stronger hero hierarchy, clearer vehicle selection, and more polished empty states; keep fresh screenshots/manual QA alongside the existing functional proof.
- Customer multiple vehicles and garage pagination have current proof through a focused helper test plus live backend data showing four vehicles for the QA customer; the lifecycle redesign now presents that multi-vehicle context more clearly for demos, but keep this in the repeatable Playwright setup instead of relying on ad hoc data.
- Multiple services per booking is green in the latest full-suite run.
- Shop/product purchase and ecommerce reward timing are re-closed live in both targeted evidence and the latest full-system rerun.
- Customer plate entry and customer/staff PH mobile number validation are now stronger in source: mobile customer forms normalize/validate plate numbers, backend vehicle writes reject malformed/canonical-duplicate plates, and backend user writes reject duplicate active phone numbers. These are implementation-verified, not yet live QA-closed.
- Ecommerce paid-order rewards and service paid-invoice rewards both pass in the latest full-suite run; written qualification standards still need paper/demo documentation.
- Insurance request flow supports multi-file same-request storage and staff open/download now passes live QA; road-accident process requirements still need completion.
- The new business-process audit confirms the current insurance module is still inquiry/document/workflow tracking, not a full structured insurer-approval and estimate-to-job-order bridge. Do not over-claim insurer approval gating or built-in chat/push scope in Objective 1 paper/demo material.

Required proof:

- Mobile E2E covering login persistence, multi-car garage, multi-service booking, shop purchase, reward display, and insurance request submission.

## Objective 2

Objective:

Develop a module that consolidates every service record and insurance-related transaction on a customer's vehicle into a unified timeline.

Current status: QA Passed / Monitor

Evidence available:

- Vehicle lifecycle-related modules exist in the codebase.
- Booking-to-cash flow creates service/invoice records.
- The panelist QA audit passed vehicle lifecycle, vehicle, inspection, insurance, job-order, invoice, and quality-gate related service/view tests.
- Targeted source/helper proof now verifies garage pagination, add-another-vehicle flow wiring, and customer-visible reviewed lifecycle summary rendering.
- The panelist flow QA verified the live mobile lifecycle pager and a customer-visible reviewed summary card after adviser approval.
- Fresh Objective 2 Playwright QA on 2026-05-21 created a live service flow for the seeded vehicle, created a same-vehicle insurance request, verified staff insurance visibility, verified mobile service lifecycle milestones, and verified the reviewed summary card.
- A targeted Objective 2 recovery verification pass on 2026-05-21 proved in code that `/api/vehicles/:id/timeline` can project insurance inquiry/record events plus explicit invoice/payment milestones, that Job Orders/workbench detail prefers readable customer/vehicle labels, and that service invoice references no longer derive from job-order UUID fragments.
- A fresh targeted May 22 live rerun on a clean current-source mobile runtime (`QA_MOBILE_BASE_URL=http://127.0.0.1:8096`) previously passed end to end with no structured findings and proved the same tested vehicle timeline includes insurance request/history evidence alongside booking, job order, QA, invoice/payment, and reviewed summary milestones.
- A fresh May 22 rerun now passes `objective2-lifecycle-readable-ids.flow.spec.mjs` again after switching the setup from the flaky mobile date-card path to a stable live authenticated booking-create path.

Gaps:

- The unified timeline now has current live proof in the adviser-owned technician-profile workflow too, but it still needs panel-ready screenshots/video for defense materials.
- The earlier May 22 negative rerun against `8090` is now known to have been a stale-runtime false signal. Future Objective 2 QA should treat a fresh current-source mobile runtime as the source of truth when `8090` copy/reference behavior drifts from the checked-in code.
- Explicit invoice/payment milestones and the previous Job Orders/readable-ID leaks are now proven clean on the fresh current-source rerun. The broader all-surface readable-ID sweep is now automated and passes after the Mobile Rewards activity and Mobile Shop Orders cleanup, including ecommerce-backed staff surfaces with `3001` available.
- Initial inspection issue notes are supported, and the customer lifecycle screen now renders approved summary text; the dedicated lifecycle screen has a new showcase-style visual treatment, but a fresh panel-ready screenshot/manual capture path is still needed.
- Insurance-related transactions are only partially aligned with the real business process because the timeline can show inquiry/record events, but the system still lacks structured insurance estimate, insurer-submission, and approval-gated repair linkage.

Required proof:

- Keep `objective2-lifecycle-readable-ids.flow.spec.mjs` green in regression, then demo one vehicle timeline showing booking, job order, QA, invoice/payment, insurance request, inspection issues, and generated lifecycle summary with panel-ready screenshots/video.

## Objective 3

Objective:

Develop a web application for administrators to manage booking, inventory, create loyalty rewards, and configure earning rules.

Current status: QA Passed / Monitor

Evidence available:

- Staff web supports booking schedule, job orders, QA audit, invoices.
- Admin CRUD/pricing/billing, booking-to-cash, service paid-invoice loyalty, and Shop/ecommerce rewards all passed in the latest 20/20 full-system rerun on fresh listeners.
- Earlier focused blocker-closure reruns on 2026-05-22 re-closed booking-to-cash, service paid-invoice loyalty, and customer Shop/ecommerce rewards before they were superseded by the green full-system pass.
- Job Orders source-picking and evidence-feedback recovery fixes were applied on 2026-05-21 and passed frontend build verification.
- The panelist QA audit passed staff web build plus inventory, loyalty, invoice/order, QA audit, insurance, back-job, vehicle records, and booking service helper/view tests.
- Targeted proof tests now verify readable booking/job-order references across the critical booking, Job Orders, QA Audit, and invoice lookup screens.
- A human-QA PDF closure rerun on 2026-05-22 live-proves the Job Orders banner `QA Audit` CTA opens `/admin/qa-audit` and selected intake inspection detail shows captured intake snapshot/notes.
- Insurance/loyalty QA on 2026-05-21 proves backend insurance document storage, staff insurance open/download, and service paid-invoice loyalty accrual timing.
- Shop/ecommerce rewards QA on 2026-05-21 proves staff catalog visibility for a runtime-created product, customer mobile checkout, staff UI partial/final ecommerce payment recording, ecommerce paid-invoice reward accrual, Reward Config versus Earning Rules separation, deactivated reward behavior, deactivated earning-rule behavior, and adviser lockout from direct earning-rule configuration.
- Admin CRUD / pricing / billing QA on 2026-05-21 proves staff can create catalog products/categories, create inventory-backed products, adjust inventory quantity, create active/inactive booking services, view Reward Config separately from Earning Rules, and complete ecommerce billing from `Invoices & Orders`.
- The panelist flow QA on 2026-05-21 found a fresh booking-to-cash blocker: Job Orders handoff references could render as `BK-YYYYMMDD-PENDING` and fail to match the customer-visible booking reference.
- A targeted recovery patch on 2026-05-21 persists durable booking references through Job Orders handoff candidates, and the latest full rerun confirms the booking-to-cash flow remains green.
- A follow-up recovery patch on 2026-05-21 removes the current-month blind spot from `Invoices & Orders` service-record loading and makes selector labels prefer unique source booking references; the latest full rerun is green, with residual polish around invoice lookup specificity and immediate visibility.

Gaps:

- Shop/catalog/runtime-created product visibility, customer checkout/rewards, and admin billing follow-through pass in the latest full-system rerun.
- Service pricing, inventory threshold persistence, and finalized service invoice proof are now all green in the latest admin rerun; the remaining Objective 3 gaps are paper/demo documentation rather than blocker defects.
- Loyalty earning logic has both ecommerce paid-invoice proof and service paid-invoice proof in the latest full rerun.
- Staff insurance document review open/download behavior is QA-closed for locally uploaded OR/CR, policy, and police report files.
- Billing details and quotation/pricing are green for admin, ecommerce, and service booking-to-cash surfaces in the latest full rerun. Residual polish remains around invoice lookup specificity and immediate visibility.
- Latest live QA confirms the patched booking-reference handoff stays functional through booking-to-cash. Residual UX polish remains because the just-paid invoice reference was not always immediately visible without extra selector interaction.

Required proof:

- Keep the admin CRUD/pricing/billing Playwright flow green, and keep booking-to-cash green so service billing remains proven from customer booking through paid invoice and completed history.

## Objective 4

Objective:

Develop a module to oversee back-job or rework cases reported by a customer.

Current status: QA Passed / Monitor

Evidence available:

- Back-jobs module exists in staff navigation and backend references.
- The panelist QA audit passed `back-jobs.service.spec.ts` and the staff back-jobs view helper test.
- Live Playwright QA on 2026-05-21 passed the staff-linked Back-Jobs flow: a service adviser created a back-job from a finalized prior job order, the created record retained customer/vehicle/original job order/booking lineage, and a non-finalized job order was rejected as invalid origin work.
- The same run verified the rework job-order action is gated until the selected back-job is approved for rework and has no linked rework job order.
- A follow-up live Playwright rerun on 2026-05-21 verified the staff Back-Jobs detail/table no longer expose raw UUIDs for the case, customer, vehicle, original job order, or original booking lineage.
- The full follow-through QA on 2026-05-21 created completed return inspection evidence and confirmed pre-approval rework creation stays blocked, but then failed at the first staff status transition with a false optimistic-concurrency 409.
- A targeted backend recovery patch on 2026-05-21 now makes `BackJobsRepository.updateStatus` use millisecond-safe `updatedAt` matching, and focused backend service/integration/repository verification now passes.
- The final live follow-through rerun on 2026-05-21 passed: completed return inspection evidence, approval to rework, linked rework job order creation, technician-profile progress/evidence, QA release, adviser finalization, and resolved back-job outcome.
- A fresh May 22 rerun now passes the create/select finalized-origin path again, so both Back-Jobs creation and full follow-through are live-green in the current model.
- The Back-Jobs polish live rerun on 2026-05-21 passed with no findings: linked return-inspection display no longer exposes the raw UUID after approval, and same-day rework job-order selector labels no longer duplicate across adviser, QA Audit, or technician selector steps.

Gaps:

- Need customer report path proof if the final demo claims customer self-service back-job initiation.
- Current honest position from the business-process audit: back-jobs are staff-managed in the implemented product. Customer self-service initiation must stay unclaimed unless separately built and QA-proven.

Required proof:

- Keep the staff create/select finalized-origin path green, then add E2E/manual QA for customer back-job report only if the final defense claims customer self-service initiation.

## Objective 5

Objective:

Integrate a quality audit service completion module using NLP and a rule-based scoring model to detect discrepancies, plus generative AI for customer-facing summaries.

Current status: In Progress

Evidence available:

- Playwright QA passed the current adviser-owned workshop path: technician-profile assignment, progress/evidence/checklist controls, QA release, and adviser finalization.
- A fresh May 22 checklist-only workshop rerun now passes adviser-owned technician-profile checklist PDF export, work-item evidence gating, readable selected-file handling, and in-flight save/upload locking.
- Backend quality-gate services and QA Audit workspace exist.
- technician web login is now intentionally retired; current role proof is through adviser-owned QA Audit access plus explicit retired-login copy for the old accounts.
- The panelist QA audit passed quality-gate service specs covering semantic/rule findings and QA verdict behavior.
- `docs/project-control/OBJECTIVE5_DEMO_PROOF.md` now ties together the backend discrepancy engine, QA Audit visible risk/finding sections, and the customer-facing lifecycle summary route.
- Targeted proof tests now verify QA Audit risk/discrepancy section anchors plus customer mobile rendering of the reviewed lifecycle summary.
- The panelist flow QA verified live QA Audit anchors for Risk Score, Semantic Match, Blocking Findings, and Review Needed, and verified a customer-visible reviewed summary card after adviser approval.

Gaps:

- Visible proof of NLP/rule scoring outputs now exists in automated view/source checks plus backend specs, but a guided panel demo capture is still missing.
- Customer-facing generative AI summary text is now exposed on the mobile lifecycle route and has live reviewed-summary proof; it still needs repeatable Playwright data setup.
- Discrepancy scenario proof now exists in backend QA specs and the Objective 5 proof note, but not yet in a fresh panel-style live walkthrough.
- Technician should be checklist-only. This is now live-proven under the retired-login adviser-owned technician-profile workflow; remaining work is demo capture and broader Objective 5 walkthrough evidence.

Required proof:

- E2E or guided QA showing evidence gap/discrepancy detection, risk score, NLP/rule finding, adviser-owned QA release/blocking verdict, and generated customer summary.

## Objective 6

Objective:

Evaluate the mobile and web application using ISO/IEC 25010 focused on functional suitability, reliability, usability, compatibility, and security.

Current status: In Progress / Automated Gate Green

Evidence available:

- Playwright QA suite exists, and the latest full-system rerun passes: `20` passed, `0` failed.
- Role access and validation tests exist.
- The latest full-system rerun confirms panel-critical areas are green together: adviser-owned Job Orders/QA Audit access, retired-login copy, critical-surface readable-ID sweep, mobile Shop/ecommerce rewards, admin billing, Objective 2, Back-Jobs finalized-origin/follow-through, insurance reminder/broadcast send, checklist-only workshop proof, booking-to-cash, service-loyalty booking setup, and mobile multi-service booking.
- Targeted regression verification on 2026-05-21 passed after patching the four residual booking-to-cash QA findings in code.
- The panelist QA audit added backend, staff web, mobile helper/view, Android export, and objective-level evidence in `docs/project-control/PANELIST_SYSTEM_QA_AUDIT_2026-05-21.md`.
- Insurance/loyalty QA on 2026-05-21 added targeted backend, helper/view, and live Playwright evidence; the final live rerun passed staff insurance document open/download behavior and service-payment loyalty timing.
- Shop/ecommerce rewards QA on 2026-05-21 added live Playwright evidence for customer checkout, staff UI ecommerce invoice payment timing, mobile Rewards update, loyalty admin role separation, staff catalog visibility, and no raw mobile product UUID display.
- Repo-root runtime commands now use a single-instance watchdog for the main backend, ecommerce backend, staff web, and Expo listeners so local QA evidence is less likely to be polluted by duplicate Node or Expo processes on the same ports.
- A fresh 2026-07-25 staff usability pass made Booking queue-first, preserved record context through Intake, Job Orders, QA, and Billing, added shared lifecycle/next-action guidance, and replaced long QA/Billing selection dropdowns with searchable queues. The booking-to-cash, role-access, and Objective 2 lifecycle/readable-ID Playwright runs all passed.

Gaps:

- Need formal ISO/IEC 25010 evaluation table with metrics, tools, respondents/testers, and results.
- Broader usability evidence is improved with fresh end-to-end and responsive proof. The older `workspaceCopyCleanup.test.mjs` result still needs reconciliation with the approved queue-first staff UX standard.
- technician web login has been intentionally retired. Any QA helper, paper section, or Playwright test that still expects those roles to sign in must be rewritten around adviser-owned technician profiles, specialties, checklist/progress/evidence, and QA release.
- Need compatibility evidence for mobile/web environments.
- Need security evidence beyond role access.

Required proof:

- Evaluation chapter/table with QA results, usability testing, compatibility matrix, security role tests, and reliability defect log.
