# AUTOCARE Paper Changes Guide

Date: 2026-05-23
Status: Paper-only guidance for documentation updates based on the current paper, canonical architecture docs, live repo code, project-control QA status, and the Notion implementation-chat extraction

## Purpose

This guide is for teammates who will update the AUTOCARE paper.

It focuses only on what should be changed in the document itself. It does not cover system implementation work or code-level changes. Those stay in [autocare-paper-system-alignment-report.md](./autocare-paper-system-alignment-report.md).

## Short Version

The good news is that the paper does not need a full rewrite, but it does need a targeted alignment pass before panel defense.

The main direction is still good:
- web stays `Next.js`
- mobile stays `React Native`
- the chatbot stays a FAQ and common-inquiry assistant

What needs attention is mostly wording and scope:
- the workshop model must be updated to the current adviser-owned flow
- technician web login should be described as retired, not active staff portals
- technician support should be described as non-auth technician profiles with specialties, assignments, checklist/PDF proof, and evidence guardrails
- insurance should be described honestly as inquiry/document/workflow tracking today, not as a complete insurer-approval and quotation engine
- customer self-service back-job initiation should not be claimed unless it is separately implemented and proven
- the latest QA truth is a green automated Playwright gate: 20 passed, 0 failed
- Objectives 1, 2, 3, and 4 are QA Passed / Monitor, Objective 5 is still In Progress, and Objective 6 is Automated Gate Green but still needs ISO/IEC 25010 write-up
- loyalty needs a clearer definition for ecommerce earning
- notifications should reflect email-only current scope
- chatbot wording should be separated from generative AI features
- auth and integration wording should match the current target system
- session recovery, plate validation, duplicate phone protection, readable IDs, multiple vehicles, multi-service booking, and insurance supporting documents should be reflected as current system capabilities or evidence-backed recovery items

## What We Can Keep

These parts are already pointing in the right direction and can stay with little or no change:

- The web direction is good. The paper already aligns with a `Next.js` web application.
- The mobile direction is good. The paper already aligns with a `React Native` customer mobile app.
- The idea of a 24/7 FAQ-style chatbot is also good. That still fits the current intended product behavior.
- The general service-management direction is still valid, but the paper must describe the current adviser-owned workshop implementation instead of old technician-authenticated portals.
- The objective structure can stay, but objective evidence must be updated to match the latest QA status.

## What Should Be Updated

### 1. Clarify the product surfaces

The paper should reflect that the project now has both:
- a real web app in `frontend/`
- a real mobile app in `mobile/`

Right now, some wording still sounds like mobile is only a future direction. For the paper, it would be better to describe web and mobile as active product surfaces.

### 2. Tighten the loyalty wording

The paper says loyalty points are earned from completed service work and ecommerce purchases. That direction is fine and should stay.

What needs to be clearer is what counts as an ecommerce purchase. In the paper, this should mean a paid or settled ecommerce order or invoice, not:
- cart creation
- checkout start
- invoice creation by itself
- unpaid order state

This small clarification will prevent confusion later.

### 3. Update the workshop and role model

The paper must no longer describe technician web logins as active product flows.

Use this current model instead:
- service advisers own the active workshop flow
- service advisers confirm bookings, create job orders, assign technician profiles, advance stages, record evidence, perform QA release, finalize work, and hand off to billing
- technicians are non-auth profiles with specialties, not authenticated staff users
- each job-order assignment can store the selected technician profile and selected specialty
- checklist-only proof is handled through adviser-owned checklist/progress/evidence controls and printable checklist PDF
- retired technician login attempts should show clear retirement copy

This affects role descriptions, use case diagrams, activity diagrams, FDD, RBAC/security discussion, and screenshots.

### 4. Update the job-order and QA release process

The current workshop stages are:
- `Received`
- `Diagnosis`
- `In Repair`
- `Quality Check`
- `Ready`

The paper should describe these as adviser-owned stage tracking. It should not rely on the old assumption that a technician logs in and drives workshop progress.

QA release should be described as part of the active adviser-owned staff flow. Super admin remains high-trust, but the defense should not claim that a separate retired QA role login is required for release.

### 5. Update Objective 2 lifecycle wording

Objective 2 should now explicitly describe one vehicle timeline that can show:
- booking/service history
- job-order/workshop stages
- QA release events
- invoice generation and payment milestones
- insurance inquiry and document history
- approved customer-visible reviewed summary when available

The paper should emphasize that service and insurance records are shown together in one lifecycle view instead of being isolated modules.

### 6. Update the QA evidence wording

The latest automated QA status should be reflected carefully:
- full Playwright gate: 20 passed, 0 failed
- Objective 1: QA Passed / Monitor
- Objective 2: QA Passed / Monitor
- Objective 3: QA Passed / Monitor
- Objective 4: QA Passed / Monitor
- Objective 5: In Progress
- Objective 6: In Progress / Automated Gate Green

Do not over-claim Objective 5. The QA Audit anchors and backend proof exist, but the guided NLP/rule/generative-summary demo still needs panel-style capture.

### 7. Update validation and session wording

The paper should now reflect these implementation recovery items:
- customer mobile and staff web session refresh/recovery are implementation-patched
- timed live session-stability proof is still pending
- plate-number normalization and duplicate-plate checks were strengthened
- duplicate active Philippine mobile phone numbers are rejected in backend user writes
- booking while the same vehicle has an active service job is blocked

### 8. Update readable-ID wording

Panel feedback specifically said not to use hash data for vehicle IDs and transaction IDs.

The paper should state that critical customer/staff surfaces use business-readable references where users need them:
- booking references such as `BK-...`
- job-order references such as `JO-...`
- invoice/order references such as `INV-...` / `ORD-...`
- product codes/SKUs
- readable customer, vehicle, back-job, inspection, and lineage labels

Raw UUIDs may still exist internally as database identifiers, but they should not be presented as the primary business reference in user-facing flows.

### 9. Update the notification wording

The paper currently reads as if push notifications are part of the present scope.

For now, the safer wording is that current notification scope is email-based. If the paper still wants to mention push notifications, it should be described as a possible future enhancement, not as a current feature.

### 10. Separate chatbot language from generative AI language

The paper should clearly distinguish between:
- the chatbot, which is a FAQ and common-inquiry assistant with escalation
- generative AI features, which are used for reviewed summaries and support functions

This matters because otherwise the paper can accidentally imply that AUTOCARE already has a customer-facing generative chatbot, which is not the intended direction.

### 11. Update the target auth wording

The paper should describe the target direction as:
- `Google verification + email OTP`

If username/password flows are still mentioned, they should be framed as legacy or transition behavior, not as the long-term target model.

### 12. Correct the integration wording

The paper currently says there is no real-time third-party integration. That is too broad now.

The updated paper should acknowledge the approved external exceptions that already matter to the system direction:
- Google identity verification
- SMTP email delivery
- governed AI-provider integration policy

### 13. Update the paper and diagram backlog from panel feedback

The paper still needs:
- readable figures
- updated use case diagrams
- updated activity diagrams
- updated FDD
- labeled system architecture figure
- labeled Agile methodology figure
- stated Agile methodology
- revised gap analysis table
- narrative after tables
- client business process
- documentation alignment with the final implemented system

### 14. Add the client business process from the uploaded PDF

The client business process source is now captured in `docs/business-process-cruisers-crib.md` from `C:\Users\casio\Downloads\Business-Process.pdf`.

The paper should summarize:
- walk-in and routine service intake
- insurance-claim intake and insurer approval
- supporting document collection such as OR/CR, previous policy, and police report when required
- complaint/back-job handling as a high-priority trust-protection process
- payment confirmation and proof-of-payment tracking
- current manual bottlenecks from Messenger coordination, laptop-bound quotation work, missing verbal details, payment proof chasing, and insurance deadline risk
- proposed centralized mobile/web system support for customer self-service, insurance documents, quotations, status tracking, payment evidence, lifecycle history, and marketing/promotions

Be careful not to over-claim unsupported features. If direct chat, push notifications, or monetized SaaS expansion are discussed, frame them as proposed or future direction unless current QA/product evidence supports them.

### 15. Add the insurance and back-job scope boundaries clearly

The latest business-process alignment audit is in `docs/business-process-implementation-alignment-report.md`.

Use that audit to keep the paper honest:

- The current system supports insurance inquiry intake, supporting-document upload, reminder/broadcast flows, and staff-managed workflow statuses.
- The current system does not yet implement a full structured insurance estimate engine with insurer submission tracking, insurer decision metadata, and approved-estimate-to-job-order linkage.
- The current system should not be described as automatically blocking workshop execution based on insurer approval unless that bridge is added in code.
- Customer self-service back-job initiation should not be claimed. The current implemented and QA-proven path is staff-managed back-job intake and rework handling.
- Built-in direct chat between staff and customers should stay future/proposed wording unless an actual chat feature is implemented.

## Suggested Writing Direction

If the team wants a simple editing approach, this is the safest direction to follow:

- Keep the product vision.
- Do not rewrite the entire paper.
- Update the wording in the sections that describe roles, workshop flow, job orders, QA release, loyalty, notifications, chatbot scope, auth, integrations, validation, readable IDs, and QA evidence.
- Make the paper read as a current product-and-architecture description, not as an early concept draft.
- Treat screenshots and walkthrough evidence as part of the paper update, not only as demo material.

## Recommended Edit Checklist

- Keep `Next.js` for web.
- Keep `React Native` for mobile.
- Describe `frontend/` and `mobile/` as real product surfaces.
- Replace old technician authenticated portal wording with the adviser-owned workshop model.
- Describe technicians as non-auth profiles with specialties, assignments, checklist/PDF proof, and evidence requirements.
- Describe workshop stages as adviser-owned: `Received`, `Diagnosis`, `In Repair`, `Quality Check`, `Ready`.
- Describe QA release as part of the active service-adviser staff flow.
- Update Objective 2 to show service, QA, invoice/payment, insurance, and summary records in one vehicle timeline.
- Include the latest automated QA status: 20 passed, 0 failed.
- Mark Objective 5 as In Progress until guided discrepancy/NLP/rule/generative-summary proof is captured.
- Keep loyalty from service work and ecommerce purchases, but define ecommerce earning as paid or settled purchase facts only.
- Replace current-scope push wording with email-only wording.
- Keep the chatbot FAQ-oriented and escalation-aware.
- Separate chatbot behavior from generative AI summary features.
- Update auth wording to `Google verification + email OTP`.
- Update the integration section so approved external exceptions are described accurately.
- Add validation/security notes for session recovery, plate normalization, duplicate active phone rejection, role-access boundaries, and readable business references.
- Update diagrams and business process documentation to match the adviser-owned model.
- Add the client business process from `docs/business-process-cruisers-crib.md`.
- Use `docs/business-process-implementation-alignment-report.md` when writing the insurance, communication, and back-job sections so the paper does not over-claim unsupported flows.

## Source Material Checked

- `c:\Users\casio\Downloads\Copy of AUTOCARE.md`
  - loyalty direction: lines 29 and 501
  - auth and integration wording: lines 67 and 509-517
  - web and mobile framework direction: lines 331-342
  - chatbot, AI summary, and QA wording: lines 23-27, 41-48, and 426
  - push-notification wording: line 416
- Notion: `Extracted decisions from Implementation Chat — 2026-05-23`
- Notion: `Current QA and project-control dashboard — 2026-05-23`
- `C:\Users\casio\Downloads\Business-Process.pdf`
- `docs/business-process-cruisers-crib.md`
- `docs/business-process-implementation-alignment-report.md`
- `docs/project-control/CURRENT_STATE.md`
- `docs/project-control/QA_LEDGER.md`
- `docs/project-control/PANELIST_FEEDBACK_MATRIX.md`
- `docs/project-control/OBJECTIVE_COMPLIANCE_MATRIX.md`
- `docs/project-control/IMPLEMENTATION_ROADMAP.md`
- `docs/architecture/rbac-policy.md`

## Reference Sources Used

- `docs/architecture/system-architecture.md`
- `docs/architecture/auth-security-policy.md`
- `docs/architecture/api-strategy.md`
- `docs/architecture/domain-map.md`
- `docs/architecture/domains/main-service/chatbot.md`
- `docs/architecture/domains/main-service/notifications.md`
- `docs/architecture/domains/main-service/loyalty.md`
- `docs/architecture/tasks/05-client-integration/README.md`
- `mobile/package.json`
- `frontend/package.json`
