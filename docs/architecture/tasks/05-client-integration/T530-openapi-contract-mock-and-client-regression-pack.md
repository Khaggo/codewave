# OpenAPI Contract Mock And Client Regression Pack

## Task ID

`T530`

## Title

Create the final client regression pack across OpenAPI, typed contracts, mocks, and acceptance states.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../api-strategy.md`
- `../../frontend-backend-sync.md`
- `../../dto-policy.md`
- `../../../team-flow-engineering-source-of-truth.md`

## Depends On

- `T528`
- `T529`
- `T407`

## Goal

Close the client-integration track with one regression layer that checks task outputs, contract packs, typed contracts, mocks, and live Swagger against one another.

## Deliverables

- client regression checklist
- route-by-route drift matrix for live versus planned states
- mock coverage checklist for happy, empty, error, unauthorized, forbidden, and conflict states

## Implementation Notes

- Swagger remains the runtime truth for implemented routes
- task and domain docs remain the intended truth for planned routes
- regression checks should surface drift, not hide it with silent fallback assumptions

## Acceptance Checks

- all client slices can be traced back to task, domain, and Swagger truth
- live routes and typed contracts stay aligned
- mocks cover the required state families across the completed client slices

## Out of Scope

- new business-domain behavior
- infrastructure changes unrelated to contract validation

