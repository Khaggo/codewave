import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';

import { CreateInvoicePaymentEntryDto } from '../dto/create-invoice-payment-entry.dto';
import { UpdateInvoiceStatusDto } from '../dto/update-invoice-status.dto';
import { InvoicePaymentsRepository } from '../repositories/invoice-payments.repository';

@Injectable()
export class InvoicePaymentsService {
  constructor(
    private readonly invoicePaymentsRepository: InvoicePaymentsRepository,
    private readonly eventBus: AutocareEventBusService,
  ) {}

  async createInvoiceForOrder(payload: {
    orderId: string;
    customerUserId: string;
    totalCents: number;
    productIds?: string[];
    productCategoryIds?: string[];
  }) {
    return this.invoicePaymentsRepository.createInvoice(payload);
  }

  async findInvoiceById(invoiceId: string) {
    const invoice = await this.invoicePaymentsRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.hydrateInvoice(invoice);
  }

  async findInvoiceByOrderId(orderId: string) {
    const invoice = await this.invoicePaymentsRepository.findInvoiceByOrderId(orderId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.hydrateInvoice(invoice);
  }

  async recordPaymentEntry(invoiceId: string, payload: CreateInvoicePaymentEntryDto) {
    const invoice = await this.invoicePaymentsRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'cancelled') {
      throw new ConflictException('Cancelled invoices cannot accept new payment entries');
    }

    if (payload.amountCents > invoice.amountDueCents) {
      throw new ConflictException('Payment entry exceeds the outstanding invoice balance');
    }

    const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
    const paymentEntry = await this.invoicePaymentsRepository.createPaymentEntry(invoiceId, {
      amountCents: payload.amountCents,
      paymentMethod: payload.paymentMethod,
      reference: payload.reference ?? null,
      notes: payload.notes ?? null,
      receivedAt,
    });

    await this.recalculateInvoice(invoiceId);
    const hydratedInvoice = await this.findInvoiceById(invoiceId);
    this.eventBus.publish('invoice.payment_recorded', {
      invoiceId: hydratedInvoice.id,
      orderId: hydratedInvoice.orderId,
      customerUserId: hydratedInvoice.customerUserId,
      invoiceNumber: hydratedInvoice.invoiceNumber,
      paymentEntryId: paymentEntry.id,
      amountCents: paymentEntry.amountCents,
      paymentMethod: paymentEntry.paymentMethod,
      receivedAt: paymentEntry.receivedAt.toISOString(),
      invoiceStatus: hydratedInvoice.status,
      amountPaidCents: hydratedInvoice.amountPaidCents,
      amountDueCents: hydratedInvoice.amountDueCents,
      currencyCode: hydratedInvoice.currencyCode,
      productIds: hydratedInvoice.productIds,
      productCategoryIds: hydratedInvoice.productCategoryIds,
    });
    return hydratedInvoice;
  }

  async updateInvoiceStatus(invoiceId: string, payload: UpdateInvoiceStatusDto) {
    const invoice = await this.invoicePaymentsRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentEntries = await this.invoicePaymentsRepository.listPaymentEntriesByInvoiceId(invoiceId);
    if (payload.status === 'cancelled') {
      if (paymentEntries.length > 0 || invoice.amountPaidCents > 0) {
        throw new ConflictException('Invoices with payment history cannot be cancelled');
      }
    } else if (payload.status === 'overdue') {
      if (invoice.amountDueCents <= 0) {
        throw new ConflictException('Settled invoices cannot be marked overdue');
      }

      if (invoice.dueAt.getTime() > Date.now()) {
        throw new ConflictException('Invoice is not yet overdue');
      }
    } else if (payload.status === 'pending_payment') {
      if (invoice.amountPaidCents > 0) {
        throw new ConflictException('Pending payment status is derived from an unpaid invoice only');
      }
    }

    await this.invoicePaymentsRepository.updateInvoice(invoiceId, (currentInvoice) => ({
      ...currentInvoice,
      status: payload.status,
      updatedAt: new Date(),
    }));

    return this.findInvoiceById(invoiceId);
  }

  private async recalculateInvoice(invoiceId: string) {
    const invoice = await this.invoicePaymentsRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentEntries = await this.invoicePaymentsRepository.listPaymentEntriesByInvoiceId(invoiceId);
    const amountPaidCents = paymentEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
    const amountDueCents = Math.max(invoice.totalCents - amountPaidCents, 0);
    const derivedStatus = this.deriveTrackedStatus({
      ...invoice,
      amountPaidCents,
      amountDueCents,
    });

    await this.invoicePaymentsRepository.updateInvoice(invoiceId, (currentInvoice) => ({
      ...currentInvoice,
      amountPaidCents,
      amountDueCents,
      status: currentInvoice.status === 'cancelled' ? 'cancelled' : derivedStatus,
      updatedAt: new Date(),
    }));
  }

  private async hydrateInvoice(invoice: {
    id: string;
    orderId: string;
    customerUserId: string;
    invoiceNumber: string;
    status: 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
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
  }) {
    const paymentEntries = await this.invoicePaymentsRepository.listPaymentEntriesByInvoiceId(invoice.id);
    const aging = this.getAging(invoice);

    return {
      ...invoice,
      agingBucket: aging.bucket,
      daysPastDue: aging.daysPastDue,
      productIds: [...invoice.productIds],
      productCategoryIds: [...invoice.productCategoryIds],
      paymentEntries,
    };
  }

  private deriveTrackedStatus(invoice: {
    amountPaidCents: number;
    amountDueCents: number;
    dueAt: Date;
  }) {
    if (invoice.amountDueCents <= 0) {
      return 'paid' as const;
    }

    if (invoice.amountPaidCents > 0) {
      return 'partially_paid' as const;
    }

    if (invoice.dueAt.getTime() < Date.now()) {
      return 'overdue' as const;
    }

    return 'pending_payment' as const;
  }

  private getAging(invoice: {
    status: 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
    dueAt: Date;
  }) {
    if (invoice.status === 'cancelled') {
      return {
        bucket: 'cancelled' as const,
        daysPastDue: 0,
      };
    }

    if (invoice.status === 'paid') {
      return {
        bucket: 'settled' as const,
        daysPastDue: 0,
      };
    }

    const millisecondsPastDue = Date.now() - invoice.dueAt.getTime();
    const daysPastDue = millisecondsPastDue > 0 ? Math.floor(millisecondsPastDue / (24 * 60 * 60 * 1000)) : 0;

    if (daysPastDue <= 0) {
      return {
        bucket: 'current' as const,
        daysPastDue: 0,
      };
    }

    if (daysPastDue <= 7) {
      return {
        bucket: 'overdue_1_7' as const,
        daysPastDue,
      };
    }

    if (daysPastDue <= 30) {
      return {
        bucket: 'overdue_8_30' as const,
        daysPastDue,
      };
    }

    return {
      bucket: 'overdue_31_plus' as const,
      daysPastDue,
    };
  }
}
