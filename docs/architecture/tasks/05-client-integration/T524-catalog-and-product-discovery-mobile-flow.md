# Catalog And Product Discovery Mobile Flow

## Task ID

`T524`

## Title

Integrate customer-mobile catalog and product discovery.

## Type

`client-integration`

## Status

`ready`

## Priority

`medium`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/ecommerce/catalog.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-customer-mobile-lifecycle.md`

## Depends On

- `T202`

## Goal

Define the customer-mobile catalog browsing and product discovery flow using the live ecommerce catalog contracts.

## Deliverables

- catalog discovery contract pack
- category and product-list mobile states
- mocks for empty catalog, hidden product, and product-detail discovery states

## Implementation Notes

- keep category exposure and product visibility backend-owned
- do not imply inventory reservation behavior during browsing
- maintain product-card and detail shapes from documented DTOs

## Acceptance Checks

- catalog browse screens use live route and DTO contracts only
- empty and hidden-product states are explicit
- product visibility labels stay aligned with the catalog domain doc

## Out of Scope

- cart mutation
- order history

