import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

type InvoiceStatus = 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'other';

type InvoiceRecord = {
  id: string;
  orderId: string;
  customerUserId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currencyCode: 'PHP';
  totalCents: number;
  amountPaidCents: number;
  amountDueCents: number;
  productIds: string[];
  productCategoryIds: string[];
  issuedAt: Date;
  dueAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type InvoicePaymentEntryRecord = {
  id: string;
  invoiceId: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
  receivedAt: Date;
  createdAt: Date;
};

@Injectable()
export class InvoicePaymentsRepository {
  private readonly invoices = new Map<string, InvoiceRecord>();

  private readonly paymentEntries = new Map<string, InvoicePaymentEntryRecord>();

  private sequence = 1;

  async createInvoice(payload: {
    orderId: string;
    customerUserId: string;
    totalCents: number;
    productIds?: string[];
    productCategoryIds?: string[];
  }) {
    const issuedAt = new Date();
    const dueAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const invoice: InvoiceRecord = {
      id: randomUUID(),
      orderId: payload.orderId,
      customerUserId: payload.customerUserId,
      invoiceNumber: `INV-2026-${String(this.sequence).padStart(4, '0')}`,
      status: 'pending_payment',
      currencyCode: 'PHP',
      totalCents: payload.totalCents,
      amountPaidCents: 0,
      amountDueCents: payload.totalCents,
      productIds: [...(payload.productIds ?? [])],
      productCategoryIds: [...(payload.productCategoryIds ?? [])],
      issuedAt,
      dueAt,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    };

    this.sequence += 1;
    this.invoices.set(invoice.id, invoice);
    return {
      ...invoice,
      productIds: [...invoice.productIds],
      productCategoryIds: [...invoice.productCategoryIds],
    };
  }

  async findInvoiceById(invoiceId: string) {
    const invoice = this.invoices.get(invoiceId);
    return invoice
      ? {
          ...invoice,
          productIds: [...invoice.productIds],
          productCategoryIds: [...invoice.productCategoryIds],
        }
      : null;
  }

  async findInvoiceByOrderId(orderId: string) {
    const invoice = Array.from(this.invoices.values()).find((entry) => entry.orderId === orderId);
    return invoice
      ? {
          ...invoice,
          productIds: [...invoice.productIds],
          productCategoryIds: [...invoice.productCategoryIds],
        }
      : null;
  }

  async listPaymentEntriesByInvoiceId(invoiceId: string) {
    return Array.from(this.paymentEntries.values())
      .filter((entry) => entry.invoiceId === invoiceId)
      .sort((left, right) => left.receivedAt.getTime() - right.receivedAt.getTime())
      .map((entry) => ({ ...entry }));
  }

  async createPaymentEntry(
    invoiceId: string,
    payload: {
      amountCents: number;
      paymentMethod: PaymentMethod;
      reference?: string | null;
      notes?: string | null;
      receivedAt: Date;
    },
  ) {
    const entry: InvoicePaymentEntryRecord = {
      id: randomUUID(),
      invoiceId,
      amountCents: payload.amountCents,
      paymentMethod: payload.paymentMethod,
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
      receivedAt: payload.receivedAt,
      createdAt: new Date(),
    };

    this.paymentEntries.set(entry.id, entry);
    return { ...entry };
  }

  async updateInvoice(invoiceId: string, updater: (invoice: InvoiceRecord) => InvoiceRecord) {
    const existingInvoice = this.invoices.get(invoiceId);
    if (!existingInvoice) {
      return null;
    }

    const updatedInvoice = updater(existingInvoice);
    this.invoices.set(invoiceId, updatedInvoice);
    return { ...updatedInvoice };
  }
}
