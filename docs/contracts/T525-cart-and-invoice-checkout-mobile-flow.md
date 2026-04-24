# T525 Cart And Invoice Checkout Mobile Flow

## Slice ID

`T525`

## Source Of Truth

- `docs/architecture/domains/ecommerce/cart.md`
- `docs/architecture/domains/ecommerce/orders.md`
- `docs/architecture/domains/ecommerce/invoice-payments.md`
- `docs/architecture/tasks/05-client-integration/T525-cart-and-invoice-checkout-mobile-flow.md`
- live controllers:
  - `backend/apps/ecommerce-service/src/modules/cart/controllers/cart.controller.ts`
  - `backend/apps/ecommerce-service/src/modules/orders/controllers/orders.controller.ts`
- generated route contracts:
  - `frontend/src/lib/api/generated/cart/requests.ts`
  - `frontend/src/lib/api/generated/orders/requests.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/cart` | `live` | ecommerce-service cart controller and generated route contract |
| `POST /api/cart/items` | `live` | ecommerce-service cart controller and generated route contract |
| `PATCH /api/cart/items/:itemId` | `live` | ecommerce-service cart controller and generated route contract |
| `DELETE /api/cart/items/:itemId` | `live` | ecommerce-service cart controller and generated route contract |
| `POST /api/cart/checkout-preview` | `live` | ecommerce-service cart controller and generated route contract |
| `POST /api/checkout/invoice` | `live` | ecommerce-service orders controller and generated route contract |
| `GET /api/orders/:id` | `live` | next-slice order tracking route, out of scope for this task |
| `GET /api/users/:id/orders` | `live` | next-slice order history route, out of scope for this task |

## Mobile Surface

- customer dashboard store tab: `mobile/src/screens/Dashboard.js`
- catalog section entry point: `mobile/src/components/shop/ShopCatalogSection.js`
- ecommerce checkout client boundary: `mobile/src/lib/ecommerceCheckoutClient.js`

## Frontend Contract Files

- `frontend/src/lib/api/generated/cart/requests.ts`
- `frontend/src/lib/api/generated/cart/responses.ts`
- `frontend/src/lib/api/generated/orders/requests.ts`
- `frontend/src/lib/api/generated/orders/responses.ts`
- `frontend/src/lib/api/generated/cart/customer-mobile-checkout.ts`
- `frontend/src/mocks/cart/mocks.ts`
- `frontend/src/mocks/orders/mocks.ts`

## Frontend States To Cover

- cart loading while mobile reads the live ecommerce cart
- cart empty when the customer has no ecommerce items yet
- cart mutation failure when quantity update or delete cannot be applied
- invoice preview loading while the immutable checkout snapshot is being validated
- preview blocked when the cart is empty, missing an item, or contains unavailable products
- checkout validation error when billing-address fields are incomplete
- checkout complete after an invoice-backed order is created successfully

## Runtime Note

- customer mobile may derive ecommerce-service from the same host as `EXPO_PUBLIC_API_BASE_URL` by switching to port `3001`
- customer mobile may also use `EXPO_PUBLIC_ECOMMERCE_API_BASE_URL` explicitly when the ecommerce host differs from main-service
- invoice checkout creates an order and invoice-tracking record, but it does not imply payment settlement

## Scope Guard

- this task owns cart mutation, invoice preview, and invoice checkout creation only
- payment-entry tracking, invoice aging follow-up, and order history screens stay in later ecommerce slices
- booking flows remain independent from ecommerce cart state even when both live in the same mobile dashboard
