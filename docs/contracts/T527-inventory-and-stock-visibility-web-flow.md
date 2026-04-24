# T527 Inventory And Stock Visibility Web Flow

## Slice ID

`T527`

## Source Of Truth

- `docs/architecture/domains/ecommerce/inventory.md`
- `docs/architecture/domains/ecommerce/catalog.md`
- `docs/architecture/tasks/05-client-integration/T527-inventory-and-stock-visibility-web-flow.md`
- live controller:
  - `backend/apps/ecommerce-service/src/modules/catalog/controllers/catalog.controller.ts`
- planned backend stub:
  - `backend/apps/ecommerce-service/src/modules/inventory/inventory.module.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/products` | `live` | ecommerce-service catalog controller and generated catalog route contract |
| `GET /api/products/:id` | `live` | ecommerce-service catalog controller and generated catalog route contract |
| `GET /api/product-categories` | `live` | ecommerce-service catalog controller and generated catalog route contract |
| `GET /inventory/products/:productId` | `planned` | inventory domain and T527 task doc |
| `POST /inventory/adjustments` | `planned` | inventory domain and T527 task doc |

## Web Surface

- protected route: `frontend/src/app/admin/inventory/page.js`
- primary workspace: `frontend/src/screens/InventoryWorkspace.js`
- client boundary: `frontend/src/lib/inventoryAdminClient.js`

## Frontend Contract Files

- `frontend/src/lib/api/generated/catalog/requests.ts`
- `frontend/src/lib/api/generated/catalog/responses.ts`
- `frontend/src/lib/api/generated/inventory/staff-web-inventory.ts`
- `frontend/src/lib/inventoryAdminClient.js`
- `frontend/src/mocks/inventory/mocks.ts`

## Frontend States To Cover

- live product-directory loading from ecommerce-service catalog routes
- partial-load state when products or categories fail independently
- service-unavailable state when ecommerce-service on port `3001` is offline
- selected product metadata refresh from `GET /api/products/:id`
- planned stock-state glossary for in-stock, low-stock, reserved, and out-of-stock scenarios
- forbidden state for technician sessions that should not open inventory administration

## Known API Gaps

- no live ecommerce inventory controller is exposed yet beyond an empty module stub
- quantity on hand, reserved quantity, and movement logs are not present in the live product DTOs
- stock adjustments remain planned and must not appear as live write behavior in the web client

## Runtime Note

- the web client may derive ecommerce-service from `NEXT_PUBLIC_API_BASE_URL` by switching to port `3001`, or it may use `NEXT_PUBLIC_ECOMMERCE_API_BASE_URL` explicitly
- current live inventory visibility is catalog-backed, not quantity-backed
- stock state remains distinct from product publication state and must stay labeled honestly until inventory routes ship

## Scope Guard

- this task owns staff web visibility and contract honesty only
- no procurement workflows, restock UI, or manual adjustment write actions are implied
- catalog merchandising remains a separate admin surface from inventory quantity truth
