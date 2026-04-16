export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  description?: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderAddressResponse {
  id: string;
  addressType: 'billing';
  recipientName: string;
  email: string;
  contactPhone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province: string;
  postalCode?: string | null;
}

export interface OrderInvoiceSummaryResponse {
  id: string;
  invoiceNumber: string;
  status: 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  totalCents: number;
  amountDueCents: number;
}

export interface OrderStatusHistoryResponse {
  id: string;
  previousStatus: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled' | null;
  nextStatus: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled';
  reason: string | null;
  transitionType: 'checkout' | 'status_update' | 'cancel';
  changedAt: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  customerUserId: string;
  checkoutMode: 'invoice';
  status: 'invoice_pending' | 'awaiting_fulfillment' | 'fulfilled' | 'cancelled';
  subtotalCents: number;
  notes?: string | null;
  items: OrderItemResponse[];
  addresses: OrderAddressResponse[];
  invoice: OrderInvoiceSummaryResponse | null;
  statusHistory: OrderStatusHistoryResponse[];
  createdAt: string;
  updatedAt: string;
}
