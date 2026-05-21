# Implementation Roadmap

Last updated: 2026-05-22

This roadmap is ordered for panel recovery. Do not work only on nice-to-have UI polish while objective-critical features remain unproven.

## Sprint 0: Project Control and Evidence

Goal: Keep every chat aligned.

Tasks:

- Maintain `docs/project-control`.
- Keep `QA_LEDGER.md` current after every QA run.
- Keep `PANELIST_FEEDBACK_MATRIX.md` and `OBJECTIVE_COMPLIANCE_MATRIX.md` current after every fix.
- Ensure new chats use `CHAT_HANDOFF_PROMPT.md`.
- Add a repeatable local QA startup checklist so backend, staff web, and mobile web runtimes are all up before Playwright evidence runs.
- After each targeted booking-to-cash fix, rerun Playwright promptly so patched findings move from "code-fixed" to "QA-closed".

Acceptance:

- Future contributors can know current work, completed work, QA status, and remaining gaps by reading this folder.

## Sprint 1: Critical Demo Blockers

Goal: Fix the issues most likely to fail another panel demo.

Priority tasks:

- Fix mobile session persistence and expired-session behavior.
- Redesign mobile booking/navigation to reduce confusion.
- Verify the newly added customer multi-car garage flow with panel-ready evidence.
- Verify the newly added mobile multi-service booking flow with panel-ready evidence.
- Prevent duplicate booking data for same customer/date/time/service.
- Restrict technician to checklist/progress/evidence responsibilities.
- Finish billing details, quotation/pricing, and invoice display clarity.
- Broad readable-ID QA is now closed for the tested critical surfaces: Mobile Rewards loyalty activity and Mobile Shop Orders leaks were fixed, and the final sweep passed with ecommerce `3001` available.
- Rerun live `8090` panelist flow QA after the durable booking-reference patch so booking-to-cash can be re-closed with evidence.
- Rerun live `8090` panelist flow QA after the invoice-selector history patch so the new `Invoices & Orders` blocker and duplicate same-day job-order labels can be closed with evidence.
- Rerun live `8090` panelist flow QA after the mobile requested-services visibility patch and session-restore patch so the remaining mobile findings can be closed with evidence.
- Rerun live insurance/loyalty Playwright QA after the authenticated staff document-link patch so OR/CR, policy, and police report files can be marked openable/downloadable with evidence.
- Capture fresh live evidence for the new automated-proof areas: mobile multi-service booking, garage add-second-vehicle + pagination, Objective 5 discrepancy plus customer-summary walkthrough, and panel-ready screenshots/video for the now-passing broad readable-ID sweep.
- Live Shop/ecommerce rewards QA is now rerun and QA-closed for the staff manual ecommerce payment action and mobile product-code cleanup; keep the dedicated staff UI CRUD sweep for catalog, inventory, and service entries as separate follow-up work.
- Live Back-Jobs staff-linked lineage, readable-reference, full rework follow-through, return-inspection label, and unique same-day rework selector QA now pass. The only major Back-Jobs proof gap is customer initiation if the defense claims it.
- Live Admin CRUD / pricing / billing QA now passes with one remaining finding in the last recorded live evidence. Catalog hidden-state/category controls, Service Management pricing/edit/readable-code behavior, loyalty product/category pickers, and service invoice detail are QA-closed; the inventory low-stock threshold persistence bug is now code-fixed and needs the next live rerun.
- Live Objective 2 lifecycle / readable-ID recovery QA now passes on a fresh current-source mobile runtime and proves the service side, insurance timeline, explicit invoice milestones, readable Job Orders/technician labels, non-UUID invoice references, and reviewed summary render on the tested flow. Separate broad readable-ID QA now also passes after the Mobile Rewards and Mobile Shop Orders cleanup with ecommerce-backed staff coverage included.

Acceptance:

- Playwright or manual QA proves each critical flow.
- Paper can truthfully claim these capabilities.

## Sprint 2: Objective Completion

Goal: Make Objectives 1 through 5 demonstrable.

Priority tasks:

- Insurance accident workflow with supporting document requirements.
- Loyalty qualification standards and earning rules tied to final paid invoices.
- Vehicle lifecycle timeline showing service, QA, invoice, inspection, and insurance records. Fresh current-source Objective 2 recovery QA now proves the full tested flow; next work is panel-ready capture and guarding future QA from stale mobile runtime drift.
- Back-job customer report and staff rework resolution flow. Staff-linked creation, readable lineage, return-inspection display, unique rework selector labels, and full staff rework resolution now have live QA proof; remaining proof needs customer initiation only if claimed.
- QA discrepancy scenario using NLP/rule scoring and generated customer-facing summary.
- Admin data-entry polish for shop, catalog, inventory, services, loyalty earning-rule targeting, and service invoice detail. Rerun live admin QA now that the inventory stock-policy persistence bug (`6` saving as `3`) is patched, then claim Objective 3 as panel-ready if the rerun stays clean.

Acceptance:

- Each objective has one demo script and one QA evidence record.

## Sprint 3: UX and ISO/IEC 25010 Evidence

Goal: Improve usability and produce evaluation proof.

Priority tasks:

- Mobile UI redesign pass.
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
- Add client business process.
- Update documentation based on final implemented system.

Acceptance:

- Every diagram and table matches implemented behavior.
- Every objective has supporting screenshot, QA result, or system demo path.
