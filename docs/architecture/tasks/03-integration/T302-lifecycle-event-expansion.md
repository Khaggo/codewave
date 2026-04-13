# Lifecycle Event Expansion

## Task ID

`T302`

## Title

Expand lifecycle event inputs across operations.

## Type

`integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/main-service/vehicle-lifecycle.md`
- `../../domains/main-service/job-orders.md`
- `../../domains/main-service/quality-gates.md`

## Depends On

- `T106`
- `T116`

## Goal

Extend lifecycle normalization so job orders, QA outcomes, and reviewed summary state can appear in the vehicle timeline without breaking source-domain ownership.

## Deliverables

- new lifecycle event mappings
- event contract definitions
- rebuild-safe projection updates

## Implementation Notes

- customer-visible entries must stay filtered
- verified events still require evidence-backed rules

## Acceptance Checks

- lifecycle can ingest the new operational facts safely
- replay or rebuild does not duplicate events

## Out of Scope

- AI summary generation itself
