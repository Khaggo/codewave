# T524 Catalog And Product Discovery Mobile Flow

## Slice ID

`T524`

## Source Of Truth

- `docs/architecture/domains/ecommerce/catalog.md`
- `docs/architecture/tasks/05-client-integration/T524-catalog-and-product-discovery-mobile-flow.md`
- live controller: `backend/apps/ecommerce-service/src/modules/catalog/controllers/catalog.controller.ts`
- generated catalog routes: `frontend/src/lib/api/generated/catalog/requests.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/products` | `live` | ecommerce-service controller and generated Swagger-backed route contract |
| `GET /api/products/:id` | `live` | ecommerce-service controller and generated Swagger-backed route contract |
| `GET /api/product-categories` | `live` | ecommerce-service controller and generated Swagger-backed route contract |
| `POST /api/product-categories` | `live` | backoffice-only, out of scope for customer mobile |
| `PATCH /api/product-categories/:id` | `live` | backoffice-only, out of scope for customer mobile |
| `POST /api/products` | `live` | backoffice-only, out of scope for customer mobile |
| `PATCH /api/products/:id` | `live` | backoffice-only, out of scope for customer mobile |

## Mobile Surface

- customer browse tab: `mobile/src/screens/Dashboard.js`
- catalog UI section: `mobile/src/components/shop/ShopCatalogSection.js`
- mobile client boundary: `mobile/src/lib/catalogClient.js`

## Frontend Contract Files

- `frontend/src/lib/api/generated/catalog/requests.ts`
- `frontend/src/lib/api/generated/catalog/responses.ts`
- `frontend/src/lib/api/generated/catalog/errors.ts`
- `frontend/src/lib/api/generated/catalog/customer-mobile-catalog.ts`
- `frontend/src/mocks/catalog/mocks.ts`

## Frontend States To Cover

- catalog loading while customer mobile fetches categories and active products
- catalog empty when ecommerce-service returns zero active products
- catalog service unavailable when the ecommerce host or port `3001` is offline
- product detail ready after a fresh `GET /api/products/:id` lookup
- hidden product state when a discovered product is unpublished before the detail lookup resolves

## Mobile Runtime Note

- customer mobile may derive ecommerce-service from the same host as `EXPO_PUBLIC_API_BASE_URL` by switching to port `3001`
- customer mobile may also use `EXPO_PUBLIC_ECOMMERCE_API_BASE_URL` explicitly when the ecommerce host differs from main-service
- this slice does not reuse `main-service` port `3000` routes for catalog reads

## Scope Guard

- this task is browse-only
- no cart mutation, checkout submission, or order-history behavior is implied here
- product visibility stays backend-owned, and hidden products must resolve through the detail route rather than stale list assumptions
