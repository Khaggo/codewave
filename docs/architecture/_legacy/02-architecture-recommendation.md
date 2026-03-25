# Architecture Recommendation

Recommended style: **DDD with guarded base abstractions**

This means the system should be organized around domains first, while allowing small shared base utilities only for repetitive mechanics.

## Recommended Rule

- Each domain owns its own:
  - controller
  - service
  - repository
  - DTOs
  - schema
  - business rules
- Shared base layers are allowed only for:
  - generic CRUD scaffolding
  - pagination helpers
  - common query helpers
  - standard response patterns
  - shared database plumbing
- Shared base layers must not own:
  - lifecycle verification rules
  - inspection logic
  - back-job classification
  - invoice payment state transitions
  - loyalty rules

## Why Not Base-CRUD Inheritance First

Base CRUD inheritance can speed up repetitive work, but if it becomes the center of the design:
- domain rules leak into generic classes
- services become thin wrappers over generic CRUD
- lifecycle and inspection flows become harder to model clearly
- back jobs and verified milestones get flattened into generic records

AUTOCARE has enough domain-specific behavior that domain rules should stay close to the domain.

## Recommended Backend Shape

```text
src/
  modules/
    auth/
      controllers/
      services/
      repositories/
      dto/
      schemas/
    vehicles/
      controllers/
      services/
      repositories/
      dto/
      schemas/
    bookings/
    inspections/
    vehicle-lifecycle/
    insurance/
    loyalty/
    back-jobs/
    job-monitoring/
    chatbot/
    analytics/
    ecommerce-gateway/   # optional BFF/proxy layer inside main service
  shared/
    db/
    base/
    events/
    queue/
    constants/
```

## Layer Responsibilities

- `controller`
  - request parsing
  - auth/guard entry
  - response shaping
- `service`
  - orchestration of domain behavior
  - validation of business flow
  - coordination across repositories, queues, and events
- `repository`
  - persistence access only
  - domain-shaped query methods
- `schema`
  - table definitions, relations, enum/state declarations
- `dto`
  - boundary contracts for requests and responses

## Base Abstraction Guidance

Use base abstractions for:
- `BaseRepository<T>`
- pagination helpers
- standard soft-delete helpers if truly needed
- generic list/filter helpers

Do not use base abstractions for:
- inspection verification
- back-job linking
- lifecycle event generation rules
- invoice payment semantics
- domain-specific state machines

## Service Split Recommendation

- `Main Service`
  - DDD modules for operations and customer engagement
- `E-Commerce Service`
  - DDD modules for product and order workflows
- shared logic between services should be:
  - event contracts
  - interface definitions
  - common utilities only when they are domain-neutral
