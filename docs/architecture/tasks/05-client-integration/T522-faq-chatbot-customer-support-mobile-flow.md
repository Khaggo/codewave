# FAQ Chatbot Customer Support Mobile Flow

## Task ID

`T522`

## Title

Integrate customer-mobile FAQ chatbot and escalation-aware support states.

## Type

`client-integration`

## Status

`done`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/chatbot.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T114`
- `T507`

## Goal

Define the customer-mobile chatbot experience for deterministic FAQ guidance, supported intents, and escalation paths.

## Module Name

FAQ Chatbot / Customer Support

## Description

Customer mobile support module for deterministic FAQ answers, supported support intents, and escalation-aware states after the core operational chain is stable. It should guide customers without pretending to be autonomous service decision-making.

## Business Value

- reduces repetitive staff support questions after login, booking, vehicle, and service flows are live
- gives customers quick guidance on account, booking, service, loyalty, and insurance questions
- provides a controlled escalation path when FAQ support cannot resolve the request
- keeps support behavior scalable by using approved intents and answer contracts

## Login, Registration, And Booking Integration Points

- login can personalize FAQ context for customer-safe account, vehicle, booking, loyalty, and insurance guidance
- registration and OTP questions should stay informational and never bypass auth flows
- booking-related answers may deep-link to booking history/detail screens when safe
- support escalation should reference booking or vehicle context only when the customer owns it

## Required Database/API Changes

- use existing FAQ chatbot request, response, supported-intent, and escalation contracts from `T114`
- document any missing escalation persistence or staff handoff route as a future API gap
- do not add free-form generative behavior unless the chatbot domain doc is updated first
- no immediate backend API change is required unless OpenAPI verification shows FAQ or escalation routes are missing

## Deliverables

- chatbot contract pack
- customer support states for answered, unresolved, and escalated cases
- intent and escalation mocks
- post-core rollout note showing this task follows notifications, job orders, QA, back-jobs, and analytics in the build order

## Implementation Notes

- the chatbot remains FAQ and rule-based, not autonomous AI support
- escalation should be modeled as a clear state, not a hidden failure fallback
- do not imply free-form generative behavior beyond the approved scope
- keep customer support customer-only on mobile; staff/admin management is out of scope unless a separate web task is opened

## Acceptance Checks

- chatbot request and response shapes align with live contracts
- unsupported intent and escalation cases are explicit
- the client contract does not advertise autonomous decision-making
- booking, vehicle, loyalty, and insurance deep links respect customer ownership and auth state
- support enhancement remains ordered after the core operational chain in the queue
- `docs/contracts/T522-faq-chatbot-customer-support-mobile-flow.md` documents the live customer routes, manual escalation path, and post-core rollout ordering note

## Out of Scope

- staff admin intent management
- analytics dashboards
