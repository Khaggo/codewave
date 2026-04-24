# T526 Order History And Invoice Tracking Mobile Flow

## Slice ID

`T526`

## Source Of Truth

- `docs/architecture/domains/ecommerce/orders.md`
- `docs/architecture/domains/ecommerce/invoice-payments.md`
- `docs/architecture/tasks/05-client-integration/T526-order-history-and-invoice-tracking-mobile-flow.md`
- live controllers:
  - `backend/apps/ecommerce-service/src/modules/orders/controllers/orders.controller.ts`
  - `backend/apps/ecommerce-service/src/modules/invoice-payments/controllers/invoice-payments.controller.ts`
- generated route contracts:
  - `frontend/src/lib/api/generated/orders/requests.ts`
  - `frontend/src/lib/api/generated/invoice-payments/requests.ts`

## Route Status

| Route | Status | Source |
| --- | --- | --- |
| `GET /api/users/:id/orders` | `live` | ecommerce-service orders controller and generated route contract |
| `GET /api/orders/:id` | `live` | ecommerce-service orders controller and generated route contract |
| `GET /api/orders/:id/invoice` | `live` | ecommerce-service invoice-payments controller and generated route contract |
| `POST /api/invoices/:id/payments` | `live` | staff/manual tracking route; customer mobile treats it as read-only downstream truth |

## Mobile Surface

- customer dashboard store tab: `mobile/src/screens/Dashboard.js`
- ecommerce order-history and invoice-tracking client boundary: `mobile/src/lib/ecommerceCheckoutClient.js`

## Frontend Contract Files

- `frontend/src/lib/api/generated/orders/requests.ts`
- `frontend/src/lib/api/generated/orders/responses.ts`
- `frontend/src/lib/api/generated/invoice-payments/requests.ts`
- `frontend/src/lib/api/generated/invoice-payments/responses.ts`
- `frontend/src/lib/api/generated/orders/customer-mobile-order-history.ts`
- `frontend/src/mocks/orders/mocks.ts`
- `frontend/src/mocks/invoice-payments/mocks.ts`

## Frontend States To Cover

- order-history loading while mobile reads the authenticated customer order list
- order-history empty when checkout has not created any ecommerce orders yet
- order-detail loading while the immutable order snapshot is refreshed
- invoice-tracking ready when aging, due amount, and payment entries are returned
- invoice-tracking missing when the order exists but no invoice record is returned yet
- overdue, partially paid, fully paid, and cancelled invoice states as explicit backend facts

## Runtime Note

- customer mobile may derive ecommerce-service from the same host as `EXPO_PUBLIC_API_BASE_URL` by switching to port `3001`
- invoice aging and payment entries are read-only customer views of backend records; they must not imply payment-gateway settlement
- order history remains separate from booking history even though both are available in the same mobile dashboard

## Scope Guard

- this task owns customer-mobile order history, immutable order snapshot review, invoice aging, and payment-entry visibility
- cart mutation and invoice checkout create remain in `T525`
- payment-entry creation, invoice status mutation, and fulfillment actions stay staff-owned
