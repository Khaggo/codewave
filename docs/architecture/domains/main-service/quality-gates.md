# quality-gates

## Domain ID

`main-service.quality-gates`

## Agent Summary

Load this doc for AI-assisted release audits, QA status, and manual override flow before a completed job order is released. Skip it for core job execution or generic analytics.

## Primary Objective

Own the double-gate QA workflow so release decisions are evidence-backed, reviewable, and auditable without turning AI assistance into the final authority.

## Inputs

- completed job-order data
- booking concern context
- inspection evidence
- back-job lineage and history

## Outputs

- `job_order_quality_gates`
- QA risk and discrepancy findings
- override decisions and audit signals

## Dependencies

- `main-service.bookings`
- `main-service.inspections`
- `main-service.job-orders`
- `main-service.back-jobs`

## Owned Data / ERD

Primary tables or equivalents:
- `job_order_quality_gates`
- `quality_gate_findings`
- `quality_gate_overrides`

Key relations:
- one job order may have one current QA gate record and many findings
- one QA gate record may be influenced by booking, inspection, and back-job evidence
- manual overrides must record actor, reason, and timestamp

## Primary Business Logic

- run Gate 1 semantic resolution audit between the original concern and completed work
- run Gate 2 rule-based discrepancy and risk scoring over job-order and inspection evidence
- block release when QA status requires staff action
- allow manual override only for authorized staff with audit trail
- keep BullMQ as the owner of asynchronous QA execution

## Process Flow

1. Job order reaches release-ready status.
2. Background audit gathers booking, inspection, and work evidence.
3. Gate 1 checks whether the completed work addresses the recorded concern.
4. Gate 2 scores discrepancies and risk conditions.
5. Staff reviews results, applies override if allowed, or keeps the job blocked.

## Use Cases

- service adviser reviews QA risk before vehicle release
- super admin approves a documented manual override
- analytics reads QA outcomes for quality trends
- lifecycle summary generation consumes reviewed QA state

## API Surface

- internal `runQualityGateAudit`
- `GET /job-orders/:id/qa`
- `PATCH /job-orders/:id/qa/override`

## Edge Cases

- job order is finalized while QA audit is still pending
- AI-assisted semantic audit and evidence-backed rules disagree
- override happens without a valid actor role or reason
- repeated retries create duplicate QA findings for one job order

## Writable Sections

- QA gates, discrepancy rules, override semantics, quality-gate APIs, and quality-gate edge cases
- do not redefine job-order execution, booking intake, or AI provider policy here

## Out of Scope

- direct technician execution updates
- payment settlement
- customer-facing AI chat behavior
