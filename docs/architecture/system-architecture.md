# System Architecture

This file contains cross-domain architecture that should not be duplicated inside module docs.

## Purpose

- define the shared technical baseline
- define module layout rules
- define service ownership and integration rules
- capture global risks and deployment notes

## Tech Stack

- `NextJS`: customer-facing and admin-facing frontend.
- `NestJS`: backend framework for both services, chosen for modularity, transport support, and clean layering.
- `Drizzle ORM`: typed schema and query layer for PostgreSQL.
- `PostgreSQL`: primary transactional store.
- `BullMQ + Redis`: internal async jobs such as reminders, retries, derived read-model refresh, and background recalculation.
- `RabbitMQ`: inter-service business events and reliable domain-to-domain notifications.
- `Docker Compose`: local infrastructure bootstrap for database and related services.

## Recommended Backend Style

Recommended style: **DDD with guarded base abstractions**.

### Core Rule

Use domain-first modules. Reuse mechanics, not business meaning.

### Good Pattern

- `controller`: transport and request mapping only.
- `service`: domain orchestration, policies, invariants, status transitions.
- `repository`: database access and query composition.
- `dto`: request and response contracts.
- `schemas`: Drizzle schema, relation definitions, persistence-level enums.

### Shared Base Layer Guidance

Allowed in `shared/base`:
- base CRUD helpers
- pagination and filtering helpers
- generic transactional wrappers
- shared error envelopes
- queue publishers and worker helpers
- outbox/inbox utility patterns

Do not move these into generic base classes:
- lifecycle verification rules
- inspection completeness rules
- back-job classification
- invoice payment semantics
- loyalty accrual rules
- chatbot intent routing
- booking approval logic

## Suggested Repo Shape

```text
src/
  modules/
    <domain>/
      controllers/
      services/
      repositories/
      dto/
      schemas/
      mappers/
      constants/
  shared/
    db/
    base/
    events/
    queue/
    config/
    utils/
```

## Service Ownership

### Main Service

Owns auth, users, vehicles, bookings, vehicle lifecycle, inspections, insurance, loyalty, back jobs, job monitoring, notifications, chatbot, and analytics.

### E-Commerce Service

Owns catalog, inventory, cart, orders, invoice payments, and commerce events.

## Cross-Domain Integration Rules

- For immediate user-facing reads, one service may call another through explicit APIs or through an internal gateway.
- For state propagation and side effects, prefer events.
- Do not create direct cross-service foreign keys.
- Represent external ownership by storing external IDs plus event metadata.
- Loyalty updates from e-commerce should be event-driven.
- Analytics may aggregate from many modules, but should not become the source of truth for operational data.

## Queue and Event Responsibilities

### BullMQ + Redis

Use for reminders, notification retries, derived timeline refresh, analytics aggregation, inventory sync support jobs, stale cart cleanup, and invoice aging reminders.

### RabbitMQ

Use for `order.created`, `order.confirmed`, `invoice.updated`, `inventory.reserved`, `loyalty.points.requested`, and cross-service summary events.

## Data Ownership Rules

- If a table belongs to a module, writes go through that module.
- Read models can denormalize other modules, but must be rebuildable.
- Order addresses are order snapshots and belong to the orders domain.
- Saved customer addresses belong to the users domain.
- Vehicle timeline is a read-focused operational history owned by `vehicle-lifecycle`, even when events originate elsewhere.

## Deployment Notes

- Current local infrastructure references:
  - `backend/docker-compose.yml`
  - `backend/database setup.md`
- Start with separate NestJS apps or separate app modules that can split into services cleanly.
- Prefer separate Postgres schemas or separate databases per service boundary when feasible.
- Add outbox processing before scaling event usage heavily.

## Global Risks

- event lag causes stale loyalty, analytics, or lifecycle summaries
- repeat visit is misclassified as back job
- work completion is shown as verified without a completion inspection
- inventory is oversold because reservations and orders race
- invoice tracking is mistaken for financial settlement automation
- generic base services grow until domain rules leak into shared abstractions

## Agent Rules

- Start from the domain doc first, not from this file.
- Use this file only for cross-cutting rules, module layout, and service-boundary decisions.
- If a rule belongs to one business capability, document and implement it in that domain.
