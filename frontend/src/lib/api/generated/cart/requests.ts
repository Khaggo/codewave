import type { RouteContract } from '../shared';

export interface CartCustomerQuery {
  customerUserId: string;
}

export interface AddCartItemRequest {
  customerUserId: string;
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  customerUserId: string;
  quantity: number;
}

export interface CheckoutPreviewRequest {
  customerUserId: string;
}

export const cartRoutes: Record<string, RouteContract> = {
  getCart: {
    method: 'GET',
    path: '/api/cart',
    status: 'live',
    source: 'swagger',
  },
  addCartItem: {
    method: 'POST',
    path: '/api/cart/items',
    status: 'live',
    source: 'swagger',
  },
  updateCartItem: {
    method: 'PATCH',
    path: '/api/cart/items/:itemId',
    status: 'live',
    source: 'swagger',
  },
  removeCartItem: {
    method: 'DELETE',
    path: '/api/cart/items/:itemId',
    status: 'live',
    source: 'swagger',
  },
  checkoutPreview: {
    method: 'POST',
    path: '/api/cart/checkout-preview',
    status: 'live',
    source: 'swagger',
    notes: 'Validates the active cart before invoice checkout.',
  },
};
