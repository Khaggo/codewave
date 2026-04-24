# Inventory And Stock Visibility Web Flow

## Task ID

`T527`

## Title

Integrate staff-admin web inventory and stock visibility.

## Type

`client-integration`

## Status

`done`

## Priority

`low`

## Owner Role

`integration-worker`

## Source of Truth

- `../../domains/ecommerce/inventory.md`
- `../../frontend-backend-sync.md`
- `../../../team-flow-staff-admin-web-lifecycle.md`

## Depends On

- `T202`
- `T203`

## Goal

Define the staff-web inventory visibility flow, using live stock contracts where available and clearly labeling planned stock controls where they are not yet exposed.

## Module Name

Inventory Visibility / Stock Contract Boundary

## Description

Staff-admin web slice for live ecommerce product visibility, refreshed product detail, and explicit planned stock-state modeling while inventory quantity routes are still not exposed by the backend.

## Business Value

- gives advisers and admins a truthful inventory admin surface instead of a fake live stock dashboard
- keeps backoffice users aligned on which inventory reads are really live today versus still queued
- preserves confidence in ecommerce product visibility without inventing quantity-on-hand or reservation behavior
- creates a stable contract pack for later inventory-controller implementation without forcing UI rewrites twice

## Login, Registration, And Booking Integration Points

- login provides the authenticated staff session and role gating required for `/admin/inventory`
- registration stays unrelated because web remains staff/admin only and customer signup stays mobile-only
- booking flows remain separate from inventory visibility; the web inventory page can mention checkout or reservation intent but must not mutate booking truth
- customer mobile catalog and checkout can coexist with this page because the live overlap is product visibility only, not staff-owned stock adjustment

## Required Database/API Changes

- use existing live ecommerce catalog routes for visibility: `GET /api/products`, `GET /api/products/:id`, and `GET /api/product-categories`
- document planned inventory routes from the domain doc without inventing them in the client: `GET /inventory/products/:productId` and `POST /inventory/adjustments`
- no backend schema or DTO change is required for this client-integration slice
- keep quantity, reservation, movement-log, and adjustment behavior labeled as planned until the backend inventory module exposes real contracts

## Deliverables

- inventory visibility contract pack
- stock-state glossary labeled `live` or `planned`
- web mocks for in-stock, low-stock, reserved, and out-of-stock cases

## Implementation Notes

- do not invent inventory write behavior not present in the backend
- live and planned stock controls must be separated clearly
- stock visibility should remain distinct from catalog exposure rules

## Acceptance Checks

- inventory views distinguish live and planned routes explicitly
- low-stock and reserved states are modeled without hidden client logic
- no undocumented stock mutation actions appear in the pack
- `docs/contracts/T527-inventory-and-stock-visibility-web-flow.md` documents the live catalog-backed visibility routes, planned inventory routes, and known API gaps

## Out of Scope

- procurement workflows
- catalog merchandising rules
