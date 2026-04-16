import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { CartService } from '@ecommerce-modules/cart/services/cart.service';
import { InvoicePaymentsService } from '@ecommerce-modules/invoice-payments/services/invoice-payments.service';
import { OrdersRepository } from '@ecommerce-modules/orders/repositories/orders.repository';
import { OrdersService } from '@ecommerce-modules/orders/services/orders.service';

describe('OrdersService', () => {
  it('creates an invoice-backed order from the active cart and clears the cart afterwards', async () => {
    const cartService = {
      getCheckoutPreview: jest.fn().mockResolvedValue({
        cartId: 'cart-1',
        customerUserId: 'customer-1',
        checkoutMode: 'invoice',
        subtotalCents: 189900,
        totalQuantity: 1,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Premium Engine Oil 5W-30',
            productSlug: 'premium-engine-oil-5w30',
            productSku: 'ENG-OIL-5W30',
            quantity: 1,
            unitPriceCents: 189900,
            lineTotalCents: 189900,
          },
        ],
      }),
      clearActiveCart: jest.fn().mockResolvedValue(undefined),
    };
    const ordersRepository = {
      createOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-2026-0001',
        customerUserId: 'customer-1',
        checkoutMode: 'invoice',
        status: 'invoice_pending',
        subtotalCents: 189900,
        notes: null,
        invoiceId: null,
        items: [
          {
            id: 'order-item-1',
            productId: 'product-1',
            productName: 'Premium Engine Oil 5W-30',
            productSlug: 'premium-engine-oil-5w30',
            sku: 'ENG-OIL-5W30',
            description: null,
            quantity: 1,
            unitPriceCents: 189900,
            lineTotalCents: 189900,
          },
        ],
        addresses: [],
        statusHistory: [],
        createdAt: new Date('2026-05-14T05:00:00.000Z'),
        updatedAt: new Date('2026-05-14T05:00:00.000Z'),
      }),
      attachInvoice: jest.fn().mockResolvedValue(undefined),
      findOrderById: jest.fn().mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-2026-0001',
        customerUserId: 'customer-1',
        checkoutMode: 'invoice',
        status: 'invoice_pending',
        subtotalCents: 189900,
        notes: null,
        invoiceId: 'invoice-1',
        items: [
          {
            id: 'order-item-1',
            productId: 'product-1',
            productName: 'Premium Engine Oil 5W-30',
            productSlug: 'premium-engine-oil-5w30',
            sku: 'ENG-OIL-5W30',
            description: null,
            quantity: 1,
            unitPriceCents: 189900,
            lineTotalCents: 189900,
          },
        ],
        addresses: [],
        statusHistory: [],
        createdAt: new Date('2026-05-14T05:00:00.000Z'),
        updatedAt: new Date('2026-05-14T05:00:00.000Z'),
      }),
      listOrdersByCustomerUserId: jest.fn(),
    };
    const invoicePaymentsService = {
      createInvoiceForOrder: jest.fn().mockResolvedValue({
        id: 'invoice-1',
        invoiceNumber: 'INV-2026-0001',
        status: 'pending_payment',
        currencyCode: 'PHP',
        totalCents: 189900,
        amountDueCents: 189900,
        dueAt: new Date('2026-05-21T05:00:00.000Z'),
      }),
      findInvoiceById: jest.fn().mockResolvedValue({
        id: 'invoice-1',
        invoiceNumber: 'INV-2026-0001',
        status: 'pending_payment',
        totalCents: 189900,
        amountDueCents: 189900,
      }),
    };
    const eventBus = {
      publish: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: CartService, useValue: cartService },
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: InvoicePaymentsService, useValue: invoicePaymentsService },
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(OrdersService);

    const result = await service.checkoutInvoice({
      customerUserId: 'customer-1',
      billingAddress: {
        recipientName: 'Juan Dela Cruz',
        email: 'juan@example.com',
        addressLine1: '123 Service Street',
        city: 'Makati',
        province: 'Metro Manila',
      },
    });

    expect(ordersRepository.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerUserId: 'customer-1',
        subtotalCents: 189900,
      }),
    );
    expect(invoicePaymentsService.createInvoiceForOrder).toHaveBeenCalledWith({
      orderId: 'order-1',
      customerUserId: 'customer-1',
      totalCents: 189900,
    });
    expect(cartService.clearActiveCart).toHaveBeenCalledWith('customer-1');
    expect(eventBus.publish).toHaveBeenNthCalledWith(1, 'order.created', {
      orderId: 'order-1',
      orderNumber: 'ORD-2026-0001',
      customerUserId: 'customer-1',
      checkoutMode: 'invoice',
      status: 'invoice_pending',
      subtotalCents: 189900,
      itemCount: 1,
      invoiceId: 'invoice-1',
    });
    expect(eventBus.publish).toHaveBeenNthCalledWith(2, 'order.invoice_issued', {
      orderId: 'order-1',
      orderNumber: 'ORD-2026-0001',
      invoiceId: 'invoice-1',
      invoiceNumber: 'INV-2026-0001',
      customerUserId: 'customer-1',
      totalCents: 189900,
      amountDueCents: 189900,
      currencyCode: 'PHP',
      dueAt: '2026-05-21T05:00:00.000Z',
    });
    expect(result.invoice).toEqual({
      id: 'invoice-1',
      invoiceNumber: 'INV-2026-0001',
      status: 'pending_payment',
      totalCents: 189900,
      amountDueCents: 189900,
    });
  });

  it('updates order status and records the tracking history', async () => {
    const ordersRepository = {
      findOrderById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'order-1',
          status: 'invoice_pending',
          invoiceId: 'invoice-1',
        })
        .mockResolvedValueOnce({
          id: 'order-1',
          orderNumber: 'ORD-2026-0001',
          customerUserId: 'customer-1',
          checkoutMode: 'invoice',
          status: 'awaiting_fulfillment',
          subtotalCents: 189900,
          notes: null,
          invoiceId: 'invoice-1',
          items: [],
          addresses: [],
          statusHistory: [
            {
              id: 'history-1',
              previousStatus: null,
              nextStatus: 'invoice_pending',
              reason: 'Order created from invoice checkout.',
              transitionType: 'checkout',
              changedAt: new Date('2026-05-14T05:00:00.000Z'),
            },
            {
              id: 'history-2',
              previousStatus: 'invoice_pending',
              nextStatus: 'awaiting_fulfillment',
              reason: 'Invoice verified by staff and released to fulfillment.',
              transitionType: 'status_update',
              changedAt: new Date('2026-05-14T05:15:00.000Z'),
            },
          ],
          createdAt: new Date('2026-05-14T05:00:00.000Z'),
          updatedAt: new Date('2026-05-14T05:15:00.000Z'),
        }),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    const invoicePaymentsService = {
      findInvoiceById: jest.fn().mockResolvedValue({
        id: 'invoice-1',
        invoiceNumber: 'INV-2026-0001',
        status: 'pending_payment',
        totalCents: 189900,
        amountDueCents: 189900,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: CartService, useValue: {} },
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: InvoicePaymentsService, useValue: invoicePaymentsService },
        { provide: AutocareEventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(OrdersService);

    const result = await service.updateOrderStatus('order-1', {
      status: 'awaiting_fulfillment',
      reason: 'Invoice verified by staff and released to fulfillment.',
    });

    expect(ordersRepository.updateStatus).toHaveBeenCalledWith('order-1', {
      status: 'awaiting_fulfillment',
      reason: 'Invoice verified by staff and released to fulfillment.',
      transitionType: 'status_update',
    });
    expect(result.statusHistory).toHaveLength(2);
    expect(result.statusHistory[1]).toEqual(
      expect.objectContaining({
        nextStatus: 'awaiting_fulfillment',
      }),
    );
  });

  it('rejects invalid order transitions', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: CartService, useValue: {} },
        {
          provide: OrdersRepository,
          useValue: {
            findOrderById: jest.fn().mockResolvedValue({
              id: 'order-1',
              status: 'fulfilled',
            }),
          },
        },
        { provide: InvoicePaymentsService, useValue: {} },
        { provide: AutocareEventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(OrdersService);

    await expect(
      service.cancelOrder('order-1', {
        reason: 'Attempted late cancellation.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
