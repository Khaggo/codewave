# T203 Cart And Invoice Checkout

## Slice ID

`T203`

## Source Of Truth

- `docs/architecture/domains/ecommerce/cart.md`
- `docs/architecture/domains/ecommerce/orders.md`
- `docs/architecture/domains/ecommerce/invoice-payments.md`
- `docs/architecture/tasks/02-ecommerce-service/T203-cart-and-invoice-checkout.md`
- live controllers when implemented:
  - `backend/apps/ecommerce-service/src/modules/cart/controllers/cart.controller.ts`
  - `backend/apps/ecommerce-service/src/modules/orders/controllers/orders.controller.ts`
  - `backend/apps/ecommerce-service/src/modules/invoice-payments/controllers/invoice-payments.controller.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/cart` | `live` | Swagger/controller |
| `POST /api/cart/items` | `live` | Swagger/controller |
| `PATCH /api/cart/items/:itemId` | `live` | Swagger/controller |
| `DELETE /api/cart/items/:itemId` | `live` | Swagger/controller |
| `POST /api/cart/checkout-preview` | `live` | Swagger/controller |
| `POST /api/checkout/invoice` | `live` | Swagger/controller |
| `GET /api/orders/:id` | `live` | Swagger/controller |
| `GET /api/users/:id/orders` | `live` | Swagger/controller |
| `GET /api/invoices/:id` | `live` | Swagger/controller |
| `GET /api/orders/:id/invoice` | `live` | Swagger/controller |

## Frontend Contract Files

- `frontend/src/lib/api/generated/cart/requests.ts`
- `frontend/src/lib/api/generated/cart/responses.ts`
- `frontend/src/lib/api/generated/cart/errors.ts`
- `frontend/src/mocks/cart/mocks.ts`
- `frontend/src/lib/api/generated/orders/requests.ts`
- `frontend/src/lib/api/generated/orders/responses.ts`
- `frontend/src/lib/api/generated/orders/errors.ts`
- `frontend/src/mocks/orders/mocks.ts`
- `frontend/src/lib/api/generated/invoice-payments/requests.ts`
- `frontend/src/lib/api/generated/invoice-payments/responses.ts`
- `frontend/src/lib/api/generated/invoice-payments/errors.ts`
- `frontend/src/mocks/invoice-payments/mocks.ts`

## Frontend States To Cover

- empty cart state
- add-to-cart and quantity-update state
- inactive or unavailable cart item conflict state
- invoice checkout preview state
- invoice checkout success state with generated order and invoice references
- order detail page showing immutable item snapshots
- invoice detail page showing pending-payment status

## Notes

- This slice is invoice-only by design and does not imply payment-gateway settlement.
- Cart routes use the customer identity context directly because ecommerce auth is not wired yet in this service.
- Order items snapshot product name, SKU, and price at checkout time, so later catalog edits must not rewrite order history.
- Inventory reservation is still deferred to explicit inventory rules and is not owned by this slice.
