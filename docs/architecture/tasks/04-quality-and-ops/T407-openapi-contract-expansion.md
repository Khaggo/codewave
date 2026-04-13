# OpenAPI Contract Expansion

## Task ID

`T407`

## Title

Expand OpenAPI coverage across the new domains.

## Type

`quality`

## Status

`ready`

## Priority

`medium`

## Owner Role

`test-worker`

## Source of Truth

- `../../api-strategy.md`
- `../../dto-policy.md`
- `../../golden-domain-template.md`

## Depends On

- `T105`
- `T106`
- `T110`

## Goal

Extend Swagger discipline from auth and users into bookings, job orders, insurance, and later QA-oriented admin routes.

## Deliverables

- Swagger annotations for new public endpoints
- live spec checks for newly exposed routes
- DTO contract verification

## Implementation Notes

- document only implemented routes
- keep response DTOs explicit

## Acceptance Checks

- `/docs-json` includes the expanded route set
- live Swagger checks pass for implemented domains

## Out of Scope

- internal-only events or jobs
