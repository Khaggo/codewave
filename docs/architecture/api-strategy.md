# API Strategy

This file defines the canonical API strategy for the AUTOCARE backend. Use it to decide when a domain should expose REST endpoints, publish RabbitMQ events, or own BullMQ jobs.

## Interaction Model

- Use `REST + OpenAPI/Swagger` for synchronous request/response behavior.
- Use `RabbitMQ` for cross-service and cross-domain asynchronous facts.
- Use `BullMQ + Redis` for delayed, retryable, or internal background work.
- Keep the current scope software-only. Do not add firmware protocols, device APIs, or embedded transports to canonical docs.
- Keep third-party APIs out of scope unless a concrete business requirement is approved.
- Approved AI provider APIs are one canonical exception, and only through a provider adapter for review-gated Phase 2 features.
- Approved Google identity-verification APIs and approved SMTP mail delivery through Nodemailer are the other canonical exceptions because they support the target signup and activation security model.
- SMTP mail delivery is email-only in the current scope. Do not add SMS transports to canonical docs or contracts unless a later approved plan changes the cost model.

## REST and Swagger Contract

- Public and admin-facing APIs must use REST JSON.
- Swagger is the canonical machine-readable contract for implemented public endpoints.
- Keep live documentation at `/docs` and the machine-readable spec at `/docs-json`.
- Document only implemented routes. Domain docs must not advertise endpoints that do not exist in controllers.
- Request DTOs and response DTOs must be explicit for public endpoints.
- Detailed DTO usage rules belong in [`dto-policy.md`](./dto-policy.md).
- New domains should follow the `main-service.auth` and `main-service.users` Swagger pattern.
- The canonical future signup and activation model is documented in [`auth-security-policy.md`](./auth-security-policy.md). Live Swagger remains the source of truth for what is implemented today.

## Main-Service REST Surface

The `main-service` owns REST APIs for:

- `auth`
  - current-state implemented routes:
    - `POST /auth/register` as legacy current-state registration
    - `POST /auth/login`
    - `POST /auth/refresh`
    - `GET /auth/me`
    - `POST /admin/staff-accounts`
    - `PATCH /admin/staff-accounts/:id/status`
  - canonical migration target routes:
    - `POST /auth/google/signup/start`
    - `POST /auth/google/signup/verify-email`
    - `POST /auth/staff-activation/google/start`
    - `POST /auth/staff-activation/verify-email`
  - new staff accounts should land in `pending_activation`, not as fully usable identities
- `users`
  - `POST /users`
  - `GET /users/:id`
  - `PATCH /users/:id`
  - `GET /users/:id/addresses`
  - `POST /users/:id/addresses`
  - `PATCH /users/:id/addresses/:addressId`
  - canonical role model is `customer | technician | service_adviser | super_admin`
- `vehicles`
  - create, read, and update vehicle ownership endpoints
- `bookings`
  - services, time slots, booking create, booking status, daily schedule, and optional queue endpoints
- `inspections`
  - `POST /vehicles/:id/inspections`
  - `GET /vehicles/:id/inspections`
- `vehicle-lifecycle`
  - `GET /vehicles/:id/timeline`
  - `POST /vehicles/:id/lifecycle-summary/generate`
  - `PATCH /vehicles/:id/lifecycle-summary/:summaryId/review`
- `back-jobs`
  - `POST /back-jobs`
  - `GET /back-jobs/:id`
  - `PATCH /back-jobs/:id/status`
- `job-orders`
  - `POST /job-orders`
  - `GET /job-orders/:id`
  - `PATCH /job-orders/:id/status`
  - `POST /job-orders/:id/progress`
  - `POST /job-orders/:id/photos`
  - `POST /job-orders/:id/finalize`
- `quality-gates`
  - `GET /job-orders/:id/qa`
  - `PATCH /job-orders/:id/qa/override`
- `insurance`
  - inquiry create, read, status, and document endpoints
- `notifications`, `loyalty`, `chatbot`, and `analytics`
  - REST APIs only where direct user or admin access is required

## E-Commerce REST Surface

The `ecommerce-service` owns REST APIs for:

- `catalog`
  - product and category endpoints
- `inventory`
  - stock and reservation endpoints
- `cart`
  - cart lifecycle endpoints
- `orders`
  - checkout and order-history endpoints
- `invoice-payments`
  - invoice creation, payment-entry, and status-tracking endpoints

Key invoice-based commerce endpoint:
- `POST /checkout/invoice`

## RabbitMQ Event Contract

Use `RabbitMQ` for eventual consistency, side effects, and downstream consumers.

Recommended event families:
- `booking.created`
- `booking.confirmed`
- `inspection.completed`
- `vehicle.timeline_refresh_requested`
- `back_job.opened`
- `back_job.resolved`
- `job_order.created`
- `job_order.finalized`
- `quality_gate.audit_requested`
- `quality_gate.blocked`
- `quality_gate.overridden`
- `service.invoice_finalized`
- `order.created`
- `order.invoice_issued`
- `invoice.payment_recorded`
- `loyalty.points_earned`

Rules:
- events should describe facts, not vague commands
- payloads should carry stable IDs and metadata, not cross-service database assumptions
- do not model direct cross-service foreign keys
- version payloads when contracts evolve
- notifications should consume stable source facts or explicit subscriber-owned trigger contracts, not a generic catch-all `notification.requested` command

## BullMQ Job Contract

Use `BullMQ` for internal orchestration, retries, and delayed execution.

Recommended job families:
- booking reminders
- inspection follow-up reminders
- auth OTP delivery retries
- notification retries
- vehicle timeline refresh and rebuild jobs
- AI lifecycle summary generation jobs
- quality-gate semantic and discrepancy audit jobs
- analytics aggregation
- reconciliation and dead-letter recovery jobs

Rules:
- jobs should be idempotent where possible
- jobs are not the source of truth
- job names should be stable and domain-prefixed
- background work should stay owned by the domain that triggers or reconciles it
- AI-assisted BullMQ jobs must expose queued, processing, completed, or failed metadata through the owning domain record instead of making queue internals the only observable state

## Recommendations and Exclusions

Recommended defaults:
- keep `REST + Swagger` as the public contract for v1
- keep `RabbitMQ` and `BullMQ` separated by purpose
- let each domain doc own only its local endpoints, events, and jobs
- keep global transport choices in this file
- keep firmware out of the canonical architecture

Do not add right now:
- `GraphQL`
- `gRPC`
- `MQTT`
- payment-gateway APIs
- insurer APIs
- hardware or device APIs
- hard-coded vendor model IDs in canonical docs

If hardware is approved later:
- preferred future firmware stack: `ESP32 + ESP-IDF`
- document it in backlog first, not in canonical control-plane docs
