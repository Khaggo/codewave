# chatbot

## Domain ID

`main-service.chatbot`

## Agent Summary

Load this doc for deterministic 24/7 FAQ routing, intent rules, and escalation paths. Skip it for generative AI behavior or autonomous decision-making.

## Primary Objective

Provide a rule-based 24/7 inquiry assistant that routes common requests predictably and escalates unsupported cases instead of pretending to reason autonomously.

## Inputs

- user messages
- configured intents and rules
- allowed lookup APIs from supporting domains

## Outputs

- routed or answered chatbot responses
- escalation records
- conversation logs for later improvement

## Dependencies

- `main-service.bookings`
- `main-service.insurance`
- `ecommerce.orders`

## Owned Data / ERD

Primary tables or equivalents:
- `chatbot_intents`
- `chatbot_rules`
- `chatbot_conversations`
- `chatbot_escalations`

Key relations:
- one conversation belongs to one user session or customer identity
- one matched intent may produce one escalation or one routed action

## Primary Business Logic

- map user utterances to rule-based intents
- answer with deterministic, approved flows
- escalate to staff when rule coverage is insufficient
- optionally route to booking, insurance, or order status lookups through allowed APIs
- avoid autonomous AI decision-making claims

## Process Flow

1. Customer asks a question.
2. The rule engine matches intent and extracts simple parameters.
3. The system replies with a deterministic answer or guided next step.
4. If unresolved, the conversation is escalated or logged for staff follow-up.

## Use Cases

- customer asks how to book a service
- customer asks for order or invoice status
- customer asks what documents are needed for an insurance inquiry
- customer asks a common workshop FAQ outside business hours
- unsupported question is escalated to staff

## API Surface

- `POST /chatbot/messages`
- `GET /chatbot/intents`
- `POST /chatbot/escalations`

## Edge Cases

- ambiguous intent maps to the wrong workflow
- chatbot exposes internal states that should remain staff-only
- unsupported issue loops without escalation
- rule updates break prior keyword matching behavior

## Writable Sections

- rule-based intents, escalation paths, chatbot APIs, and chatbot edge cases
- do not introduce generative AI or autonomous workflow execution here

## Out of Scope

- generative AI decisioning
- autonomous booking creation without confirmation
- free-form claims assessment
