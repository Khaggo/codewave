# Orchestrator Routing And Improvement Intake

## Task ID

`T409`

## Title

Make orchestrator-first routing and self-improvement intake explicit.

## Type

`quality`

## Status

`in_progress`

## Priority

`high`

## Owner Role

`integration-worker`

## Source of Truth

- `../../system-architecture.md`
- `../../agents/orchestrator.md`
- `../../agents/operating-rules.md`
- `../../frontend-backend-sync.md`
- `../../_backlog/agent-improvement-queue.md`

## Depends On

- `T408`

## Goal

Make the orchestrator the default front door for freeform prompts and add a visible evidence-intake path so repeated confusion, drift, and stagnation become bounded recovery work instead of disappearing.

## Deliverables

- explicit orchestrator-first routing language in canonical control-plane docs
- explicit evidence triage rules for `noise`, `observation`, and `bounded proposal`
- non-canonical improvement queue seeded with recovery observations
- validator-passing manifest refresh for every changed canonical doc

## Implementation Notes

- keep the improvement queue non-canonical so it can move faster than validator-backed source docs
- preserve human approval before canonical changes are accepted
- use `integration-worker` because the rollout spans control-plane routing plus cross-surface coordination rules

## Acceptance Checks

- freeform user requests route to the orchestrator by default unless a role is explicitly named
- repeated clarification, validator failure, doc or code drift, stale control docs, unresolved `ready` queues, conflicting docs, and repeated frontend/backend mismatch are valid improvement-evidence inputs
- orchestrator triage outcomes are explicit: `reject as noise`, `log observation`, or `create bounded proposal`
- the improvement queue and this task are not added to the canonical manifest
- `npm run docs:validate` passes after canonical updates and manifest refresh

## Out of Scope

- building a separate automated multi-agent runtime
- allowing automatic canonical doc mutation without human approval
