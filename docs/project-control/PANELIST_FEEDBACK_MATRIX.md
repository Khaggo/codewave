# Panelist Feedback Matrix

Last updated: 2026-08-05

Status legend:

- Not Started: no confirmed implementation or paper update yet.
- In Progress: partially addressed or under active work.
- Fixed: implementation/documentation updated but not fully QA proven.
- QA Passed: validated through automated or documented manual QA.
- Implementation Verified: focused implementation and contract evidence is green; live Playwright or panel capture is still pending.
- Paper Update Needed: system may exist, but paper/diagrams/evidence still need revision.

## Verified Remediation Snapshot - 2026-08-05

This snapshot records only evidence verified in the current worktree. It does not replace
the dated historical QA reports below.

- Immutable persisted references are implemented for vehicles (`VEH-YYYY-NNNNNN`), Job Orders
  (`JO-YYYY-NNNNNN`), insurance inquiries (`INS-YYYY-NNNNNN`), and back-jobs (`BJ-YYYY-NNNNNN`).
  Migration `0003_panelist_alignment_ids` and the local concurrent-reference smoke proof pass.
- The lifecycle-summary provider is optional and disabled by default. The OpenAI-compatible
  adapter is review-gated; unconfigured generation is unavailable and no deterministic text is
  presented as AI.
- `GET /api/loyalty/earning-policy` exposes active customer-safe service earning rules, and the
  mobile Loyalty surface displays the policy without claiming Accessories eligibility.
- Staff/customer reference rendering, selectors, customer-safe Garage/timeline paths, and
  Insurance recovery/projection changes are present in the current implementation.
- Current focused evidence: web `230/230`, mobile `213/213`, focused backend AI/reference/loyalty
  `21/21`, migration smoke passed, contract drift passed, backend typecheck passed, and policy
  checks passed.
- Live Playwright execution and respondent survey results are not claimed by this snapshot.
  Survey status remains pending.

## Ms. Abad

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| IDs | Fix vehicle ID, do not use hash. | 2, 3 | Implementation Verified / Monitor | Persisted VEH/JO/INS/BJ references now have database ownership, deterministic backfill, uniqueness, and immutability proof. Focused presentation and customer-boundary checks are green; retain live/legacy-surface monitoring. |
| Mobile Booking | Customer should be allowed to avail multiple services. | 1 | QA Passed / Monitor | The latest May 22 whole-system Playwright rerun passed `mobile-multi-service-booking.flow.spec.mjs` as part of the green 20/20 suite on fresh listeners, so the earlier setup conflict is superseded. Keep this in regression and demo with a clean temporary vehicle. |
| Mobile Auth | Update/fix mobile session. | 1, 6 | Fixed | Mobile and staff session shells now auto-refresh active sessions every 10 minutes, refresh again on app resume / portal focus, and use refresh-token recovery during startup restore and 401-expiry events. Repo-root runtime commands now also use a single-instance watchdog so duplicate local Node or Expo listeners are less likely to pollute testing. The next step is a timed live QA run that stays signed in past the old 10-15 minute failure window. |
| Mobile UX | Mobile app should be user-friendly and not confusing; update design. | 1, 6 | QA Passed / Monitor | The guided `Service Booking` flow now uses `Choose Services`, `Active Services`, four clear booking steps, and state-based next actions. Fresh mobile helper tests, Android export, mobile screenshots, and the complete booking-to-cash Playwright journey passed on 2026-07-25. Keep first-time sign-in comprehension and vehicle-card polish in the UX backlog. |
| Staff UX | Staff booking-to-payment work should be understandable without decoding multiple panels or repeatedly finding the same record. | 1, 2, 3, 5, 6 | QA Passed / Monitor | Booking now opens on a queue-first `Needs Attention` view; schedule administration is disclosed on demand; Booking, Intake, Job Orders, QA, and Billing preserve context and share lifecycle/next-action guidance. Fresh booking-to-cash, role-access, lifecycle/readable-ID, responsive, lint, and build checks passed on 2026-07-25. |
| Garage | Customer should be able to add multiple cars. | 1, 2 | QA Passed | Live backend check shows the QA customer has four vehicles, the focused mobile garage helper passes add-vehicle, pagination, and approved-summary rendering, and the dedicated lifecycle page now promotes a clearer `Add vehicle` action in the redesigned top action row for demo use. |
| Technician | Fix technician error. | 5, 6 | QA Passed / Monitor | technician web login is intentionally retired. The new live adviser-owned workshop proof now passes for adviser Job Orders/QA Audit access, retirement copy on the retired accounts, technician-profile specialty assignment, checklist PDF export, work-item evidence guardrails, and locked save/upload actions during checklist-only execution. |
| Technician Skill | Add skill for technician. | 5 | QA Passed | Admin-managed technician profiles with specialties are now live-proven through the adviser-owned workshop checklist flow and printable checklist PDF export. |
| Garage | Use pagination for garage module. | 1, 2, 6 | QA Passed | Live mobile lifecycle QA showed pager copy `Showing 1-3 of 4 vehicles` with pager controls. |
| Objective 2 | Polish modules related to objective no. 2. | 2 | QA Passed / Monitor | A fresh May 22 rerun now passes `objective2-lifecycle-readable-ids.flow.spec.mjs` again after replacing the flaky mobile booking date-card setup with a stable live API booking setup. Keep the dedicated lifecycle screen polish in demo evidence, but the blocker itself is now closed. |
| Objective 5 | Make objective no. 5 work. | 5 | Implementation Verified / Demo Pending | The current tree contains the review-gated optional AI provider, deterministic QA/risk controls, customer-safe lifecycle evidence, and focused AI/reference tests. A fresh guided live demo capture remains pending. |
| Booking | Data duplication happens when customer chooses same day, time, and service. | 1, 6 | QA Passed / Monitor | Active-service conflict blocking remains in place, and the focused May 22 blocker-closure rerun re-closed booking-to-cash and multi-service booking on clean temporary vehicles without duplicate same-slot acceptance. Keep the full suite deterministic, but this blocker itself is green again. |
| Billing | Billing details not fully functional. | 3, 6 | QA Passed / Monitor | Service billing, manual payment, and booking-to-cash are implemented. Residual polish remains around invoice lookup specificity, immediate just-paid invoice visibility, and completed-history refresh clarity. |
| Admin Data | Service data entries. | 3 | QA Passed / Monitor | Staff service administration and billing pass current workflow verification. Keep service-pricing proof in the panel evidence pack. |

## Ms. Tinaan

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| Technician | Technician should only be able to do checklists. | 5, 6 | QA Passed / Monitor | Because technician login is retired, this is now proven through the adviser-managed technician-profile checklist flow. Fresh live QA passed checklist PDF export, work-item photo-evidence gating before completion save, readable selected-file handling, and in-flight save/upload locking. |
| Paper Figures | Figures should be visible and readable. | 6 | Paper Update Needed | Canonical Mermaid sources now reflect the current service-only role boundary, Accessories scope, persisted references, and review-gated AI. Rendered paper figures still need a human readability check. |
| Paper Diagrams | Update use case and activity diagrams based on changes. | All | Implementation Verified / Paper Update Needed | `docs/team-flow-combined-mermaid.md`, `docs/team-flow-operational-state-machine.md`, and `docs/team-flow-staff-admin-web-lifecycle.md` now describe the current workflow. Transfer the sources into the manuscript after the latest DOCX is supplied. |
| Paper Process | Improve business process document. | All | Implementation Verified / Paper Update Needed | `docs/business-process-cruisers-crib.md` remains the captured client source; `docs/business-process-implementation-alignment-report.md` now records verified scope and explicit gaps. |

## Mr. Tampol

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| Insurance | Study procedure on insurance from road accidents. | 1, 2 | Implementation Verified / Scope Honest | Insurance remains guided inquiry, supporting-document collection, staff review, customer-visible updates, and status tracking. The alignment report explicitly records that insurer approval, structured estimates, and repair authorization are not implemented. |
| Insurance | Apply insurance process to system including supporting documents. | 1, 2 | Implementation Verified / Scope Honest | Server-authoritative requirements, retry-safe inquiry recovery, customer-safe projections, and staff document review are documented in the insurance domain. Optional police reports/photos remain optional until a business rule changes. |
| Loyalty | Set standard requirements for customers qualified for rewards. | 1, 3 | Implementation Verified / Paper Update Needed | The earning-policy endpoint and mobile "How to earn" display expose active service rules and formula summaries. Accessories purchases are explicitly excluded; paper-facing qualification wording still needs the final manuscript pass. |
| Pricing | Set quotation/pricing needed for services. | 3 | QA Passed / Monitor | Service pricing and service billing are now live-green again in the latest targeted admin + booking closure reruns. Remaining work is paper/demo explanation, not a current blocker. |
| Inspection | Add notes for each issue encountered during initial inspection. | 2, 5 | QA Passed | Inspection service tests pass; findings support severity and notes and staff UI displays issue notes. The selected inspection review now also exposes the captured intake snapshot/notes instead of only linked booking data. |
| IDs | Vehicle ID and transaction ID should not use hash data; generate own ID. | 2, 3 | Implementation Verified / Monitor | Vehicles, Job Orders, Insurance inquiries, and Back-Jobs now expose persisted readable references; invoice and lineage presentation uses those references or `Reference unavailable`. Keep monitoring older and untested surfaces. |
| UI | Improve UI for web and mobile. | 6 | Implementation Verified / Visual QA Pending | Reference-safe staff/mobile surfaces, Garage consolidation, selectors, Loyalty policy presentation, and loading/empty/error coverage are implemented and covered by the current focused test counts. Live viewport/Playwright review remains a separate evidence step. |
| Paper Process | Provide business process of the client. | All | Implementation Verified / Paper Update Needed | Client process remains captured in `docs/business-process-cruisers-crib.md`; the alignment report now separates implemented workflow, partial alignment, and deferred scope. |
| Gap Analysis | Revise gap analysis table; use check only if applied. | All | Not Started | Align table with actual implemented features. |
| Paper Tables | Provide narrative/explanation at every end of tables. | All | Not Started | Add short explanatory paragraphs under each table. |
| Formatting | Proper indentation, e.g. page 24. | All | Not Started | Paper formatting pass. |
| Figure Labels | Label figure 1 system architecture. | All | Paper Update Needed | Canonical architecture and process sources are synchronized; add final captions and cross-references during the manuscript pass. |
| Figure Labels | Page 33 Agile methodology has no figure label. | All | Paper Update Needed | The methodology is now declared Kanban in the control pack; add the final figure label when the latest DOCX is supplied. |
| Methodology | State which agile methodology is used. | All | Implementation Verified / Paper Update Needed | Kanban is the declared methodology: work is pulled through explicit ready/in-progress/review/verified states with visible WIP and evidence gates. |
| Diagrams | Revise diagrams based on system changes: FDD, Activity Diagram. | All | Implementation Verified / Paper Update Needed | Current Mermaid sources were synchronized to the service-only role model, Accessories boundary, persisted references, and review-gated AI. Final paper export remains pending. |
| Documentation | Revise documentation based on system changes. | All | Implementation Verified / Paper Update Needed | The canonical control pack and domain docs now record the verified implementation; the thesis manuscript still requires the latest DOCX before final editing. |
