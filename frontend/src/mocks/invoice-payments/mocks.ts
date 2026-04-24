import type { InvoiceResponse } from '../../lib/api/generated/invoice-payments/responses';

export const invoiceMock: InvoiceResponse = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  orderId: '88888888-8888-4888-8888-888888888888',
  customerUserId: '55555555-5555-4555-8555-555555555555',
  invoiceNumber: 'INV-2026-0001',
  status: 'pending_payment',
  currencyCode: 'PHP',
  totalCents: 99800,
  amountPaidCents: 0,
  amountDueCents: 99800,
  agingBucket: 'current',
  daysPastDue: 0,
  paymentEntries: [],
  issuedAt: '2026-05-14T05:00:00.000Z',
  dueAt: '2026-05-21T05:00:00.000Z',
  createdAt: '2026-05-14T05:00:00.000Z',
  updatedAt: '2026-05-14T05:00:00.000Z',
};

export const partiallyPaidInvoiceMock: InvoiceResponse = {
  ...invoiceMock,
  status: 'partially_paid',
  amountPaidCents: 30000,
  amountDueCents: 69800,
  paymentEntries: [
    {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      invoiceId: invoiceMock.id,
      amountCents: 30000,
      paymentMethod: 'cash',
      reference: 'RCPT-2026-0001',
      notes: 'Collected at the counter.',
      receivedAt: '2026-05-15T09:30:00.000Z',
      createdAt: '2026-05-15T09:30:00.000Z',
    },
  ],
  updatedAt: '2026-05-15T09:30:00.000Z',
};

export const paidInvoiceMock: InvoiceResponse = {
  ...partiallyPaidInvoiceMock,
  status: 'paid',
  amountPaidCents: 99800,
  amountDueCents: 0,
  agingBucket: 'settled',
  paymentEntries: [
    ...partiallyPaidInvoiceMock.paymentEntries,
    {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      invoiceId: invoiceMock.id,
      amountCents: 69800,
      paymentMethod: 'bank_transfer',
      reference: 'BNK-2026-0002',
      notes: null,
      receivedAt: '2026-05-16T10:00:00.000Z',
      createdAt: '2026-05-16T10:00:00.000Z',
    },
  ],
  updatedAt: '2026-05-16T10:00:00.000Z',
};

export const overdueInvoiceMock: InvoiceResponse = {
  ...partiallyPaidInvoiceMock,
  status: 'overdue',
  amountPaidCents: 30000,
  amountDueCents: 69800,
  agingBucket: 'overdue_8_30',
  daysPastDue: 12,
  dueAt: '2026-05-09T05:00:00.000Z',
  updatedAt: '2026-05-21T08:15:00.000Z',
};

export const cancelledInvoiceMock: InvoiceResponse = {
  ...invoiceMock,
  status: 'cancelled',
  amountPaidCents: 0,
  amountDueCents: 0,
  agingBucket: 'cancelled',
  paymentEntries: [],
  updatedAt: '2026-05-18T11:45:00.000Z',
};
