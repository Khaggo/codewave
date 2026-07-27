# Cruisers Crib Auto Care Center Business Process

Date captured: 2026-05-23

Source: `C:\Users\casio\Downloads\Business-Process.pdf`

Status: Source captured for paper, Notion, process diagrams, and AUTOCARE objective alignment.

## Purpose

This document preserves the client business process described in `Business-Process.pdf` so it can be reused in the research paper, Notion wiki, process diagrams, use case/activity diagrams, and future QA handoffs.

It documents the current manual business process and the intended system-assisted process. It does not change product behavior by itself.

## Current Business Lifecycle

Cruisers Crib Auto Care Center currently receives work through a mix of walk-in customers, routine service demand, referrals, and insurance-company outreach. Staff greet the customer, identify the customer's need, and route the concern into either a routine service path, an insurance-claim path, or a complaint/back-job path.

The center depends heavily on clear customer communication because service quality, complaint recovery, insurance deadlines, payment confirmation, and customer trust all affect whether a job can move forward smoothly.

## Manual Process: Walk-In And Routine Services

Walk-in and routine services are usually shorter and more direct than insurance work.

1. Customer arrives or inquires about a routine automotive service.
2. Staff greet the customer and assess the customer's stated need.
3. Staff discuss the service, pricing, and terms on the spot.
4. Customer agrees to the service and pricing.
5. Staff execute the service work.
6. The vehicle is released after the service and payment/release requirements are satisfied.

Examples include preventive maintenance service and other simple repair or service work that can be completed quickly.

## Manual Process: Insurance-Related Repairs

Insurance-related repairs are longer because the shop must comply with insurer requirements before work can begin.

1. Customer or insurance referral initiates the insurance inquiry.
2. Staff assess the accident or repair concern.
3. Staff manually record discussion details and customer information.
4. Staff collect supporting documents, such as OR/CR details, previous policy for renewals, and police report when required.
5. Staff prepare a formal estimate or quotation.
6. Staff submit the estimate and documents to the insurance provider.
7. Insurance provider reviews the request.
8. Approval may take weeks or months depending on damage severity, document completeness, and insurer processing time.
9. Work begins only after insurer approval and formal job-order creation.
10. Staff continue coordinating repair status, payment responsibilities, and release requirements.

Important compliance rule: incomplete paperwork can halt the claim process. Late filing can lead to permanent denial by the insurer, so initial documents should be submitted early even when follow-up documents are still pending.

## Manual Process: Customer Complaints And Back-Jobs

Complaints and back-jobs are treated as high-priority cases because customer trust and reputation are central to the shop's operations.

1. Customer reports a complaint, unresolved issue, or concern after service.
2. Owner or staff member handles the interaction directly when the customer is angry, hesitant, or difficult.
3. Staff avoid arguments and clarify the problem.
4. Staff attempt to meet the customer halfway through practical alternatives or compromises.
5. The shop may pause active vehicle-release work to prioritize a complaint or back-job.
6. Staff resolve the issue in a way that protects customer trust without causing unnecessary financial loss to the shop.

This supports AUTOCARE Objective 4, but the final paper should be careful: current QA proves the staff-linked back-job/rework flow. Customer self-service back-job initiation should not be claimed unless separately proven.

## Insurance Administration Rules

The business handles insurance work involving:

- Compulsory Third-Party Liability, which covers third-party bodily injury or death.
- Comprehensive insurance, which can cover broader protection such as third-party property damage, own-vehicle damage, and flood coverage.

Operational rules from the PDF:

- Premium payment terms may extend up to six months.
- Credit card or bank installment options may be recommended for extended timelines.
- Delinquent accounts can cause rejected claims during accidents.
- Prolonged non-payment can lead to policy cancellation.
- Paid premiums are generally non-refundable because taxes and administrative fees are remitted immediately.
- OR/CR and previous policy documents are required for common processing and renewals.
- Digital copies may be accepted when legible.
- Original police reports may still be required for some claims.
- Heavy claim history can increase renewal premiums, while normal annual renewals may decrease due to vehicle depreciation.

## Current Bottlenecks

The PDF identifies these operational problems:

- Staff rely heavily on Messenger group chats for coordination.
- Estimates are often manually sent to clients through fragmented channels.
- The desktop quotation tool is office-bound and not mobile-responsive.
- Staff often need a laptop to generate quotes.
- Verbal details can be missed when transferred into final job orders.
- Payment tracking is disorganized because customers may not send proof of payment promptly.
- Staff manually hunt for payment confirmations.
- Insurance deadlines can be missed when documents are incomplete, misplaced, or not tracked.
- Manual workflows increase miscommunication and compliance risk.

## Intended Centralized Digital Solution

The proposed system direction is a centralized, mobile-friendly platform for customer engagement, service management, insurance workflows, and payment evidence.

The PDF proposes that the system should support:

- Customer self-service.
- Real-time quotation visibility.
- Insurance claim filing.
- Digital supporting-document upload.
- Proof-of-payment submission.
- Automated status, approval, payment, and repair milestone tracking.
- Direct and transparent staff/customer communication.
- Marketing and promotions.
- Long-term scalability as a possible software product for similar businesses.

## AUTOCARE Mapping

| Business Need | AUTOCARE System Mapping | Current Evidence Note |
| --- | --- | --- |
| Customer booking and routine service intake | Mobile booking, staff booking confirmation, job-order handoff | QA passed for booking-to-cash and multi-service booking |
| Service execution tracking | Adviser-owned Job Orders, technician profiles, checklist/progress/evidence, QA release | QA passed under adviser-owned workflow |
| Insurance document handling | Mobile insurance request with multiple supporting files, staff insurance workspace | QA passed for multi-file upload/open/download |
| Insurance estimate and approval workflow | Insurance inquiry purpose/status tracking plus estimate document uploads | Partial only. Current system does not yet implement a structured estimate-to-insurer-to-approved-job-order bridge. |
| Customer complaint/back-job handling | Staff-linked Back-Jobs and rework lifecycle tied to prior service | QA passed for staff-linked path; customer initiation not claimed |
| Payment tracking | Invoices & Orders, manual payment recording, service/ecommerce invoice status | QA passed, with invoice lookup/visibility polish still monitored |
| Customer loyalty | Rewards and rule-driven accrual after qualifying paid invoice events | QA passed for service and ecommerce paid-invoice timing |
| Vehicle history | Unified vehicle lifecycle timeline with service, invoice/payment, insurance, and reviewed-summary events | Objective 2 QA passed / monitor |
| Communication and alerts | Current scope should be documented carefully as email/status updates and future enhancement areas where applicable | Do not over-claim unsupported direct chat/push behavior |

## Paper Integration Guidance

The paper should include two related process descriptions:

1. Current manual business process: walk-in/routine service, insurance claim handling, complaint/back-job handling, payment confirmation, and manual communication bottlenecks.
2. Proposed system-assisted process: customer mobile self-service, staff web operations, insurance document tracking, adviser-owned workshop execution, invoice/payment tracking, lifecycle history, rewards, and reporting.

The process section should explicitly mention that insurance work is different from routine service because insurer approval and complete supporting documents are required before repair work can begin.

## Diagram Guidance

Recommended diagrams to update from this source:

- Current manual business process diagram.
- Proposed AUTOCARE-assisted business process diagram.
- Insurance claim activity diagram.
- Booking-to-cash activity diagram.
- Back-job/rework activity diagram.
- Unified vehicle lifecycle process diagram.

The diagrams should use the current role model:

- Customer.
- Service adviser.
- Super admin.
- Non-auth technician profile as operational assignment context, not a login role.
- Insurance provider as an external actor for claim approval.

## Open Paper Work

- Convert this source into the final research-paper business process narrative.
- Add readable process diagrams with figure labels.
- Align use case and activity diagrams with the adviser-owned workshop model.
- Use `docs/business-process-implementation-alignment-report.md` to keep insurance approval, quotation, communication, and back-job wording honest.
- Update gap analysis so check marks only appear where implemented and QA-supported.
- Add narrative explanations after process and compliance tables.
