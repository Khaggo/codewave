# Implementation Roadmap

Last updated: 2026-05-23

This roadmap is ordered for panel recovery. Do not work only on nice-to-have UI polish while objective-critical features remain unproven.

## Sprint 0: Project Control and Evidence

Goal: Keep every chat aligned.

Tasks:

- Maintain `docs/project-control`.
- Keep `QA_LEDGER.md` current after every QA run.
- Keep `PANELIST_FEEDBACK_MATRIX.md` and `OBJECTIVE_COMPLIANCE_MATRIX.md` current after every fix.
- Ensure new chats use `CHAT_HANDOFF_PROMPT.md`.
- Keep the Notion AUTOCARE Wiki aligned with repo project-control docs after major QA or implementation extraction updates.
- Latest Notion implementation archive reconciled: `Extracted decisions from Implementation Chat — 2026-05-23`.
- Add a repeatable local QA startup checklist so backend, staff web, and mobile web runtimes are all up before Playwright evidence runs.
- Use the repo-root watchdog-backed runtime commands by default so one named runtime owns each expected dev port and duplicate Node/Expo spawns do not accumulate during recovery work.
- After each targeted fix, rerun Playwright promptly so patched findings move from "code-fixed" to "QA-closed".
- Latest full-system QA rerun to inherit: 20 passed / 0 failed on 2026-05-22. The automated Playwright gate is green across admin billing, Back-Jobs, booking-to-cash, multi-service booking, insurance documents/reminders, Objective 2, readable IDs, role retirement, ecommerce rewards, and adviser-owned checklist/PDF proof.
- Residual non-blocking findings to polish before demo: invoice lookup specificity, immediate invoice visibility, stale mobile completed-history refresh, completed-state timing before manual payment, non-finalized Back-Jobs negative setup, and approved lifecycle summary setup.

Acceptance:

- Future contributors can know current work, completed work, QA status, and remaining gaps by reading this folder.

## Sprint 1: Critical Demo Blockers

Goal: Fix the issues most likely to fail another panel demo.

Priority tasks:

- Re-run timed live QA for the new web/mobile session refresh recovery and keep the user signed in beyond the old 10-15 minute failure window.
- Redesign mobile booking/navigation to reduce confusion.
- Keep the now-green full one-command Playwright suite green while moving from QA recovery into demo/paper packaging.
- Human-QA PDF recovery is QA-closed for the tested checklist items: active `Book`/`Garage` refresh, no forced fallback `Body repair` selection, active-service booking blocking, Job Orders QA route, intake snapshot detail, and Dashboard Insurance launch all passed live on fresh `8096`.
- Keep Objective 2 green after the fresh lifecycle rerun now passes again with the stable API-backed booking setup.
- Keep Back-Jobs create/select finalized-origin green after the fresh rerun now passes again.
- Keep backend integration wiring for booking/job-order/insurance lifecycle helpers covered in targeted backend tests so the green Playwright suite is not the only safety net.
- Resolve or intentionally update `workspaceCopyCleanup.test.mjs`; it currently fails 19 of 25 checks and keeps usability/polish open.
- Verify the newly added customer multi-car garage flow with panel-ready evidence.
- Keep booking-to-cash, service-loyalty, and multi-service booking green in regression, then polish invoice lookup/visibility and capture panel-ready evidence for those flows.
- Insurance staff manual reminder/broadcast send is now live-closed in its own targeted rerun; next work is preserving it in regression and demo evidence.
- Prevent duplicate booking data for same customer/date/time/service.
- Treat technician login as retired. Rewrite QA evidence around admin-managed technician profiles, adviser-owned workshop stage tracking, selected specialties, checklist/task controls, evidence upload, and printable checklist PDF flow.
- Keep `docs/architecture/rbac-policy.md` synchronized with the retired-login/adviser-owned workshop model so paper, tests, and Notion do not reintroduce technician-authenticated portal assumptions.
- Billing details, quotation/pricing, and invoice display clarity are now live-closed in the latest targeted reruns; next work is demo capture and paper alignment.
- Broad readable-ID QA now passes under the adviser-owned role model; keep rerunning it on fresh listeners and do not treat retired technician login failures as product defects.
- Do not use stale `8090` evidence unless rebuilt first. Current reliable mobile evidence uses fresh `8096` runtime or an explicitly rebuilt mobile web listener.
- Preserve the now-green insurance/loyalty, booking reference, invoice selector, requested-services visibility, and session-restore checks in the full regression suite.
- Capture fresh live evidence for the new automated-proof areas: mobile multi-service booking, garage add-second-vehicle + pagination, Objective 5 discrepancy plus customer-summary walkthrough, and panel-ready screenshots/video for the now-passing broad readable-ID sweep.
- Re-run targeted manual/Playwright review for the redesigned dedicated mobile `Vehicle Timeline & Lifecycle` screen so the new showcase-style layout can count as usability/demo evidence instead of implementation-only polish.
- Live Shop/ecommerce rewards and Objective 3 admin billing are now green in the full 20/20 rerun. Next work is panel-ready evidence capture and paper alignment.
- Re-run targeted QA for customer plate-number validation, duplicate-phone rejection, and canonical duplicate-plate rejection so the new validation rules move from code-fixed to live-proven.
- Live Back-Jobs staff-linked lineage, readable-reference, full rework follow-through, return-inspection label, and unique same-day rework selector QA now pass. The only major Back-Jobs proof gap is customer initiation if the defense claims it.
- Live Admin CRUD / pricing / billing is green again in the latest targeted rerun.
- Broad readable-ID QA still passes after the Mobile Rewards and Mobile Shop Orders cleanup with ecommerce-backed staff coverage included, and Objective 2 is green again in its latest targeted rerun.
- Remaining high-value non-blocker proof work is timed session-stability evidence, staff/mobile polish findings, and paper/demo packaging.

Acceptance:

- Playwright or manual QA proves each critical flow.
- Paper can truthfully claim these capabilities.

## Sprint 2: Objective Completion

Goal: Make Objectives 1 through 5 demonstrable.

Priority tasks:

- Insurance accident workflow with supporting document requirements.
- Convert the new `docs/business-process-implementation-alignment-report.md` findings into an actual insurance roadmap: structured estimate/quotation record, insurer-submission tracking, approval-gated job-order linkage, and stronger compliance metadata.
- Loyalty qualification standards and earning rules tied to final paid invoices.
- Vehicle lifecycle timeline showing service, QA, invoice, inspection, and insurance records. This is re-closed in the latest targeted Objective 2 rerun; next work is demo capture.
- Back-job customer report and staff rework resolution flow. Staff create/select finalized-origin plus full follow-through are now green again; customer initiation remains unclaimed unless separately proven or implemented from mobile service history.
- QA discrepancy scenario using NLP/rule scoring and generated customer-facing summary.
- Admin data-entry polish for shop, catalog, inventory, services, loyalty earning-rule targeting, and service invoice detail. The latest admin rerun is now clean; next work is panel-ready evidence packaging.

Acceptance:

- Each objective has one demo script and one QA evidence record.

## Sprint 3: UX and ISO/IEC 25010 Evidence

Goal: Improve usability and produce evaluation proof.

Priority tasks:

- Mobile UI redesign pass, including the newly refreshed dedicated lifecycle screen and any follow-up adjustments needed after screenshot/manual review.
- Staff web UI polish for booking, job orders, QA audit, invoices, insurance, loyalty, and garage.
- Confirm garage pagination behavior with screenshots/QA after the new lifecycle-surface pager landed.
- Error messages and success feedback polish.
- Compatibility checks for target web/mobile environments.
- Security checks for role permissions.

Acceptance:

- ISO/IEC 25010 evaluation has evidence for functional suitability, reliability, usability, compatibility, and security.

## Sprint 4: Paper and Defense Pack

Goal: Make documentation match the system.

Priority tasks:

- Update use case diagrams.
- Update activity diagrams.
- Update FDD.
- Update system architecture figure labels.
- State exact agile methodology.
- Improve figure readability.
- Revise gap analysis table.
- Add narrative after tables.
- Integrate the captured client business process from `docs/business-process-cruisers-crib.md` into the final paper, diagrams, and gap-analysis narrative.
- Use `docs/business-process-implementation-alignment-report.md` as the paper/demo truth source for insurance approval, quotation, communication, and back-job scope boundaries.
- Update documentation based on final implemented system.

Acceptance:

- Every diagram and table matches implemented behavior.
- Every objective has supporting screenshot, QA result, or system demo path.
