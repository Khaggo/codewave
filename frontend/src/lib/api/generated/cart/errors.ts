import type { ApiErrorResponse } from '../shared';

export const cartErrorCases: Record<string, ApiErrorResponse[]> = {
  addCartItem: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Product not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Product is inactive and cannot be added to the cart.',
      source: 'swagger',
    },
  ],
  updateCartItem: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cart item not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Product is inactive and cannot stay in the cart.',
      source: 'swagger',
    },
  ],
  removeCartItem: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cart item not found.',
      source: 'swagger',
    },
  ],
  checkoutPreview: [
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Cart is empty or contains unavailable products and cannot be checked out.',
      source: 'swagger',
    },
  ],
};
