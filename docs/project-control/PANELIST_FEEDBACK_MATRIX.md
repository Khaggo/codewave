# Panelist Feedback Matrix

Last updated: 2026-05-23

Status legend:

- Not Started: no confirmed implementation or paper update yet.
- In Progress: partially addressed or under active work.
- Fixed: implementation/documentation updated but not fully QA proven.
- QA Passed: validated through automated or documented manual QA.
- Paper Update Needed: system may exist, but paper/diagrams/evidence still need revision.

## Ms. Abad

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| IDs | Fix vehicle ID, do not use hash. | 2, 3 | QA Passed / Monitor | The targeted blocker recovery rerun passed the broad readable-ID sweep for critical customer/adviser surfaces under the new adviser-owned workshop model. Keep monitoring untested/older records, but the latest failed blockers were not raw-ID leaks. |
| Mobile Booking | Customer should be allowed to avail multiple services. | 1 | QA Passed / Monitor | The latest May 22 whole-system Playwright rerun passed `mobile-multi-service-booking.flow.spec.mjs` as part of the green 20/20 suite on fresh listeners, so the earlier setup conflict is superseded. Keep this in regression and demo with a clean temporary vehicle. |
| Mobile Auth | Update/fix mobile session. | 1, 6 | Fixed | Mobile and staff session shells now auto-refresh active sessions every 10 minutes, refresh again on app resume / portal focus, and use refresh-token recovery during startup restore and 401-expiry events. Repo-root runtime commands now also use a single-instance watchdog so duplicate local Node or Expo listeners are less likely to pollute testing. The next step is a timed live QA run that stays signed in past the old 10-15 minute failure window. |
| Mobile UX | Mobile app should be user-friendly and not confusing; update design. | 1, 6 | QA Passed / Monitor | The guided `Service Booking` flow now uses `Choose Services`, `Active Services`, four clear booking steps, and state-based next actions. Fresh mobile helper tests, Android export, mobile screenshots, and the complete booking-to-cash Playwright journey passed on 2026-07-25. Keep first-time sign-in comprehension and vehicle-card polish in the UX backlog. |
| Staff UX | Staff booking-to-payment work should be understandable without decoding multiple panels or repeatedly finding the same record. | 1, 2, 3, 5, 6 | QA Passed / Monitor | Booking now opens on a queue-first `Needs Attention` view; schedule administration is disclosed on demand; Booking, Intake, Job Orders, QA, and Billing preserve context and share lifecycle/next-action guidance. Fresh booking-to-cash, role-access, lifecycle/readable-ID, responsive, lint, and build checks passed on 2026-07-25. |
| Garage | Customer should be able to add multiple cars. | 1, 2 | QA Passed | Live backend check shows the QA customer has four vehicles, the focused mobile garage helper passes add-vehicle, pagination, and approved-summary rendering, and the dedicated lifecycle page now promotes a clearer `Add vehicle` action in the redesigned top action row for demo use. |
| Technician | Fix technician error. | 5, 6 | QA Passed / Monitor | technician web login is intentionally retired. The new live adviser-owned workshop proof now passes for adviser Job Orders/QA Audit access, retirement copy on the retired accounts, technician-profile specialty assignment, checklist PDF export, work-item evidence guardrails, and locked save/upload actions during checklist-only execution. |
| Technician Skill | Add skill for technician. | 5 | QA Passed | Admin-managed technician profiles with specialties are now live-proven through the adviser-owned workshop checklist flow and printable checklist PDF export. |
| Garage | Use pagination for garage module. | 1, 2, 6 | QA Passed | Live mobile lifecycle QA showed pager copy `Showing 1-3 of 4 vehicles` with pager controls. |
| Objective 2 | Polish modules related to objective no. 2. | 2 | QA Passed / Monitor | A fresh May 22 rerun now passes `objective2-lifecycle-readable-ids.flow.spec.mjs` again after replacing the flaky mobile booking date-card setup with a stable live API booking setup. Keep the dedicated lifecycle screen polish in demo evidence, but the blocker itself is now closed. |
| Objective 5 | Make objective no. 5 work. | 5 | In Progress | QA release flow passed, the customer mobile lifecycle route now loads the latest customer-visible reviewed summary text, and `OBJECTIVE5_DEMO_PROOF.md` links discrepancy evidence to the UI; still need a fresh guided demo capture. |
| Booking | Data duplication happens when customer chooses same day, time, and service. | 1, 6 | QA Passed / Monitor | Active-service conflict blocking remains in place, and the focused May 22 blocker-closure rerun re-closed booking-to-cash and multi-service booking on clean temporary vehicles without duplicate same-slot acceptance. Keep the full suite deterministic, but this blocker itself is green again. |
| Billing | Billing details not fully functional. | 3, 6 | QA Passed / Monitor | Service billing, manual payment, and booking-to-cash are implemented. Residual polish remains around invoice lookup specificity, immediate just-paid invoice visibility, and completed-history refresh clarity. |
| Admin Data | Service data entries. | 3 | QA Passed / Monitor | Staff service administration and billing pass current workflow verification. Keep service-pricing proof in the panel evidence pack. |

## Ms. Tinaan

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| Technician | Technician should only be able to do checklists. | 5, 6 | QA Passed / Monitor | Because technician login is retired, this is now proven through the adviser-managed technician-profile checklist flow. Fresh live QA passed checklist PDF export, work-item photo-evidence gating before completion save, readable selected-file handling, and in-flight save/upload locking. |
| Paper Figures | Figures should be visible and readable. | 6 | Not Started | Re-export diagrams/images with readable resolution. |
| Paper Diagrams | Update use case and activity diagrams based on changes. | All | Not Started | Revise diagrams after system scope is finalized. |
| Paper Process | Improve business process document. | All | Source Captured / Needs Paper Integration | `Business-Process.pdf` has been extracted into `docs/business-process-cruisers-crib.md`. Next step is inserting the current manual process and proposed system-assisted process into the paper with diagrams. |

## Mr. Tampol

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| Insurance | Study procedure on insurance from road accidents. | 1, 2 | In Progress | The latest business-process audit is now captured in `docs/business-process-implementation-alignment-report.md`. Current system supports inquiry intake, supporting documents, workflow statuses, and reminder/broadcast flows, but still lacks a structured insurer-approval and estimate-to-job-order bridge. |
| Insurance | Apply insurance process to system including supporting documents. | 1, 2 | In Progress | Latest live QA proved OR/CR, policy, and police report stay tied to one claim and staff can open/download each uploaded file from the insurance workspace. That is only the document-handling portion. Full client process alignment still needs insurer approval gating/linkage, stronger compliance details, and honest quotation-flow wording. |
| Loyalty | Set standard requirements for customers qualified for rewards. | 1, 3 | In Progress | Loyalty points accrue only after qualifying paid service events; written qualification standards still need paper/demo documentation. |
| Pricing | Set quotation/pricing needed for services. | 3 | QA Passed / Monitor | Service pricing and service billing are now live-green again in the latest targeted admin + booking closure reruns. Remaining work is paper/demo explanation, not a current blocker. |
| Inspection | Add notes for each issue encountered during initial inspection. | 2, 5 | QA Passed | Inspection service tests pass; findings support severity and notes and staff UI displays issue notes. The selected inspection review now also exposes the captured intake snapshot/notes instead of only linked booking data. |
| IDs | Vehicle ID and transaction ID should not use hash data; generate own ID. | 2, 3 | QA Passed / Monitor | Booking, Job Order, service invoice, and Back-Job lineage labels use readable references on tested surfaces. Keep monitoring older and untested records. |
| UI | Improve UI for web and mobile. | 6 | In Progress | Job Orders/QA Audit improved, and the mobile `Vehicle Timeline & Lifecycle` page now has a cleaner showcase-style layout aimed at panel demos. Broader cross-module UI polish and fresh visual QA still remain. |
| Paper Process | Provide business process of the client. | All | Source Captured / Needs Paper Integration | Client process is now documented from `Business-Process.pdf`, and the new implementation-gap audit is in `docs/business-process-implementation-alignment-report.md`. Next step is to merge the honest supported-versus-missing insurance/back-job scope into the paper and diagrams. |
| Gap Analysis | Revise gap analysis table; use check only if applied. | All | Not Started | Align table with actual implemented features. |
| Paper Tables | Provide narrative/explanation at every end of tables. | All | Not Started | Add short explanatory paragraphs under each table. |
| Formatting | Proper indentation, e.g. page 24. | All | Not Started | Paper formatting pass. |
| Figure Labels | Label figure 1 system architecture. | All | Not Started | Add and standardize figure captions. |
| Figure Labels | Page 33 Agile methodology has no figure label. | All | Not Started | Add caption and reference. |
| Methodology | State which agile methodology is used. | All | Not Started | Choose and justify Scrum, Kanban, or Scrum-ban. |
| Diagrams | Revise diagrams based on system changes: FDD, Activity Diagram. | All | Not Started | Update diagrams after feature recovery. |
| Documentation | Revise documentation based on system changes. | All | Not Started | Sync paper to final system behavior. |
