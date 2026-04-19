# Main–Ecommerce Event Contracts

## Task ID

`T301`

## Title

Define and implement the first RabbitMQ event contracts between `main-service` and `ecommerce-service`.

## Type

`integration`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/ecommerce/commerce-events.md`
- `../../domains/main-service/notifications.md`
- `../../domains/main-service/loyalty.md`
- `../../api-strategy.md`
- `../../system-architecture.md`

## Depends On

- `T201`
- RabbitMQ availability in local infra

## Goal

Create the first stable event contract layer so `ecommerce-service` can publish commerce facts and `main-service` can consume them without direct cross-service database coupling.

## Deliverables

- event names, payload contracts, and publisher/consumer ownership for the first commerce facts
- shared event-handling conventions in code or internal docs
- initial contract support for invoice and order events
- validation or smoke coverage proving the contract names and payload basics stay stable

## Implementation Notes

- start with facts that unlock downstream domains, not with speculative event spam
- recommended first events: `order.created`, `order.invoice_issued`, `invoice.payment_recorded`
- payloads should use stable IDs and metadata only
- keep domain ownership explicit: ecommerce publishes commerce facts, main-service reacts
- `invoice.payment_recorded` remains a commerce settlement and reminder-refresh fact, not a loyalty earning trigger

## Acceptance Checks

- event names and owners are documented consistently in code and docs
- no direct cross-service foreign-key assumption is introduced
- at least one publish/consume path is testable or smoke-checked locally
- downstream consumers can evolve without changing the source-of-truth ownership model

## Out of Scope

- full loyalty implementation
- notification delivery implementation
- analytics projection logic
- external message broker integrations beyond RabbitMQ
