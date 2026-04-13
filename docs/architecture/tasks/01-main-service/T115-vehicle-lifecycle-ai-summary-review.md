# Vehicle Lifecycle AI Summary Review

## Task ID

`T115`

## Title

Add review-gated AI summaries to vehicle lifecycle.

## Type

`domain`

## Status

`ready`

## Priority

`medium`

## Owner Role

`domain-worker`

## Source of Truth

- `../../domains/main-service/vehicle-lifecycle.md`
- `../../ai-governance.md`

## Depends On

- `T006`
- `T103`
- `T116`

## Goal

Generate layman-friendly lifecycle summaries while keeping reviewer approval mandatory before customers can see them.

## Deliverables

- lifecycle summary records
- generate and review endpoints
- customer visibility gating

## Implementation Notes

- use provider adapter, not vendor-specific logic in the domain
- summaries should be built from filtered, approved evidence

## Acceptance Checks

- AI summaries remain hidden until reviewed
- review metadata is stored with the summary

## Out of Scope

- free-form AI chat
