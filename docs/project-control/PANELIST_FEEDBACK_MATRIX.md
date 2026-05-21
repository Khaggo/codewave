# Panelist Feedback Matrix

Last updated: 2026-05-22

Status legend:

- Not Started: no confirmed implementation or paper update yet.
- In Progress: partially addressed or under active work.
- Fixed: implementation/documentation updated but not fully QA proven.
- QA Passed: validated through automated or documented manual QA.
- Paper Update Needed: system may exist, but paper/diagrams/evidence still need revision.

## Ms. Abad

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| IDs | Fix vehicle ID, do not use hash. | 2, 3 | QA Passed | Backend booking references are persisted as durable `BK-YYYYMMDD-0001` business IDs, Job Orders handoff candidates receive the same reference mobile uses, invoice selector labels prefer source booking references over duplicate `JO-...-WORK` fallbacks, Back-Jobs primary detail/table raw UUID display is QA-closed, and the final broad readable-ID sweep passed with ecommerce `3001` available and no structured findings. |
| Mobile Booking | Customer should be allowed to avail multiple services. | 1 | In Progress | Live `8090` Playwright proved one booking can store two requested services, and the mobile booking history/detail screen now renders explicit requested-service chips; rerun live panel QA to close the post-submit visibility finding. |
| Mobile Auth | Update/fix mobile session. | 1, 6 | In Progress | Mobile app shell now persists and rehydrates saved sessions through AsyncStorage-backed startup restore; targeted mobile tests and Expo export pass, but live device/manual refresh, expiry, and LAN API host QA are still needed. |
| Mobile UX | Mobile app should be user-friendly and not confusing; update design. | 1, 6 | In Progress | UX Audit Pro findings are now ingested in `UX_AUDIT_BACKLOG.md`, and the first-pass Mobile Book redesign is code-patched with friendlier sign-in, clearer booking labels, guided step order, and human-readable reservation fee urgency; send the new Book flow to the QA chat for Playwright/manual screenshot verification before moving to Garage, Lifecycle, and secondary modules. |
| Garage | Customer should be able to add multiple cars. | 1, 2 | QA Passed | Live mobile lifecycle QA added vehicles through the customer UI and verified the expanded garage state. |
| Technician | Fix technician error. | 5, 6 | In Progress | Head-tech QA issue fixed; still need technician checklist-only role cleanup. |
| Technician Skill | Add skill for technician. | 5 | Not Started | Clarify as technician checklist/work skill set; implement guided checklist flow. |
| Garage | Use pagination for garage module. | 1, 2, 6 | QA Passed | Live mobile lifecycle QA showed pager copy `Showing 1-3 of 4 vehicles` with pager controls. |
| Objective 2 | Polish modules related to objective no. 2. | 2 | QA Passed | Fresh May 22 live Objective 2 rerun against a clean current-source mobile runtime passed with no structured findings and proved the unified vehicle timeline now shows insurance history together with service, QA, invoice/payment, and reviewed summary milestones. Keep separate demo-polish work for panel-ready screenshots/video, not core objective functionality. |
| Objective 5 | Make objective no. 5 work. | 5 | In Progress | QA release flow passed, the customer mobile lifecycle route now loads the latest customer-visible reviewed summary text, and `OBJECTIVE5_DEMO_PROOF.md` links discrepancy evidence to the UI; still need a fresh guided demo capture. |
| Booking | Data duplication happens when customer chooses same day, time, and service. | 1, 6 | QA Passed | Same-slot conflict/availability tests pass and the latest full Playwright evidence pack has no duplicate-booking finding. |
| Billing | Billing details not fully functional. | 3, 6 | QA Passed | Ecommerce invoice lookup, staff manual ecommerce payment, and staff service invoice detail are QA-closed in the latest admin rerun; invoice detail shows reference, invoice total, subtotal, reservation-fee deduction, total, and payment state. |
| Admin Data | Data entries: shop, catalog, service. | 3 | In Progress | Dedicated admin CRUD QA now closes catalog hidden-state/category controls, Service Management pricing/edit/readable-code behavior, loyalty pickers, and invoice detail. The last remaining inventory stock-policy threshold finding (`6` saved as `3`) is now code-fixed and backend-verified; rerun live admin QA to close it with evidence. |

## Ms. Tinaan

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| Technician | Technician should only be able to do checklists. | 5, 6 | In Progress | Role access and backend restrictions pass, and latest Back-Jobs full rework QA proves technician progress/evidence can complete a rework job; technician UI still needs a checklist-first workflow with evidence only. |
| Paper Figures | Figures should be visible and readable. | 6 | Not Started | Re-export diagrams/images with readable resolution. |
| Paper Diagrams | Update use case and activity diagrams based on changes. | All | Not Started | Revise diagrams after system scope is finalized. |
| Paper Process | Improve business process document. | All | Not Started | Write client current process and proposed system process. |

## Mr. Tampol

| Area | Feedback | Related Objective | Status | Next Action |
|---|---|---:|---|---|
| Insurance | Study procedure on insurance from road accidents. | 1, 2 | In Progress | Insurance claim/document features exist and latest QA proves OR/CR, policy, and police report can stay on one request; real road-accident claim steps and document standards still need mapping. |
| Insurance | Apply insurance process to system including supporting documents. | 1, 2 | QA Passed | Latest live QA proved OR/CR, policy, and police report stay tied to one claim and staff can open/download each uploaded file from the insurance workspace. |
| Loyalty | Set standard requirements for customers qualified for rewards. | 1, 3 | In Progress | Latest live QA proves service and ecommerce loyalty points accrue only after qualifying paid invoice events, not reservation fee, cart add, order creation, unpaid invoice, or partial payment; written qualification standards still need paper/demo documentation. |
| Pricing | Set quotation/pricing needed for services. | 3 | QA Passed | Reservation fee and ecommerce invoice payment paths pass; latest admin QA proves Service Management can create services with visible `Base Price (PHP)` and backend `basePriceCents`, and service invoice detail renders total/subtotal/reservation-fee deduction. |
| Inspection | Add notes for each issue encountered during initial inspection. | 2, 5 | QA Passed | Inspection service tests pass; findings support severity and notes and staff UI displays issue notes. |
| IDs | Vehicle ID and transaction ID should not use hash data; generate own ID. | 2, 3 | QA Passed | Booking references are persisted unique business IDs, ecommerce order/invoice references show `ORD-...` / `INV-...`, mobile Shop product detail prefers product code, Back-Jobs lineage labels are readable, and Service Management now uses readable service codes instead of raw UUIDs. The broad May 22 readable-ID sweep is automated and passes after the Mobile Rewards and Mobile Shop Orders cleanup with ecommerce `3001` available. |
| UI | Improve UI for web and mobile. | 6 | In Progress | Job Orders/QA Audit improved; broader UI polish still needed. |
| Paper Process | Provide business process of the client. | All | Not Started | Document current manual workflow and system-assisted workflow. |
| Gap Analysis | Revise gap analysis table; use check only if applied. | All | Not Started | Align table with actual implemented features. |
| Paper Tables | Provide narrative/explanation at every end of tables. | All | Not Started | Add short explanatory paragraphs under each table. |
| Formatting | Proper indentation, e.g. page 24. | All | Not Started | Paper formatting pass. |
| Figure Labels | Label figure 1 system architecture. | All | Not Started | Add and standardize figure captions. |
| Figure Labels | Page 33 Agile methodology has no figure label. | All | Not Started | Add caption and reference. |
| Methodology | State which agile methodology is used. | All | Not Started | Choose and justify Scrum, Kanban, or Scrum-ban. |
| Diagrams | Revise diagrams based on system changes: FDD, Activity Diagram. | All | Not Started | Update diagrams after feature recovery. |
| Documentation | Revise documentation based on system changes. | All | Not Started | Sync paper to final system behavior. |
