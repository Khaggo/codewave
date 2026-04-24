# Catalog And Product Discovery Mobile Flow

## Task ID

`T524`

## Title

Integrate customer-mobile catalog and product discovery.

## Type

`client-integration`

## Status

`done`

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

## Module Name

Catalog / Product Discovery

## Description

Customer mobile browse-only ecommerce slice for category discovery, active product listing, and single-product detail lookup backed by ecommerce-service catalog routes.

## Business Value

- lets customers discover published shop products without mixing product reads into service-booking routes
- creates a clean browse-first surface before cart, checkout, and order history land
- keeps visibility and publish-state ownership in ecommerce-service instead of static mobile content
- gives the customer app an honest offline or service-unavailable state when ecommerce-service is not running

## Login, Registration, And Booking Integration Points

- login is not the source of catalog truth, but the signed-in customer session may still carry the bearer token through the catalog boundary when available
- registration stays separate and must not be required just to define catalog visibility rules
- booking and service selection remain distinct from ecommerce product browsing, even when both are visible in the same customer dashboard
- no booking slot, vehicle, or service reservation behavior may be implied while the customer is only browsing products

## Required Database/API Changes

- use the existing ecommerce catalog routes from `T202`: `GET /api/products`, `GET /api/products/:id`, and `GET /api/product-categories`
- no new backend schema or DTO changes are required for this mobile integration slice
- customer mobile may derive ecommerce-service from the same host as `EXPO_PUBLIC_API_BASE_URL` by switching to port `3001`, or use `EXPO_PUBLIC_ECOMMERCE_API_BASE_URL` explicitly
- keep backoffice product/category mutation routes out of the customer mobile surface

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
- `docs/contracts/T524-catalog-and-product-discovery-mobile-flow.md` documents the live browse-only route set and the ecommerce-service runtime note

## Out of Scope

- cart mutation
- order history
