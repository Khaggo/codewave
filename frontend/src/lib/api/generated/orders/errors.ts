import type { ApiErrorResponse } from '../shared';

export const ordersErrorCases: Record<string, ApiErrorResponse[]> = {
  checkoutInvoice: [
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Cart is empty or contains unavailable products and cannot be checked out.',
      source: 'swagger',
    },
  ],
  getOrderById: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Order not found.',
      source: 'swagger',
    },
  ],
  updateOrderStatus: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Order not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The requested order transition is not allowed.',
      source: 'swagger',
    },
  ],
  cancelOrder: [
    {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Order not found.',
      source: 'swagger',
    },
    {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'The order can no longer be cancelled.',
      source: 'swagger',
    },
  ],
};
