# commerce-events

## Domain ID

`ecommerce.commerce-events`

## Agent Summary

Load this doc for outbox, inbox, and cross-service event publication from e-commerce domains. Skip it for local order or inventory business rules.

## Primary Objective

Own durable asynchronous communication from e-commerce domains without replacing source-domain ownership or immediate consistency reads.

## Inputs

- outbox records from orders, inventory, and invoice-payments
- downstream consumer acknowledgements
- retry and replay signals

## Outputs

- published RabbitMQ business events such as `order.created`, `order.invoice_issued`, and `invoice.payment_recorded`
- inbox or delivery state
- retry and failure tracking

## Dependencies

- `ecommerce.orders`
- `ecommerce.inventory`
- `ecommerce.invoice-payments`

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
- keep the first stable commerce facts limited to `order.created`, `order.invoice_issued`, and `invoice.payment_recorded`
- consume relevant upstream events if the commerce domain needs them
- guarantee idempotent event processing and replay safety
- keep cross-service communication decoupled from direct table access
- keep `invoice.payment_recorded` as the purchase-accrual fact for loyalty, while service-side loyalty accrual stays outside ecommerce on `service.invoice_finalized`

## Process Flow

1. Source module writes business change and outbox record in one transaction where possible.
2. Publisher sends the event to RabbitMQ.
3. Downstream services consume and process idempotently.
4. Delivery state and failures are tracked for retries.

## Use Cases

- order creation triggers analytics without direct main-service reads into ecommerce tables
- invoice issuance triggers notifications and analytics refresh planning
- invoice payment recorded triggers loyalty, notifications, and analytics reactions
- downstream services use `invoice.payment_recorded` for purchase accrual only, not as proof that a service invoice was finalized
- inventory change emits stock-related events for downstream summaries

## API Surface

- internal `publishCommerceEvent`
- internal `planCommerceEventReactions`
- admin `GET /commerce-events/outbox`

## Edge Cases

- event published twice after retry
- consumer processes a message after source state was corrected
- outbox rows accumulate because the publisher is stalled
- consumer treats `invoice.payment_recorded` as settlement proof for gateway logic that does not exist in scope
- downstream loyalty logic awards points from `order.created` instead of `invoice.payment_recorded`
- downstream service assumes global delivery order that is not guaranteed

## Writable Sections

- outbox and inbox semantics, event names, event delivery rules, and commerce-event edge cases
- do not redefine local order, inventory, or invoice business behavior here

## Out of Scope

- owning the original order, stock, or invoice state
- replacing synchronous read APIs where immediate consistency is required
