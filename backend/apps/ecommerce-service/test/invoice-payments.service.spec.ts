import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { InvoicePaymentsRepository } from '@ecommerce-modules/invoice-payments/repositories/invoice-payments.repository';
import { InvoicePaymentsService } from '@ecommerce-modules/invoice-payments/services/invoice-payments.service';

describe('InvoicePaymentsService', () => {
  it('records payment entries and derives partial then paid invoice states', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoicePaymentsService,
        InvoicePaymentsRepository,
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(InvoicePaymentsService);

    const invoice = await service.createInvoiceForOrder({
      orderId: '88888888-8888-4888-8888-888888888888',
      customerUserId: '55555555-5555-4555-8555-555555555555',
      totalCents: 90000,
    });

    const partialInvoice = await service.recordPaymentEntry(invoice.id, {
      amountCents: 30000,
      paymentMethod: 'cash',
      reference: 'RCPT-2026-0001',
    });

    expect(partialInvoice.status).toBe('partially_paid');
    expect(partialInvoice.amountPaidCents).toBe(30000);
    expect(partialInvoice.amountDueCents).toBe(60000);
    expect(partialInvoice.paymentEntries).toHaveLength(1);

    const paidInvoice = await service.recordPaymentEntry(invoice.id, {
      amountCents: 60000,
      paymentMethod: 'bank_transfer',
      reference: 'BNK-2026-0002',
    });

    expect(paidInvoice.status).toBe('paid');
    expect(paidInvoice.amountPaidCents).toBe(90000);
    expect(paidInvoice.amountDueCents).toBe(0);
    expect(paidInvoice.agingBucket).toBe('settled');
    expect(paidInvoice.paymentEntries).toHaveLength(2);
    expect(eventBus.publish).toHaveBeenNthCalledWith(1, 'invoice.payment_recorded', {
      invoiceId: invoice.id,
      orderId: '88888888-8888-4888-8888-888888888888',
      customerUserId: '55555555-5555-4555-8555-555555555555',
      invoiceNumber: invoice.invoiceNumber,
      paymentEntryId: expect.any(String),
      amountCents: 30000,
      paymentMethod: 'cash',
      receivedAt: expect.any(String),
      invoiceStatus: 'partially_paid',
      amountPaidCents: 30000,
      amountDueCents: 60000,
      currencyCode: 'PHP',
    });
    expect(eventBus.publish).toHaveBeenNthCalledWith(2, 'invoice.payment_recorded', {
      invoiceId: invoice.id,
      orderId: '88888888-8888-4888-8888-888888888888',
      customerUserId: '55555555-5555-4555-8555-555555555555',
      invoiceNumber: invoice.invoiceNumber,
      paymentEntryId: expect.any(String),
      amountCents: 60000,
      paymentMethod: 'bank_transfer',
      receivedAt: expect.any(String),
      invoiceStatus: 'paid',
      amountPaidCents: 90000,
      amountDueCents: 0,
      currencyCode: 'PHP',
    });
  });

  it('rejects cancelling an invoice that already has payment history', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        InvoicePaymentsService,
        InvoicePaymentsRepository,
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(InvoicePaymentsService);

    const invoice = await service.createInvoiceForOrder({
      orderId: '99999999-9999-4999-8999-999999999999',
      customerUserId: '56565656-5656-4565-8565-565656565656',
      totalCents: 50000,
    });

    await service.recordPaymentEntry(invoice.id, {
      amountCents: 10000,
      paymentMethod: 'cash',
    });

    await expect(
      service.updateInvoiceStatus(invoice.id, {
        status: 'cancelled',
        reason: 'Attempted void after collecting payment.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
