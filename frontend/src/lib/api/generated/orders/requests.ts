import type { RouteContract } from '../shared';

export interface CheckoutInvoiceAddressRequest {
  recipientName: string;
  email: string;
  contactPhone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode?: string;
}

export interface CheckoutInvoiceRequest {
  customerUserId: string;
  billingAddress: CheckoutInvoiceAddressRequest;
  notes?: string;
}

export type EcommerceOrderStatus = 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled';
export type EcommerceInvoiceStatus = 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface OrderHistoryQuery {
  status?: EcommerceOrderStatus;
  invoiceStatus?: EcommerceInvoiceStatus;
}

export interface UpdateOrderStatusRequest {
  status: Exclude<EcommerceOrderStatus, 'invoice_pending'>;
  reason?: string;
}

export interface CancelOrderRequest {
  reason?: string;
}

export const ordersRoutes: Record<string, RouteContract> = {
  checkoutInvoice: {
    method: 'POST',
    path: '/api/checkout/invoice',
    status: 'live',
    source: 'swagger',
  },
  getOrderById: {
    method: 'GET',
    path: '/api/orders/:id',
    status: 'live',
    source: 'swagger',
  },
  listOrdersByUserId: {
    method: 'GET',
    path: '/api/users/:id/orders',
    status: 'live',
    source: 'swagger',
  },
  updateOrderStatus: {
    method: 'PATCH',
    path: '/api/orders/:id/status',
    status: 'live',
    source: 'swagger',
  },
  cancelOrder: {
    method: 'POST',
    path: '/api/orders/:id/cancel',
    status: 'live',
    source: 'swagger',
  },
};
