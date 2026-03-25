# Tech Stack

This system is planned around a two-domain backend with a shared architectural direction, not a monolith-first design.

## Core Stack

- `NextJS`
  - Frontend for admin-facing web experiences and shared customer-facing web capabilities
  - Good fit for dashboard views, authenticated flows, and API-facing UI composition
- `NestJS`
  - Backend framework for both the main service and e-commerce service
  - Good fit for modular domains, background workers, queues, and event-driven integration
- `Drizzle ORM`
  - Type-safe schema and query layer for PostgreSQL
  - Good fit for explicit relational modeling and domain-owned schemas
- `PostgreSQL`
  - Primary relational database for system records
  - Good fit for booking, lifecycle, inspection, loyalty, order, and inventory data
- `BullMQ + Redis`
  - Internal async job processing
  - Best for delayed reminders, lifecycle refresh jobs, analytics rebuilds, and retryable tasks
- `RabbitMQ`
  - Cross-domain event bus
  - Best for business events between main service and e-commerce service

## Why This Stack Fits AUTOCARE

- The system is strongly relational
  - vehicles, bookings, inspections, back jobs, orders, invoice payments, loyalty, and inventory all benefit from SQL modeling
- The system has asynchronous operational work
  - reminders, analytics refresh, lifecycle read-model updates, and notification retries fit queues well
- The system has natural domain separation
  - main operations and e-commerce should not share ownership over the same tables
- The system needs maintainable backend structure
  - NestJS + Drizzle supports domain-first modules without forcing heavy frameworks around persistence

## In Scope

- Web-based admin platform
- Customer-facing mobile-compatible backend support
- Main service + e-commerce service split
- Inspection-backed lifecycle verification
- Invoice-based payment status tracking
- Inventory-aware order handling

## Not Implied by This Stack

- Real-time insurer integration
- Automated bank verification
- AI-generated chatbot behavior
- Fully autonomous job-order generation
- Shared database ownership across services
