# chatbot

## Purpose

Own the rule-based inquiry assistant that helps customers navigate common questions, booking guidance, insurance steps, order lookups, and escalation paths.

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
- escalate to staff when intent confidence or rule coverage is insufficient
- avoid pretending to be an autonomous AI decision-maker
- optionally route to booking, insurance, or order status lookups through allowed APIs

## Process Flow

1. Customer asks a question
2. Rule engine matches intent and extracts simple parameters
3. System replies with a deterministic answer or guided next step
4. If unresolved, conversation is escalated or logged for staff follow-up

## Use Cases

- customer asks how to book a service
- customer asks for order or invoice status
- customer asks what documents are needed for insurance inquiry
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

## Dependencies

- `bookings`
- `insurance`
- `orders`
- `notifications`
- analytics or logs for improvement feedback

## Out of Scope

- generative AI decisioning
- autonomous booking creation without confirmation
- free-form claims assessment
