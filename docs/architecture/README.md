# AUTOCARE Backend SSoT

This directory is the backend source of truth for engineers and agents building the AUTOCARE ecosystem.

The docs are organized by service and by domain module, so implementation work can map directly to backend modules instead of broad planning categories.

## Reading Order

1. [system-architecture.md](./system-architecture.md)
2. [domain-map.md](./domain-map.md)
3. Main service domain files
4. E-commerce service domain files

## Service Split

- `main-service` owns customer operations: auth, users, vehicles, bookings, inspections, lifecycle, insurance, loyalty, back jobs, job monitoring, notifications, chatbot, and analytics.
- `ecommerce-service` owns retail operations: catalog, inventory, cart, orders, invoice payments, and commerce events.
- Cross-service coordination happens through API calls for immediate reads and through events for eventual consistency. Do not model direct cross-service foreign keys.

## Main Service Domains

- [auth](./domains/main-service/auth.md)
- [users](./domains/main-service/users.md)
- [vehicles](./domains/main-service/vehicles.md)
- [bookings](./domains/main-service/bookings.md)
- [vehicle-lifecycle](./domains/main-service/vehicle-lifecycle.md)
- [inspections](./domains/main-service/inspections.md)
- [insurance](./domains/main-service/insurance.md)
- [loyalty](./domains/main-service/loyalty.md)
- [back-jobs](./domains/main-service/back-jobs.md)
- [job-monitoring](./domains/main-service/job-monitoring.md)
- [notifications](./domains/main-service/notifications.md)
- [chatbot](./domains/main-service/chatbot.md)
- [analytics](./domains/main-service/analytics.md)

## E-Commerce Service Domains

- [catalog](./domains/ecommerce/catalog.md)
- [inventory](./domains/ecommerce/inventory.md)
- [cart](./domains/ecommerce/cart.md)
- [orders](./domains/ecommerce/orders.md)
- [invoice-payments](./domains/ecommerce/invoice-payments.md)
- [commerce-events](./domains/ecommerce/commerce-events.md)

## Operating Rules

- Vehicle lifecycle accuracy is hybrid: administrative events are system-generated, condition-sensitive milestones are inspection-backed.
- A `back job` is an explicit return or rework case tied to previous work, not every repeat visit.
- Invoice-based payment is tracking-oriented. The system tracks invoice state and payment records, but does not imply bank automation.
- Shared base abstractions are allowed only for generic mechanics such as pagination, CRUD scaffolding, queue wrappers, and persistence helpers.
- Domain rules stay inside their owning modules.

## Legacy Material

Earlier topic-based docs are preserved in [`_legacy/`](./_legacy/) for reference only.
