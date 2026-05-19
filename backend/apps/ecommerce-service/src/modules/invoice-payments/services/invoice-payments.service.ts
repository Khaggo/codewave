import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';

import { CreateInvoicePaymentEntryDto } from '../dto/create-invoice-payment-entry.dto';
import { UpdateInvoiceStatusDto } from '../dto/update-invoice-status.dto';
import { InvoicePaymentsRepository } from '../repositories/invoice-payments.repository';
import { InvoicePaymentsPaymongoService } from './invoice-payments-paymongo.service';

type ActorContext = {
  userId: string;
  role: string;
};

@Injectable()
export class InvoicePaymentsService {
  constructor(
    private readonly invoicePaymentsRepository: InvoicePaymentsRepository,
    private readonly invoicePaymentsPaymongoService: InvoicePaymentsPaymongoService,
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

  async findInvoiceById(invoiceId: string, actor?: ActorContext) {
    const invoice = await this.invoicePaymentsRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (actor) {
      this.assertCustomerScope(invoice.customerUserId, actor);
    }

    return this.hydrateInvoice(invoice);
  }

  async findInvoiceByOrderId(orderId: string, actor?: ActorContext) {
    const invoice = await this.invoicePaymentsRepository.findInvoiceByOrderId(orderId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (actor) {
      this.assertCustomerScope(invoice.customerUserId, actor);
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

    await this.invoicePaymentsRepository.updateInvoice(invoiceId, (currentInvoice) => ({
      ...currentInvoice,
      paymentChannel: 'manual',
      updatedAt: new Date(),
    }));

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

  async createPaymongoCheckoutForOrder(
    orderId: string,
    actor: ActorContext,
    checkoutReturnUrls?: { successUrl?: string | null; cancelUrl?: string | null },
  ) {
    const invoice = await this.findInvoiceByOrderId(orderId, actor);
    this.assertInvoiceReadyForOnlinePayment(invoice);

    const checkoutSession = await this.invoicePaymentsPaymongoService.createCheckoutSession({
      orderId: invoice.orderId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountCents: invoice.amountDueCents,
      currencyCode: invoice.currencyCode,
      customerEmail: null,
      successUrl: checkoutReturnUrls?.successUrl ?? null,
      cancelUrl: checkoutReturnUrls?.cancelUrl ?? null,
    });

    await this.invoicePaymentsRepository.updateInvoice(invoice.id, (currentInvoice) => ({
      ...currentInvoice,
      paymentChannel: 'online_provider',
      onlinePaymentProvider: 'paymongo',
      onlinePaymentStatus: checkoutSession.status,
      onlinePaymentSessionId: checkoutSession.providerPaymentId,
      onlinePaymentCheckoutUrl: checkoutSession.checkoutUrl,
      onlinePaymentReference: checkoutSession.referenceNumber,
      onlinePaymentPaidAt: checkoutSession.paidAt,
      onlinePaymentFailureReason: checkoutSession.failureReason,
      updatedAt: new Date(),
    }));

    if (checkoutSession.status === 'paid') {
      return this.applyOnlinePayment(invoice.id, checkoutSession);
    }

    return this.findInvoiceById(invoice.id, actor);
  }

  async reconcilePaymongoCheckoutForOrder(orderId: string, actor: ActorContext) {
    const invoice = await this.findInvoiceByOrderId(orderId, actor);
    this.assertInvoiceReadyForOnlinePayment(invoice);

    if (!invoice.onlinePaymentSessionId) {
      throw new ConflictException('No PayMongo checkout session exists for this ecommerce invoice');
    }

    const checkoutSession = await this.invoicePaymentsPaymongoService.retrieveCheckoutSession(
      invoice.onlinePaymentSessionId,
    );

    if (checkoutSession.status === 'paid') {
      return this.applyOnlinePayment(invoice.id, checkoutSession);
    }

    await this.invoicePaymentsRepository.updateInvoice(invoice.id, (currentInvoice) => ({
      ...currentInvoice,
      paymentChannel: 'online_provider',
      onlinePaymentProvider: 'paymongo',
      onlinePaymentStatus: checkoutSession.status,
      onlinePaymentSessionId: checkoutSession.providerPaymentId ?? currentInvoice.onlinePaymentSessionId,
      onlinePaymentCheckoutUrl: checkoutSession.checkoutUrl ?? currentInvoice.onlinePaymentCheckoutUrl,
      onlinePaymentReference: checkoutSession.referenceNumber ?? currentInvoice.onlinePaymentReference,
      onlinePaymentPaidAt: checkoutSession.paidAt ?? currentInvoice.onlinePaymentPaidAt,
      onlinePaymentFailureReason: checkoutSession.failureReason,
      updatedAt: new Date(),
    }));

    return this.findInvoiceById(invoice.id, actor);
  }

  async handlePaymongoWebhook(rawPayload: Buffer | string, signatureHeader?: string | null) {
    const event = this.invoicePaymentsPaymongoService.parseWebhook(rawPayload, signatureHeader);
    if (
      event.eventType !== 'checkout_session.payment.paid' ||
      event.status !== 'paid' ||
      event.metadata.sourceType !== 'ecommerce_invoice'
    ) {
      return {
        received: true,
        ignored: true,
        eventType: event.eventType,
      };
    }

    const metadataInvoiceId =
      typeof event.metadata.invoiceId === 'string' ? event.metadata.invoiceId : null;
    const invoice =
      (metadataInvoiceId ? await this.invoicePaymentsRepository.findInvoiceById(metadataInvoiceId) : null) ??
      (event.providerPaymentId
        ? await this.invoicePaymentsRepository.findInvoiceByOnlinePaymentSessionId(event.providerPaymentId)
        : null);

    if (!invoice || invoice.status === 'paid') {
      return {
        received: true,
        ignored: true,
        eventType: event.eventType,
        invoiceId: metadataInvoiceId,
      };
    }

    await this.applyOnlinePayment(invoice.id, {
      ...event,
      provider: 'paymongo',
      checkoutUrl: invoice.onlinePaymentCheckoutUrl,
    });

    return {
      received: true,
      ignored: false,
      eventType: event.eventType,
      invoiceId: invoice.id,
      orderId: invoice.orderId,
    };
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
    paymentChannel: 'manual' | 'online_provider' | null;
    onlinePaymentProvider: string | null;
    onlinePaymentStatus: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'unavailable' | null;
    onlinePaymentSessionId: string | null;
    onlinePaymentCheckoutUrl: string | null;
    onlinePaymentReference: string | null;
    onlinePaymentPaidAt: Date | null;
    onlinePaymentFailureReason: string | null;
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

  private assertInvoiceReadyForOnlinePayment(invoice: Awaited<ReturnType<InvoicePaymentsService['findInvoiceById']>>) {
    if (invoice.status === 'cancelled') {
      throw new ConflictException('Cancelled ecommerce invoices cannot start online payment');
    }

    if (invoice.amountDueCents <= 0) {
      throw new ConflictException('This ecommerce invoice is already settled');
    }
  }

  private async applyOnlinePayment(
    invoiceId: string,
    payment: {
      provider: 'paymongo';
      providerPaymentId: string | null;
      checkoutUrl: string | null;
      referenceNumber: string | null;
      paidAt: Date | null;
      failureReason: string | null;
    },
  ) {
    const invoice = await this.invoicePaymentsRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.amountDueCents <= 0) {
      return this.findInvoiceById(invoiceId);
    }

    const paidAt = payment.paidAt ?? new Date();
    const paymentEntry = await this.invoicePaymentsRepository.createPaymentEntry(invoiceId, {
      amountCents: invoice.amountDueCents,
      paymentMethod: 'paymongo',
      reference: payment.referenceNumber ?? null,
      notes: 'Settled through PayMongo hosted checkout.',
      receivedAt: paidAt,
    });

    await this.invoicePaymentsRepository.updateInvoice(invoiceId, (currentInvoice) => ({
      ...currentInvoice,
      paymentChannel: 'online_provider',
      onlinePaymentProvider: payment.provider,
      onlinePaymentStatus: 'paid',
      onlinePaymentSessionId: payment.providerPaymentId ?? currentInvoice.onlinePaymentSessionId,
      onlinePaymentCheckoutUrl: payment.checkoutUrl ?? currentInvoice.onlinePaymentCheckoutUrl,
      onlinePaymentReference: payment.referenceNumber ?? currentInvoice.onlinePaymentReference,
      onlinePaymentPaidAt: paidAt,
      onlinePaymentFailureReason: payment.failureReason,
      updatedAt: new Date(),
    }));

    await this.recalculateInvoice(invoiceId);
    const hydratedInvoice = await this.findInvoiceById(invoiceId);
    this.eventBus.publish('invoice.payment_recorded', {
      invoiceId: hydratedInvoice.id,
      orderId: hydratedInvoice.orderId,
      customerUserId: hydratedInvoice.customerUserId,
      invoiceNumber: hydratedInvoice.invoiceNumber,
      paymentEntryId: paymentEntry.id,
      amountCents: paymentEntry.amountCents,
      paymentMethod: 'paymongo',
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

  private assertCustomerScope(customerUserId: string, actor: ActorContext) {
    if (actor.role === 'customer' && actor.userId !== customerUserId) {
      throw new ForbiddenException('Customers can only access their own ecommerce invoices.');
    }
  }
}
