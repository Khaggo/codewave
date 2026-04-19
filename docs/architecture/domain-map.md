# Domain Map

This file is the one-page routing and dependency map for backend implementation agents. Use [`api-strategy.md`](./api-strategy.md) first when the task involves transport selection, event publishing, queue ownership, or integration boundaries.

## Main Service Domains

| Domain ID | Owner Role | Primary Responsibility | Direct Dependencies | Load After |
| --- | --- | --- | --- | --- |
| `main-service.auth` | `domain-worker` | credentials, Google-verified signup activation, email OTP verification, tokens, and access boundaries | `main-service.users` | `users` |
| `main-service.users` | `domain-worker` | customer identity, profiles, saved addresses, account state | none | none |
| `main-service.vehicles` | `domain-worker` | vehicle records and ownership | `main-service.users` | `users` |
| `main-service.bookings` | `domain-worker` | appointment intake, service selection, staff scheduling actions, and optional queue visibility | `main-service.users`, `main-service.vehicles` | `users`, `vehicles` |
| `main-service.vehicle-lifecycle` | `domain-worker` | unified vehicle timeline and review-gated AI summaries | `main-service.vehicles`, `main-service.bookings`, `main-service.inspections`, `main-service.job-orders`, `main-service.quality-gates` | `vehicles`, `bookings`, `inspections`, `job-orders`, `quality-gates` |
| `main-service.inspections` | `domain-worker` | physical verification records | `main-service.vehicles`, `main-service.bookings`, `main-service.job-orders`, `main-service.back-jobs` | `vehicles`, `bookings`, `job-orders`, `back-jobs` |
| `main-service.insurance` | `domain-worker` | inquiries, supporting docs, insurance status tracking | `main-service.users`, `main-service.vehicles` | `users`, `vehicles` |
| `main-service.loyalty` | `domain-worker` | points ledger, admin reward catalog, admin earning rules, and redemption | `main-service.users`, `main-service.job-orders` | `users`, `job-orders` |
| `main-service.back-jobs` | `domain-worker` | return and rework handling with service-history validation | `main-service.vehicles`, `main-service.inspections`, `main-service.job-orders` | `vehicles`, `inspections`, `job-orders` |
| `main-service.job-orders` | `domain-worker` | digital job orders, technician assignments, work execution, and invoice readiness | `main-service.bookings`, `main-service.back-jobs`, `main-service.users` | `bookings`, `back-jobs`, `users` |
| `main-service.quality-gates` | `integration-worker` | AI-assisted release audits and manual override controls | `main-service.bookings`, `main-service.inspections`, `main-service.job-orders`, `main-service.back-jobs` | `bookings`, `inspections`, `job-orders`, `back-jobs` |
| `main-service.notifications` | `domain-worker` | email-only reminders, outbound notices, and auth OTP delivery | `main-service.auth`, `main-service.bookings`, `main-service.insurance`, `main-service.back-jobs`, `ecommerce.invoice-payments` | `auth`, `bookings`, `insurance`, `back-jobs`, `invoice-payments` |
| `main-service.chatbot` | `domain-worker` | rule-based inquiry routing | `main-service.bookings`, `main-service.insurance`, `ecommerce.orders` | `bookings`, `insurance`, `orders` |
| `main-service.analytics` | `integration-worker` | reporting read models and KPIs | cross-domain | load only when reporting or audit behavior changes |

Reference-first domains:
- `main-service.users`: baseline identity and profile domain
- `main-service.auth`: baseline auth, Swagger, and JWT domain
- use both with [`golden-domain-template.md`](./golden-domain-template.md) when creating a new domain

## E-Commerce Domains

| Domain ID | Owner Role | Primary Responsibility | Direct Dependencies | Load After |
| --- | --- | --- | --- | --- |
| `ecommerce.catalog` | `domain-worker` | products and categories | none | none |
| `ecommerce.inventory` | `domain-worker` | stock counts, reservations, adjustments | `ecommerce.catalog`, `ecommerce.orders` | `catalog`, `orders` |
| `ecommerce.cart` | `domain-worker` | customer shopping cart lifecycle | `ecommerce.catalog`, `ecommerce.inventory` | `catalog`, `inventory` |
| `ecommerce.orders` | `domain-worker` | checkout, order records, item snapshots | `ecommerce.cart`, `ecommerce.inventory`, `ecommerce.invoice-payments` | `cart`, `inventory`, `invoice-payments` |
| `ecommerce.invoice-payments` | `domain-worker` | invoice records and payment tracking | `ecommerce.orders` | `orders` |
| `ecommerce.commerce-events` | `integration-worker` | outbox, inbox, and downstream events | `ecommerce.orders`, `ecommerce.inventory`, `ecommerce.invoice-payments` | `orders`, `inventory`, `invoice-payments` |

## Shared Concerns

- auth guards and identity propagation
- RBAC, staff provisioning, and adviser-code snapshots
- Google identity verification, email OTP activation, and pending-account handling
- REST and Swagger contract discipline
- approved AI provider adapter and review-gated AI outputs
- database connectivity
- queue infrastructure
- event publishing and consumption helpers
- generic pagination and filtering helpers

## Cross-Domain Hotspots

- `vehicle-lifecycle`: combines verified and administrative events from many operational domains
- `quality-gates`: sits between operational completion and release approval
- `loyalty`: depends on paid service facts and admin-configured reward or earning-rule policy
- `notifications`: consumes operational triggers plus auth OTP email delivery requests
- `analytics`: must stay derived and rebuildable, not transactional
- `commerce-events`: owns the asynchronous handoff between e-commerce and main-service
- SMS remains non-canonical and backlog-only; current reminder and OTP delivery assumptions are email-based

## Build Order

1. `main-service.users`
2. `main-service.auth`
3. `main-service.vehicles`
4. `main-service.bookings`
5. `main-service.inspections`
6. `main-service.job-orders`
7. `main-service.back-jobs`
8. `main-service.notifications`
9. `main-service.insurance`
10. `main-service.quality-gates`
11. `main-service.vehicle-lifecycle`
12. `ecommerce.catalog`
13. `ecommerce.inventory`
14. `ecommerce.cart`
15. `ecommerce.orders`
16. `ecommerce.invoice-payments`
17. `ecommerce.commerce-events`
18. `main-service.loyalty`
19. `main-service.analytics`
20. `main-service.chatbot`
