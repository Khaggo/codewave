# AUTOCARE Business-Process Implementation Alignment Report

Date: 2026-08-05
Status: Business-process audit against the uploaded `Business-Process.pdf`, the captured repo source in `docs/business-process-cruisers-crib.md`, and the current AUTOCARE implementation

## Purpose

This report compares the client's real business process with what AUTOCARE actually implements today.

It is intentionally strict:

- implemented means the current system has an actual product or workflow surface for it
- partial means the system models some of the process, but not the whole business requirement
- missing means the paper or demo must not claim it as implemented

## Current Remediation Evidence

The following changes are verified in the current worktree and are separate from the historical
live-flow notes retained in this report:

- Vehicle, Job Order, insurance inquiry, and back-job records now have additive, persisted,
  immutable business references (`VEH-YYYY-NNNNNN`, `JO-YYYY-NNNNNN`, `INS-YYYY-NNNNNN`, and
  `BJ-YYYY-NNNNNN`) through migration `0003_panelist_alignment_ids`. Migration smoke and the
  concurrent reference proof passed.
- Insurance remains a guided inquiry and document-tracking workflow. Customer recovery is
  server-backed and customer projections exclude internal notes, actor identifiers, deduplication
  metadata, and raw source identifiers. This does not add insurer approval or repair authorization.
- Lifecycle summaries use an optional OpenAI-compatible provider that is disabled by default. Safe
  evidence filtering, provenance, failure handling, and adviser/super-admin review gating are
  implemented; no unconfigured output is presented as AI.
- Active service earning rules are available through the customer-safe loyalty earning-policy
  endpoint and mobile display. Accessories purchases are not represented as eligible rewards.
- Current focused verification reports web `230/230`, mobile `213/213`, focused backend
  AI/reference/loyalty `21/21`, migration smoke, contract drift, backend typecheck, and policy
  checks passed. This section does not claim a new live Playwright run or survey results.

## Executive Summary

| Area | Current implementation status | Severity | Honest conclusion |
| --- | --- | --- | --- |
| Insurance approval flow | Partial | Critical | AUTOCARE supports insurance inquiry intake, document uploads, and internal workflow states, but it does not yet implement a structured insurer-approval-to-job-order bridge. |
| Insurance compliance details | Partial | High | CTPL/comprehensive, OR/CR, policy, police report, renewal, and payment-status concepts exist, but previous-policy specificity, filing-deadline tracking, and stronger compliance blocking are incomplete. |
| Insurance quotation / estimate flow | Partial | Critical | AUTOCARE has `quotation` purpose and `estimate` as a document type, but no structured staff estimate builder, submitted-to-insurer state, or approved-estimate handoff into service billing/job orders. |
| Communication and alerts | Partial | Medium | Manual reminder/broadcast and notification flows exist. Built-in direct staff/customer chat and current-scope push notifications are not implemented and should not be claimed. |
| Customer back-job initiation | Missing | High | Staff-linked back-job intake and rework follow-through are implemented and QA-proven. Customer self-service back-job initiation from mobile service history is not implemented and must not be claimed. |

## Evidence Reviewed

Business-process source:

- `C:\Users\casio\Downloads\Business-Process.pdf`
- `docs/business-process-cruisers-crib.md`

Current system source:

- `backend/apps/main-service/src/modules/insurance/`
- `backend/apps/main-service/src/modules/job-orders/`
- `backend/apps/main-service/src/modules/back-jobs/`
- `mobile/src/screens/InsuranceInquiryScreen.js`
- `docs/architecture/domains/main-service/insurance.md`
- `docs/architecture/domains/main-service/job-orders.md`
- `docs/architecture/domains/main-service/back-jobs.md`

## 1. Insurance Approval Flow

### What is already implemented

- Customer/staff insurance inquiry intake exists.
- The system distinguishes `ctpl` and `comprehensive`.
- The system tracks insurance workflow statuses including:
  - `submitted`
  - `needs_documents`
  - `under_review`
  - `for_approval`
  - `approved`
  - `payment_pending`
  - `active`
  - `for_renewal`
  - `rejected`
  - `cancelled`
  - `closed`
- Supporting documents can be attached to one insurance request.
- Staff can review and update insurance workflow state.

### What is missing

- There is no structured insurance estimate/quotation record with amounts, line items, insurer submission metadata, or approval metadata.
- There is no explicit "submitted to insurer" lifecycle state separate from generic review/approval wording.
- Job-order creation is not linked to an insurance inquiry as a first-class source.
- Job-order creation is not explicitly blocked by a linked insurance request that is still pending approval.
- There is no explicit approved-insurance-request-to-job-order linkage for workshop execution or billing proof.

### Current code evidence

- Insurance workflow states exist in `backend/apps/main-service/src/modules/insurance/schemas/insurance.schema.ts`.
- Insurance state transitions exist in `backend/apps/main-service/src/modules/insurance/services/insurance.service.ts`.
- Job-order creation currently uses only the current job-order source model in `backend/apps/main-service/src/modules/job-orders/dto/create-job-order.dto.ts` and `backend/apps/main-service/src/modules/job-orders/services/job-orders.service.ts`.
- The current job-order architecture docs describe booking and approved back-job sources, not approved insurance-request sources.

### Severity

Critical.

### Honest paper/demo rule

Do not claim that AUTOCARE already enforces "repair work begins only after insurer approval" as a system gate unless this bridge is actually implemented.

## 2. Insurance Compliance Details

### What is already implemented

- CTPL vs comprehensive distinction exists.
- OR/CR support exists.
- Policy document support exists.
- Police report support exists as a document type.
- Renewal-oriented metadata exists:
  - `policyNumber`
  - `policyExpiryAt`
  - `renewalDueAt`
  - renewal workflow states
- Payment-status tracking exists:
  - `unpaid`
  - `proof_submitted`
  - `verifying`
  - `paid`
  - `overdue`
- `needs_documents` and document completeness workflow exists.

### What is only partially represented

- Previous policy for renewals is only represented indirectly through the generic `policy` document type, not as a clearly labeled previous-policy requirement.
- Police report requirements are modeled as a possible document, but not as conditional compliance logic.
- Missing-document handling exists through workflow state, but not through a full insurer-compliance ruleset.
- Delinquency/cancellation risk is partially represented by payment and cancellation statuses, but not as a deeper insurance-policy compliance engine.

### What is missing

- Filing deadline fields and explicit late-filing risk tracking are missing.
- Conditional requirements like "police report when required" are not modeled as rule-based validation.
- Previous-policy-for-renewals is not captured as a dedicated field or requirement label.
- There is no explicit compliance checklist that blocks downstream insurance-specific execution until all required business-process conditions are satisfied.

### Severity

High.

### Honest paper/demo rule

The paper can say the system captures core insurance request and supporting-document workflow details, but it must not claim full insurer-compliance automation.

## 3. Insurance-Specific Quotation / Estimate Flow

### What is already implemented

- Insurance requests support purpose values including `quotation`.
- Insurance documents support a document type of `estimate`.
- The mobile insurance surface already explains that staff review the intake and prepare an estimate or quotation.

### What is missing

- No structured insurance estimate entity.
- No estimate amount, line-item, or revision workflow.
- No staff estimate builder UI.
- No explicit "estimate submitted to insurer" tracking.
- No explicit insurer approval result tied to a specific estimate version.
- No approved-estimate handoff into service job order or billing.

### Severity

Critical.

### Honest paper/demo rule

Do not claim that AUTOCARE already has a full insurance quotation engine. At present, it supports quotation-oriented inquiry intake and estimate-document attachment, not a complete estimate workflow.

## 4. Communication And Alerts

### What is already implemented

- Insurance reminders exist.
- Insurance broadcasts exist.
- Customer notification/history infrastructure exists.
- Insurance status changes can trigger notification behavior.

### What is not implemented or not proven

- Direct built-in customer/staff chat is not implemented.
- Current-scope push notifications are not proven and should not be claimed.
- The business-process PDF's "built-in chat system" remains proposed/future direction, not current product truth.

### Severity

Medium.

### Honest paper/demo rule

Describe current communication support as reminders, broadcasts, status updates, and notification history. Do not present it as full built-in chat unless that feature is actually built later.

## 5. Customer Back-Job Initiation

### What is already implemented

- Staff can create back-job cases tied to finalized previous service history.
- Staff can review findings, approve rework, create linked rework job orders, and resolve the case.
- Vehicle back-job history read models exist.

### What is missing

- There is no proven customer self-service mobile action that opens a back-job or complaint case from completed service history.
- Current back-job write routes are staff-oriented.
- Current domain docs still describe customer-facing back-job visibility as limited and mention a planned dedicated customer list if mobile gets a standalone back-job screen.

### Severity

High.

### Honest paper/demo rule

Do not claim customer self-service back-job initiation unless it is separately implemented and QA-proven. The current truthful wording is that staff record and manage customer complaints/back-jobs.

## Recommended Implementation Priority

### Critical

1. Add an insurance estimate/quotation domain object with:
   - estimate reference
   - line items / totals
   - submission state
   - insurer decision state
   - audit trail
2. Add insurance-to-job-order linkage so:
   - approved insurance requests can become valid job-order sources
   - job-order creation can be blocked while approval is still pending
   - job-order/billing can show the linked approved insurance case

### High

1. Add stronger insurance compliance tracking:
   - dedicated previous-policy field or document requirement
   - filing deadline field
   - conditional police-report requirement
   - clearer blocking reasons for incomplete insurance cases
2. Decide whether customer self-service back-job initiation is in scope.
   - If yes, implement a customer-safe mobile complaint/request path.
   - If no, keep paper/demo wording staff-managed only.

### Medium

1. Keep communication wording honest:
   - reminders / broadcasts / notifications are current
   - built-in chat and push remain future-scope unless implemented

## Recommended Paper Wording

Use wording like this:

- "AUTOCARE currently supports insurance inquiry intake, supporting-document upload, workflow review, and staff-managed status tracking."
- "Estimate preparation and insurer approval remain part of the real business process; however, the current system does not yet implement a full structured insurer-approval-to-job-order bridge."
- "Back-job and complaint handling are currently staff-managed in the implemented system."

Avoid wording like this:

- "The system automatically enforces insurer approval before repair work begins."
- "Customers can already open back-job complaints directly from mobile service history."
- "AUTOCARE includes built-in chat between staff and customers."
- "The insurance module already manages full quotation, insurer approval, and repair authorization workflows."
