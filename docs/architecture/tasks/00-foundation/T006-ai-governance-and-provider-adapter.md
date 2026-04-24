# AI Governance And Provider Adapter

## Task ID

`T006`

## Title

Define AI governance and provider-adapter policy.

## Type

`foundation`

## Status

`done`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../ai-governance.md`
- `../api-strategy.md`
- `../system-architecture.md`

## Depends On

- `T004`

## Goal

Define the safe implementation rules for approved Phase 2 AI features before any lifecycle summary or QA auditor work starts.

## Deliverables

- AI governance policy
- provider-adapter requirements
- human-review and provenance rules

## Implementation Notes

- approved scope is limited to lifecycle summaries and QA audit support
- no hard-coded model IDs in canonical docs
- chatbot remains deterministic

## Acceptance Checks

- AI docs mention provider adapter and human review
- AI scope stays separate from chatbot behavior

## Out of Scope

- provider SDK integration
