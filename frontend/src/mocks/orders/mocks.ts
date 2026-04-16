import type { OrderResponse } from '../../lib/api/generated/orders/responses';

export const checkoutOrderMock: OrderResponse = {
  id: '88888888-8888-4888-8888-888888888888',
  orderNumber: 'ORD-2026-0001',
  customerUserId: '55555555-5555-4555-8555-555555555555',
  checkoutMode: 'invoice',
  status: 'invoice_pending',
  subtotalCents: 99800,
  notes: 'Prepare for invoice pickup.',
  items: [
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      productId: '22222222-2222-4222-8222-222222222222',
      productName: 'Cabin Air Freshener',
      productSlug: 'cabin-air-freshener',
      sku: 'CABIN-FRESHENER-01',
      description: 'Interior product for invoice checkout testing.',
      quantity: 2,
      unitPriceCents: 49900,
      lineTotalCents: 99800,
    },
  ],
  addresses: [
    {
      id: '99999999-9999-4999-8999-999999999999',
      addressType: 'billing',
      recipientName: 'Juan Dela Cruz',
      email: 'juan@example.com',
      contactPhone: '+63 912 345 6789',
      addressLine1: '123 Service Street',
      addressLine2: 'Unit 3B',
      city: 'Makati',
      province: 'Metro Manila',
      postalCode: '1200',
    },
  ],
  invoice: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    invoiceNumber: 'INV-2026-0001',
    status: 'pending_payment',
    totalCents: 99800,
    amountDueCents: 99800,
  },
  statusHistory: [
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      previousStatus: null,
      nextStatus: 'invoice_pending',
      reason: 'Order created from invoice checkout.',
      transitionType: 'checkout',
      changedAt: '2026-05-14T05:00:00.000Z',
    },
  ],
  createdAt: '2026-05-14T05:00:00.000Z',
  updatedAt: '2026-05-14T05:00:00.000Z',
};

export const trackedOrderMock: OrderResponse = {
  ...checkoutOrderMock,
  status: 'awaiting_fulfillment',
  statusHistory: [
    ...checkoutOrderMock.statusHistory,
    {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      previousStatus: 'invoice_pending',
      nextStatus: 'awaiting_fulfillment',
      reason: 'Invoice verified by staff and released to fulfillment.',
      transitionType: 'status_update',
      changedAt: '2026-05-14T05:15:00.000Z',
    },
  ],
  updatedAt: '2026-05-14T05:15:00.000Z',
};

export const cancelledOrderMock: OrderResponse = {
  ...checkoutOrderMock,
  status: 'cancelled',
  statusHistory: [
    ...checkoutOrderMock.statusHistory,
    {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      previousStatus: 'invoice_pending',
      nextStatus: 'cancelled',
      reason: 'Customer requested cancellation before fulfillment started.',
      transitionType: 'cancel',
      changedAt: '2026-05-14T05:10:00.000Z',
    },
  ],
  updatedAt: '2026-05-14T05:10:00.000Z',
};
