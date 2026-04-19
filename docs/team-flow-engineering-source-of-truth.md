# AUTOCARE Engineering Flow Documentation Pack

Date: 2026-04-18  
Purpose: Authoritative engineering-oriented flow documentation set for AUTOCARE

## Overview

This is the recommended source-of-truth flow pack for AUTOCARE. It replaces the idea of one master diagram with a small set of focused diagrams, each with one clear purpose:

1. **System ownership overview**  
   Reference: [team-flow-redraw-structure.md](./team-flow-redraw-structure.md)
2. **Customer mobile lifecycle**  
   Reference: [team-flow-customer-mobile-lifecycle.md](./team-flow-customer-mobile-lifecycle.md)
3. **Staff/admin web lifecycle**  
   Reference: [team-flow-staff-admin-web-lifecycle.md](./team-flow-staff-admin-web-lifecycle.md)
4. **Operational state machine**  
   Reference: [team-flow-operational-state-machine.md](./team-flow-operational-state-machine.md)
5. **Commerce state machine**  
   Reference: [team-flow-commerce-state-machine.md](./team-flow-commerce-state-machine.md)
6. **Async orchestration and support services**  
   Reference: [team-flow-async-orchestration.md](./team-flow-async-orchestration.md)

The current redraw document remains useful as the **overview foundation**, but it is no longer the only diagram your team should rely on.

## Documentation Rules

- `mobile` is customer-facing.
- `web` is staff/admin-facing.
- `main-service` and `ecommerce-service` must stay visually separated.
- AI may assist review flows, but it must never appear as the final authority node.
- Notifications, timeline refresh, retries, and analytics updates must be modeled as side effects or async consumers, not as core state owners.
- Customer-visible state changes must be traceable to either:
  - a synchronous API write, or
  - an event/job-driven derived update

## Authoritative State Labels

Use these labels consistently across the diagram set.

### Identity and auth states

- `pending_activation`
- `active`
- `deactivated`

### Booking and operational states

- `slot_queried`
- `slot_held`
- `booking_confirmed`
- `booking_rescheduled`
- `booking_declined`
- `booking_cancelled`
- `job_order_active`
- `ready_for_qa`
- `released`
- `rework_required`
- `job_order_closed`

### Insurance states

- `inquiry_submitted`
- `claim_pending`
- `claim_quoted`
- `claim_issued`

### Commerce states

- `cart_active`
- `checkout_requested`
- `order_created`
- `stock_reserved`
- `stock_deducted`
- `invoice_open`
- `payment_recorded`
- `fulfilled`

## Authoritative Async Interfaces

Prefer named facts and jobs over anonymous arrows.

### Events

- `booking.confirmed`
- `job_order.finalized`
- `quality_gate.released`
- `quality_gate.overridden`
- `service.payment_recorded`
- `insurance.status_changed`
- `order.created`
- `invoice.payment_recorded`
- `loyalty.points_earned`

### Jobs

- OTP delivery job
- notification retry job
- timeline rebuild job
- AI QA analysis job
- AI lifecycle summary job

## Recommended Usage

- Use the **overview foundation** when presenting the system at a high level.
- Use the **customer** and **staff/admin** lifecycle docs when designing channel behavior.
- Use the **operational** and **commerce** state-machine docs when discussing record transitions and backend ownership.
- Use the **async orchestration** doc when discussing notifications, events, queues, retries, AI jobs, and derived updates.

## Validation Checklist

The flow pack is correct only if:

- each major transition has one owning domain
- each role-restricted step names the actor
- mobile and web responsibilities are not mixed
- AI nodes never imply final authority
- record lifecycles are shown as states, not only generic boxes
- notifications are side effects, not primary business-state owners
- cross-service interactions use explicit event/job boundaries
