# E-Commerce Service Bootstrap

## Task ID

`T201`

## Title

Move `ecommerce-service` from health-only state to domain-ready service foundation.

## Type

`foundation`

## Status

`ready`

## Priority

`high`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/ecommerce/catalog.md`
- `../../domains/ecommerce/orders.md`
- `../../domains/ecommerce/invoice-payments.md`
- `../../api-strategy.md`
- `../../domain-map.md`

## Depends On

- current backend workspace and shared packages
- local Postgres, Redis, and RabbitMQ setup already defined in backend

## Goal

Prepare `ecommerce-service` so it can host catalog, inventory, cart, orders, and invoice-payment domains using the same NestJS, Drizzle, Swagger, and testing conventions used in `main-service`.

## Deliverables

- service-owned module directory layout under `apps/ecommerce-service/src/modules`
- shared app wiring for config, DB access, and Swagger
- at least one first real domain scaffold ready for follow-up tasks
- route and module conventions aligned with the golden domain pattern where applicable
- basic service test and build coverage

## Implementation Notes

- do not copy `main-service` domain semantics into ecommerce
- mirror the transport and documentation strategy, not the business rules
- bootstrap should make it cheap to add `catalog`, `inventory`, `cart`, and `orders`
- keep invoice-based payment tracking as the default payment model

## Acceptance Checks

- ecommerce-service still boots and exposes health successfully
- Swagger can be introduced or prepared consistently with the main service
- at least one ecommerce domain scaffold can be added without restructuring the service again
- `npm run build` and `npm test` remain green

## Out of Scope

- full catalog implementation
- order checkout logic
- event publishing
- loyalty integration
