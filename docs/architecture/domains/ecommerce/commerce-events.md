# commerce-events

## Purpose

Own the e-commerce service event boundary: outbox publishing, inbox consumption, and external-facing business events for other services such as loyalty, analytics, and notifications.

## Owned Data / ERD

Primary tables or equivalents:
- `event_outbox`
- `event_inbox`
- `event_delivery_logs`

Key relations:
- orders, inventory, and invoice-payments write events into the outbox
- downstream consumers acknowledge through inbox or consumer state tables

## Primary Business Logic

- publish durable business events from e-commerce modules
- consume relevant upstream events if the commerce domain needs them
- guarantee idempotent event processing and replay safety
- keep cross-service communication decoupled from direct table access

## Process Flow

1. Source module writes business change and outbox record in one transaction where possible
2. Publisher sends event to RabbitMQ
3. Downstream services consume and process idempotently
4. Delivery state and failures are tracked for retries

## Use Cases

- order completion triggers loyalty accrual request
- invoice status updates trigger notifications and analytics refresh
- inventory change emits a stock-related event for downstream summaries

## API Surface

- internal `publishCommerceEvent`
- internal `consumeCommerceEvent`
- admin `GET /commerce-events/outbox` if monitoring UI is needed

## Edge Cases

- event published twice after retry
- consumer processes message after source state was corrected
- outbox rows accumulate because publisher is stalled
- downstream service assumes event delivery order that is not guaranteed globally

## Dependencies

- `orders`
- `inventory`
- `invoice-payments`
- RabbitMQ
- shared outbox and inbox infrastructure

## Out of Scope

- owning the original order, stock, or invoice state
- replacing synchronous read APIs where immediate consistency is required
