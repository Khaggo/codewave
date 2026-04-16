import type { RouteContract } from '../shared';

export type InvoiceStatus = 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type InvoicePaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'other';

export interface CreateInvoicePaymentEntryRequest {
  amountCents: number;
  paymentMethod: InvoicePaymentMethod;
  reference?: string;
  notes?: string;
  receivedAt?: string;
}

export interface UpdateInvoiceStatusRequest {
  status: 'pending_payment' | 'overdue' | 'cancelled';
  reason?: string;
}

export const invoicePaymentRoutes: Record<string, RouteContract> = {
  getInvoiceById: {
    method: 'GET',
    path: '/api/invoices/:id',
    status: 'live',
    source: 'swagger',
  },
  getOrderInvoice: {
    method: 'GET',
    path: '/api/orders/:id/invoice',
    status: 'live',
    source: 'swagger',
  },
  createInvoicePaymentEntry: {
    method: 'POST',
    path: '/api/invoices/:id/payments',
    status: 'live',
    source: 'swagger',
    notes: 'Manual invoice-entry tracking only; not a payment-gateway endpoint.',
  },
  updateInvoiceStatus: {
    method: 'PATCH',
    path: '/api/invoices/:id/status',
    status: 'live',
    source: 'swagger',
    notes: 'Manual status changes are limited to tracking-safe states.',
  },
};
