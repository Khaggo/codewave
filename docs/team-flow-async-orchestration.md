# AUTOCARE Async Orchestration and Support Services

Date: 2026-04-18  
Purpose: Explicit ownership map for events, jobs, notifications, timeline refresh, and AI-assisted processing

## Async Ownership Diagram

```mermaid
flowchart LR
  B[main-service.bookings] -.booking.confirmed.-> MQ1[(RabbitMQ)]
  J[main-service.job-orders] -.job_order.finalized.-> MQ1
  JP[main-service.job-orders] -.service.payment_recorded.-> MQ1
  Q[main-service.quality-gates] -.quality_gate.released / quality_gate.overridden.-> MQ1
  I[main-service.insurance] -.insurance.status_changed.-> MQ1
  O[ecommerce.orders] -.order.created.-> MQ1
  P[ecommerce.invoice-payments] -.invoice.payment_recorded.-> MQ1

  MQ1 --> LIFE[main-service.vehicle-lifecycle]
  MQ1 --> LOY[main-service.loyalty]
  MQ1 --> NOTIFS[main-service.notifications]
  MQ1 --> CE[ecommerce.commerce-events]

  AUTH[main-service.auth] -.OTP delivery job.-> QJ[(BullMQ)]
  BOOK[main-service.bookings] -.reminder jobs.-> QJ
  QA[main-service.quality-gates] -.AI QA analysis job.-> QJ
  LIFE2[main-service.vehicle-lifecycle] -.timeline rebuild job.-> QJ
  ANALYTICS[main-service.analytics] -.aggregation job.-> QJ

  QJ --> SMTP[SMTP Email Delivery]
  QJ --> AI[AI Provider Adapter]

  AI --> QA
  AI --> LIFE
```

## Ownership Rules

- `main-service.notifications` owns email delivery and user-facing notification execution.
- `main-service.auth` owns activation decisions and OTP challenge state, but not SMTP delivery.
- `main-service.vehicle-lifecycle` owns derived timeline refresh, not the operational domains that emit the source facts.
- `main-service.quality-gates` owns AI-assisted QA analysis and human review outcomes.
- `ecommerce.commerce-events` owns asynchronous handoff from commerce into downstream consumers.

## Async Contract Appendix

| Async Interface | Producer | Consumer(s) | Required Inputs | Output / Side Effect | Transport | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `booking.confirmed` | `main-service.bookings` | `main-service.vehicle-lifecycle`, `main-service.notifications` | booking ID, customer ID, vehicle ID, timestamp | timeline refresh, booking notices | event | fact, not command |
| `job_order.finalized` | `main-service.job-orders` | `main-service.quality-gates`, `main-service.vehicle-lifecycle` | job-order ID, vehicle ID, evidence metadata | QA evaluation, lifecycle refresh | event | stable IDs only |
| `service.payment_recorded` | `main-service.job-orders` | `main-service.loyalty`, `main-service.analytics` | invoice record ID, paid amount, customer ID, service metadata | service-payment loyalty evaluation, analytics update | event | loyalty earns only after successful paid service |
| `quality_gate.released` / `quality_gate.overridden` | `main-service.quality-gates` | `main-service.vehicle-lifecycle`, `main-service.notifications` | job-order ID, reviewer outcome | publish reviewed status, customer-visible downstream updates | event | human authority remains required |
| `insurance.status_changed` | `main-service.insurance` | `main-service.notifications` | inquiry/claim ID, new status | claim update notices | event | do not imply insurer API |
| `order.created` | `ecommerce.orders` | `ecommerce.inventory`, `ecommerce.invoice-payments`, downstream event consumers | order ID, item snapshots, quantities | reservation/deduction, invoice issuance, downstream handoff | event / internal async | reservation should be explicit |
| `invoice.payment_recorded` | `ecommerce.invoice-payments` | `main-service.notifications`, `main-service.analytics` | invoice ID, order ID, payment data | payment notice, analytics update | event | billing fact only, not a loyalty trigger |
| OTP delivery job | `main-service.auth` | `main-service.notifications` | pending account, OTP payload | OTP email delivery or retry | job | email-only canonical transport |
| AI QA analysis job | `main-service.quality-gates` | AI provider adapter, `main-service.quality-gates` reviewer flow | evidence package, bounded context | advisory QA analysis | job | AI is not release authority |
| Timeline rebuild job | `main-service.vehicle-lifecycle` | `main-service.vehicle-lifecycle` | vehicle ID, source facts | derived lifecycle/timeline refresh | job | rebuildable read model |
