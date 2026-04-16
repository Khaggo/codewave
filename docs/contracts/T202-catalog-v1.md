# T202 Catalog V1

## Slice ID

`T202`

## Source Of Truth

- `docs/architecture/domains/ecommerce/catalog.md`
- `docs/architecture/tasks/02-ecommerce-service/T202-catalog-v1.md`
- live controllers when implemented:
  - `backend/apps/ecommerce-service/src/modules/catalog/controllers/catalog.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/products` | `live` | Swagger/controller |
| `GET /api/products/:id` | `live` | Swagger/controller |
| `GET /api/product-categories` | `live` | Swagger/controller |
| `POST /api/product-categories` | `live` | Swagger/controller |
| `PATCH /api/product-categories/:id` | `live` | Swagger/controller |
| `POST /api/products` | `live` | Swagger/controller |
| `PATCH /api/products/:id` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/catalog/requests.ts`
- `frontend/src/lib/api/generated/catalog/responses.ts`
- `frontend/src/lib/api/generated/catalog/errors.ts`
- `frontend/src/mocks/catalog/mocks.ts`

## Frontend States To Cover

- active product list for customer-facing catalog reads
- product detail page with category metadata
- admin category create and edit form
- admin product create and edit form
- duplicate category slug conflict state
- duplicate product SKU conflict state
- invalid slug validation state

## Notes

- Customer-facing reads should only show active products and active categories.
- Category and product write routes are intended for staff/admin tooling, not public storefront self-service.
- Inventory ownership remains out of scope for this slice even though products reference category metadata.
- Order history must keep its own snapshots and should not reuse these live catalog objects directly.
