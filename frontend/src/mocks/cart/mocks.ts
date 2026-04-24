import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type {
  CartResponse,
  CheckoutPreviewResponse,
} from '../../lib/api/generated/cart/responses';

export const emptyCartMock: CartResponse = {
  id: '77777777-7777-4777-8777-777777777777',
  customerUserId: '55555555-5555-4555-8555-555555555555',
  items: [],
  subtotalCents: 0,
  totalQuantity: 0,
  createdAt: '2026-05-14T04:00:00.000Z',
  updatedAt: '2026-05-14T04:00:00.000Z',
};

export const activeCartMock: CartResponse = {
  ...emptyCartMock,
  items: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      productId: '22222222-2222-4222-8222-222222222222',
      productName: 'Premium Engine Oil 5W-30',
      productSlug: 'premium-engine-oil-5w30',
      productSku: 'ENG-OIL-5W30',
      quantity: 2,
      unitPriceCents: 189900,
      lineTotalCents: 379800,
      availabilityStatus: 'available',
      createdAt: '2026-05-14T04:00:00.000Z',
      updatedAt: '2026-05-14T04:05:00.000Z',
    },
  ],
  subtotalCents: 379800,
  totalQuantity: 2,
  updatedAt: '2026-05-14T04:05:00.000Z',
};

export const checkoutPreviewMock: CheckoutPreviewResponse = {
  cartId: activeCartMock.id,
  customerUserId: activeCartMock.customerUserId,
  checkoutMode: 'invoice',
  items: activeCartMock.items,
  subtotalCents: activeCartMock.subtotalCents,
  totalQuantity: activeCartMock.totalQuantity,
};

export const cartUnavailableConflictErrorMock: ApiErrorResponse = {
  statusCode: 409,
  code: 'CONFLICT',
  message: 'Cart contains unavailable products',
  source: 'swagger',
};

export const cartItemMissingErrorMock: ApiErrorResponse = {
  statusCode: 404,
  code: 'NOT_FOUND',
  message: 'Cart item not found',
  source: 'swagger',
};

export const checkoutValidationErrorMock: ApiErrorResponse = {
  statusCode: 400,
  code: 'VALIDATION_ERROR',
  message: 'Cart is empty or contains unavailable products and cannot be checked out',
  source: 'swagger',
};
