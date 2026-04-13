# FAQ Chatbot V1

## Task ID

`T114`

## Title

Build the deterministic FAQ chatbot.

## Type

`domain`

## Status

`ready`

## Priority

`medium`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/chatbot.md`
- `../../ai-governance.md`

## Depends On

- `T105`
- `T110`

## Goal

Implement a rule-based 24/7 FAQ chatbot that answers common questions and escalates unsupported issues safely.

## Deliverables

- intent and rule storage
- deterministic reply flow
- escalation handling

## Implementation Notes

- this task must not introduce generative AI
- allowed lookups should stay tightly scoped

## Acceptance Checks

- common booking and insurance FAQs resolve deterministically
- unsupported prompts escalate instead of hallucinating

## Out of Scope

- generative AI chat
