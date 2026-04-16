import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { CartModule } from '@ecommerce-modules/cart/cart.module';
import { CatalogModule } from '@ecommerce-modules/catalog/catalog.module';
import { InvoicePaymentsModule } from '@ecommerce-modules/invoice-payments/invoice-payments.module';
import { OrdersModule } from '@ecommerce-modules/orders/orders.module';

import { HealthController } from '../src/health.controller';
import { setupSwagger } from '../src/swagger';

describe('EcommerceService bootstrap integration', () => {
  let app: INestApplication;
  let eventBus: AutocareEventBusService;
  const bootstrapCategoryId = '11111111-1111-4111-8111-111111111111';
  const emptyCartCustomerUserId = '55555555-5555-4555-8555-555555555555';
  const cartFlowCustomerUserId = '56565656-5656-4565-8565-565656565656';
  const checkoutCustomerUserId = '57575757-5757-4575-8575-575757575757';
  const trackingCustomerUserId = '58585858-5858-4585-8585-585858585858';
  const cancelledOrderCustomerUserId = '59595959-5959-4595-8595-595959595959';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatalogModule, CartModule, InvoicePaymentsModule, OrdersModule],
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    setupSwagger(app);

    await app.init();
    eventBus = app.get(AutocareEventBusService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes health, catalog, and empty-cart routes', async () => {
    const [healthResponse, productsResponse, categoriesResponse, cartResponse] = await Promise.all([
      request(app.getHttpServer()).get('/api/health'),
      request(app.getHttpServer()).get('/api/products'),
      request(app.getHttpServer()).get('/api/product-categories'),
      request(app.getHttpServer()).get('/api/cart').query({ customerUserId: emptyCartCustomerUserId }),
    ]);

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toEqual({
      service: 'ecommerce-service',
      status: 'ok',
    });

    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sku: 'ENG-OIL-5W30',
        }),
      ]),
    );

    expect(categoriesResponse.status).toBe(200);
    expect(categoriesResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'engine-parts',
        }),
      ]),
    );

    expect(cartResponse.status).toBe(200);
    expect(cartResponse.body).toEqual(
      expect.objectContaining({
        customerUserId: emptyCartCustomerUserId,
        items: [],
        subtotalCents: 0,
      }),
    );
  });

  it('publishes a swagger document for the ecommerce bootstrap surface', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json');

    expect(response.status).toBe(200);
    expect(response.body.info).toEqual(
      expect.objectContaining({
        title: 'AUTOCARE E-Commerce Service API',
      }),
    );
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/api/health',
        '/api/products',
        '/api/products/{id}',
        '/api/product-categories',
        '/api/product-categories/{id}',
        '/api/cart',
        '/api/cart/items',
        '/api/cart/items/{itemId}',
        '/api/cart/checkout-preview',
        '/api/checkout/invoice',
        '/api/orders/{id}',
        '/api/orders/{id}/status',
        '/api/orders/{id}/cancel',
        '/api/orders/{id}/invoice',
        '/api/users/{id}/orders',
        '/api/invoices/{id}',
        '/api/invoices/{id}/payments',
        '/api/invoices/{id}/status',
      ]),
    );
  });

  it('creates and updates categories and products through the live catalog routes', async () => {
    const createCategoryResponse = await request(app.getHttpServer()).post('/api/product-categories').send({
      name: 'Filters',
      slug: 'filters',
      description: 'Filters and related consumables.',
    });

    expect(createCategoryResponse.status).toBe(201);
    expect(createCategoryResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Filters',
        slug: 'filters',
        isActive: true,
      }),
    );

    const categoryId = createCategoryResponse.body.id as string;

    const updateCategoryResponse = await request(app.getHttpServer())
      .patch(`/api/product-categories/${categoryId}`)
      .send({
        description: 'Updated filter category for the first live catalog pass.',
        isActive: false,
      });

    expect(updateCategoryResponse.status).toBe(200);
    expect(updateCategoryResponse.body).toEqual(
      expect.objectContaining({
        id: categoryId,
        slug: 'filters',
        isActive: false,
      }),
    );

    const createProductResponse = await request(app.getHttpServer()).post('/api/products').send({
      categoryId: bootstrapCategoryId,
      name: 'Cabin Filter',
      slug: 'cabin-filter',
      sku: 'CABIN-FILTER-01',
      description: 'Fresh-air cabin filter.',
      priceCents: 64900,
    });

    expect(createProductResponse.status).toBe(201);
    expect(createProductResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Cabin Filter',
        slug: 'cabin-filter',
        sku: 'CABIN-FILTER-01',
        category: expect.objectContaining({
          id: bootstrapCategoryId,
          slug: 'engine-parts',
        }),
      }),
    );

    const productId = createProductResponse.body.id as string;

    const updateProductResponse = await request(app.getHttpServer()).patch(`/api/products/${productId}`).send({
      priceCents: 69900,
      isActive: false,
    });

    expect(updateProductResponse.status).toBe(200);
    expect(updateProductResponse.body).toEqual(
      expect.objectContaining({
        id: productId,
        priceCents: 69900,
        isActive: false,
      }),
    );
  });

  it('rejects invalid or conflicting catalog writes', async () => {
    const [invalidCategoryResponse, duplicateProductResponse] = await Promise.all([
      request(app.getHttpServer()).post('/api/product-categories').send({
        name: 'Invalid Category',
        slug: 'Invalid Category',
      }),
      request(app.getHttpServer()).post('/api/products').send({
        categoryId: bootstrapCategoryId,
        name: 'Engine Oil Duplicate SKU',
        slug: 'engine-oil-duplicate-sku',
        sku: 'ENG-OIL-5W30',
        priceCents: 100000,
      }),
    ]);

    expect(invalidCategoryResponse.status).toBe(400);
    expect(duplicateProductResponse.status).toBe(409);
    expect(duplicateProductResponse.body.message).toBe('Product SKU already exists');
  });

  it('manages cart items and produces an invoice checkout preview', async () => {
    const createProductResponse = await request(app.getHttpServer()).post('/api/products').send({
      categoryId: bootstrapCategoryId,
      name: 'Brake Cleaner',
      slug: 'brake-cleaner',
      sku: 'BRAKE-CLEANER-01',
      description: 'Brake cleaner for ecommerce cart testing.',
      priceCents: 39900,
    });

    expect(createProductResponse.status).toBe(201);
    const productId = createProductResponse.body.id as string;

    const addFirstResponse = await request(app.getHttpServer()).post('/api/cart/items').send({
      customerUserId: cartFlowCustomerUserId,
      productId,
      quantity: 1,
    });

    expect(addFirstResponse.status).toBe(200);
    expect(addFirstResponse.body.items).toHaveLength(1);

    const addSecondResponse = await request(app.getHttpServer()).post('/api/cart/items').send({
      customerUserId: cartFlowCustomerUserId,
      productId,
      quantity: 2,
    });

    expect(addSecondResponse.status).toBe(200);
    expect(addSecondResponse.body.items[0]).toEqual(
      expect.objectContaining({
        productId,
        quantity: 3,
        lineTotalCents: 119700,
      }),
    );

    const itemId = addSecondResponse.body.items[0].id as string;

    const updateItemResponse = await request(app.getHttpServer()).patch(`/api/cart/items/${itemId}`).send({
      customerUserId: cartFlowCustomerUserId,
      quantity: 4,
    });

    expect(updateItemResponse.status).toBe(200);
    expect(updateItemResponse.body.items[0]).toEqual(
      expect.objectContaining({
        quantity: 4,
        lineTotalCents: 159600,
      }),
    );

    const previewResponse = await request(app.getHttpServer()).post('/api/cart/checkout-preview').send({
      customerUserId: cartFlowCustomerUserId,
    });

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body).toEqual(
      expect.objectContaining({
        customerUserId: cartFlowCustomerUserId,
        checkoutMode: 'invoice',
        subtotalCents: 159600,
        totalQuantity: 4,
      }),
    );

    const removeResponse = await request(app.getHttpServer())
      .delete(`/api/cart/items/${itemId}`)
      .query({ customerUserId: cartFlowCustomerUserId });

    expect(removeResponse.status).toBe(200);
    expect(removeResponse.body.items).toEqual([]);
    expect(removeResponse.body.subtotalCents).toBe(0);
  });

  it('creates an invoice-backed order and preserves item snapshots after catalog changes', async () => {
    eventBus.clearPublishedEvents();
    const createProductResponse = await request(app.getHttpServer()).post('/api/products').send({
      categoryId: bootstrapCategoryId,
      name: 'Cabin Air Freshener',
      slug: 'cabin-air-freshener',
      sku: 'CABIN-FRESHENER-01',
      description: 'Interior product for invoice checkout testing.',
      priceCents: 49900,
    });

    expect(createProductResponse.status).toBe(201);
    const productId = createProductResponse.body.id as string;

    await request(app.getHttpServer()).post('/api/cart/items').send({
      customerUserId: checkoutCustomerUserId,
      productId,
      quantity: 2,
    });

    const checkoutResponse = await request(app.getHttpServer()).post('/api/checkout/invoice').send({
      customerUserId: checkoutCustomerUserId,
      billingAddress: {
        recipientName: 'Juan Dela Cruz',
        email: 'juan@example.com',
        contactPhone: '+63 912 345 6789',
        addressLine1: '123 Service Street',
        addressLine2: 'Unit 3B',
        city: 'Makati',
        province: 'Metro Manila',
        postalCode: '1200',
      },
      notes: 'Prepare for invoice pickup.',
    });

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body).toEqual(
      expect.objectContaining({
        customerUserId: checkoutCustomerUserId,
        subtotalCents: 99800,
        invoice: expect.objectContaining({
          status: 'pending_payment',
          totalCents: 99800,
        }),
      }),
    );

    const orderId = checkoutResponse.body.id as string;
    const invoiceId = checkoutResponse.body.invoice.id as string;

    const [orderResponse, orderHistoryResponse, invoiceResponse, orderInvoiceResponse] = await Promise.all([
      request(app.getHttpServer()).get(`/api/orders/${orderId}`),
      request(app.getHttpServer()).get(`/api/users/${checkoutCustomerUserId}/orders`),
      request(app.getHttpServer()).get(`/api/invoices/${invoiceId}`),
      request(app.getHttpServer()).get(`/api/orders/${orderId}/invoice`),
    ]);

    expect(orderResponse.status).toBe(200);
    expect(orderHistoryResponse.status).toBe(200);
    expect(invoiceResponse.status).toBe(200);
    expect(orderInvoiceResponse.status).toBe(200);
    expect(orderHistoryResponse.body).toHaveLength(1);
    expect(orderResponse.body.items[0]).toEqual(
      expect.objectContaining({
        productId,
        productName: 'Cabin Air Freshener',
        unitPriceCents: 49900,
        quantity: 2,
        lineTotalCents: 99800,
      }),
    );

    const updateProductResponse = await request(app.getHttpServer()).patch(`/api/products/${productId}`).send({
      name: 'Cabin Air Freshener XL',
      priceCents: 59900,
    });

    expect(updateProductResponse.status).toBe(200);

    const [orderAfterCatalogChangeResponse, cartAfterCheckoutResponse] = await Promise.all([
      request(app.getHttpServer()).get(`/api/orders/${orderId}`),
      request(app.getHttpServer()).get('/api/cart').query({ customerUserId: checkoutCustomerUserId }),
    ]);

    expect(orderAfterCatalogChangeResponse.status).toBe(200);
    expect(orderAfterCatalogChangeResponse.body.items[0]).toEqual(
      expect.objectContaining({
        productName: 'Cabin Air Freshener',
        unitPriceCents: 49900,
        lineTotalCents: 99800,
      }),
    );
    expect(cartAfterCheckoutResponse.status).toBe(200);
    expect(cartAfterCheckoutResponse.body.items).toEqual([]);
    expect(eventBus.listPublishedEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'order.created',
          producer: 'ecommerce-service',
          sourceDomain: 'ecommerce.orders',
          payload: expect.objectContaining({
            orderId,
            customerUserId: checkoutCustomerUserId,
            invoiceId,
          }),
        }),
        expect.objectContaining({
          name: 'order.invoice_issued',
          producer: 'ecommerce-service',
          sourceDomain: 'ecommerce.orders',
          payload: expect.objectContaining({
            orderId,
            invoiceId,
            customerUserId: checkoutCustomerUserId,
          }),
        }),
      ]),
    );
  });

  it('tracks order status changes and filters purchase history by order and invoice status', async () => {
    const createProductResponse = await request(app.getHttpServer()).post('/api/products').send({
      categoryId: bootstrapCategoryId,
      name: 'Wheel Cleaner',
      slug: 'wheel-cleaner',
      sku: 'WHEEL-CLEANER-01',
      description: 'Product used for order tracking integration coverage.',
      priceCents: 55900,
    });

    expect(createProductResponse.status).toBe(201);
    const productId = createProductResponse.body.id as string;

    await request(app.getHttpServer()).post('/api/cart/items').send({
      customerUserId: trackingCustomerUserId,
      productId,
      quantity: 1,
    });

    const checkoutResponse = await request(app.getHttpServer()).post('/api/checkout/invoice').send({
      customerUserId: trackingCustomerUserId,
      billingAddress: {
        recipientName: 'Ana Santos',
        email: 'ana@example.com',
        addressLine1: '456 Order Street',
        city: 'Pasig',
        province: 'Metro Manila',
      },
    });

    expect(checkoutResponse.status).toBe(201);
    const orderId = checkoutResponse.body.id as string;

    const statusUpdateResponse = await request(app.getHttpServer()).patch(`/api/orders/${orderId}/status`).send({
      status: 'awaiting_fulfillment',
      reason: 'Invoice checked and order released to fulfillment.',
    });

    expect(statusUpdateResponse.status).toBe(200);
    expect(statusUpdateResponse.body).toEqual(
      expect.objectContaining({
        id: orderId,
        status: 'awaiting_fulfillment',
      }),
    );
    expect(statusUpdateResponse.body.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nextStatus: 'invoice_pending',
          transitionType: 'checkout',
        }),
        expect.objectContaining({
          nextStatus: 'awaiting_fulfillment',
          transitionType: 'status_update',
        }),
      ]),
    );

    const [statusFilteredResponse, invoiceFilteredResponse] = await Promise.all([
      request(app.getHttpServer()).get(`/api/users/${trackingCustomerUserId}/orders`).query({
        status: 'awaiting_fulfillment',
      }),
      request(app.getHttpServer()).get(`/api/users/${trackingCustomerUserId}/orders`).query({
        invoiceStatus: 'pending_payment',
      }),
    ]);

    expect(statusFilteredResponse.status).toBe(200);
    expect(statusFilteredResponse.body).toHaveLength(1);
    expect(statusFilteredResponse.body[0]).toEqual(
      expect.objectContaining({
        id: orderId,
        status: 'awaiting_fulfillment',
      }),
    );

    expect(invoiceFilteredResponse.status).toBe(200);
    expect(invoiceFilteredResponse.body).toHaveLength(1);
    expect(invoiceFilteredResponse.body[0].invoice).toEqual(
      expect.objectContaining({
        status: 'pending_payment',
      }),
    );
  });

  it('cancels an order while preserving its purchase history snapshots', async () => {
    const createProductResponse = await request(app.getHttpServer()).post('/api/products').send({
      categoryId: bootstrapCategoryId,
      name: 'Dashboard Polish',
      slug: 'dashboard-polish',
      sku: 'DASHBOARD-POLISH-01',
      description: 'Product used for cancellation integration coverage.',
      priceCents: 45900,
    });

    expect(createProductResponse.status).toBe(201);
    const productId = createProductResponse.body.id as string;

    await request(app.getHttpServer()).post('/api/cart/items').send({
      customerUserId: cancelledOrderCustomerUserId,
      productId,
      quantity: 1,
    });

    const checkoutResponse = await request(app.getHttpServer()).post('/api/checkout/invoice').send({
      customerUserId: cancelledOrderCustomerUserId,
      billingAddress: {
        recipientName: 'Marco Reyes',
        email: 'marco@example.com',
        addressLine1: '789 Cancel Street',
        city: 'Taguig',
        province: 'Metro Manila',
      },
    });

    expect(checkoutResponse.status).toBe(201);
    const orderId = checkoutResponse.body.id as string;

    const cancelResponse = await request(app.getHttpServer()).post(`/api/orders/${orderId}/cancel`).send({
      reason: 'Customer requested cancellation before dispatch.',
    });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body).toEqual(
      expect.objectContaining({
        id: orderId,
        status: 'cancelled',
      }),
    );
    expect(cancelResponse.body.items[0]).toEqual(
      expect.objectContaining({
        productId,
        productName: 'Dashboard Polish',
        unitPriceCents: 45900,
      }),
    );
    expect(cancelResponse.body.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nextStatus: 'cancelled',
          transitionType: 'cancel',
        }),
      ]),
    );
  });

  it('tracks invoice payment entries, aging, and allowed manual invoice statuses without gateway assumptions', async () => {
    eventBus.clearPublishedEvents();
    const invoiceTrackingCustomerUserId = '60606060-6060-4060-8060-606060606060';
    const cancelledInvoiceCustomerUserId = '61616161-6161-4161-8161-616161616161';

    const createProductResponse = await request(app.getHttpServer()).post('/api/products').send({
      categoryId: bootstrapCategoryId,
      name: 'Glass Cleaner',
      slug: 'glass-cleaner',
      sku: 'GLASS-CLEANER-01',
      description: 'Product used for invoice payment tracking coverage.',
      priceCents: 79900,
    });

    expect(createProductResponse.status).toBe(201);
    const productId = createProductResponse.body.id as string;

    await request(app.getHttpServer()).post('/api/cart/items').send({
      customerUserId: invoiceTrackingCustomerUserId,
      productId,
      quantity: 1,
    });

    const checkoutResponse = await request(app.getHttpServer()).post('/api/checkout/invoice').send({
      customerUserId: invoiceTrackingCustomerUserId,
      billingAddress: {
        recipientName: 'Liza Cruz',
        email: 'liza@example.com',
        addressLine1: '101 Invoice Street',
        city: 'Quezon City',
        province: 'Metro Manila',
      },
    });

    expect(checkoutResponse.status).toBe(201);
    const invoiceId = checkoutResponse.body.invoice.id as string;

    const initialInvoiceResponse = await request(app.getHttpServer()).get(`/api/invoices/${invoiceId}`);

    expect(initialInvoiceResponse.status).toBe(200);
    expect(initialInvoiceResponse.body).toEqual(
      expect.objectContaining({
        id: invoiceId,
        status: 'pending_payment',
        amountPaidCents: 0,
        amountDueCents: 79900,
        agingBucket: 'current',
        paymentEntries: [],
      }),
    );

    const partialPaymentResponse = await request(app.getHttpServer()).post(`/api/invoices/${invoiceId}/payments`).send({
      amountCents: 30000,
      paymentMethod: 'cash',
      reference: 'RCPT-2026-0003',
      notes: 'Collected at the counter.',
    });

    expect(partialPaymentResponse.status).toBe(201);
    expect(partialPaymentResponse.body).toEqual(
      expect.objectContaining({
        status: 'partially_paid',
        amountPaidCents: 30000,
        amountDueCents: 49900,
        paymentEntries: expect.arrayContaining([
          expect.objectContaining({
            amountCents: 30000,
            paymentMethod: 'cash',
            reference: 'RCPT-2026-0003',
          }),
        ]),
      }),
    );

    const paidInvoiceResponse = await request(app.getHttpServer()).post(`/api/invoices/${invoiceId}/payments`).send({
      amountCents: 49900,
      paymentMethod: 'bank_transfer',
      reference: 'BNK-2026-0004',
    });

    expect(paidInvoiceResponse.status).toBe(201);
    expect(paidInvoiceResponse.body).toEqual(
      expect.objectContaining({
        status: 'paid',
        amountPaidCents: 79900,
        amountDueCents: 0,
        agingBucket: 'settled',
      }),
    );
    expect(paidInvoiceResponse.body.paymentEntries).toHaveLength(2);

    const orderInvoiceResponse = await request(app.getHttpServer()).get(
      `/api/orders/${checkoutResponse.body.id}/invoice`,
    );
    expect(orderInvoiceResponse.status).toBe(200);
    expect(orderInvoiceResponse.body.status).toBe('paid');

    const invalidCancelResponse = await request(app.getHttpServer()).patch(`/api/invoices/${invoiceId}/status`).send({
      status: 'cancelled',
      reason: 'Attempted invalid void after payment history existed.',
    });
    expect(invalidCancelResponse.status).toBe(409);

    await request(app.getHttpServer()).post('/api/cart/items').send({
      customerUserId: cancelledInvoiceCustomerUserId,
      productId,
      quantity: 1,
    });

    const cancelledCheckoutResponse = await request(app.getHttpServer()).post('/api/checkout/invoice').send({
      customerUserId: cancelledInvoiceCustomerUserId,
      billingAddress: {
        recipientName: 'Nina Reyes',
        email: 'nina@example.com',
        addressLine1: '202 Cancel Street',
        city: 'Mandaluyong',
        province: 'Metro Manila',
      },
    });

    expect(cancelledCheckoutResponse.status).toBe(201);
    const cancellableInvoiceId = cancelledCheckoutResponse.body.invoice.id as string;

    const cancelInvoiceResponse = await request(app.getHttpServer())
      .patch(`/api/invoices/${cancellableInvoiceId}/status`)
      .send({
        status: 'cancelled',
        reason: 'Order voided before any payment was recorded.',
      });

    expect(cancelInvoiceResponse.status).toBe(200);
    expect(cancelInvoiceResponse.body).toEqual(
      expect.objectContaining({
        id: cancellableInvoiceId,
        status: 'cancelled',
        agingBucket: 'cancelled',
        paymentEntries: [],
      }),
    );
    expect(eventBus.listPublishedEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'invoice.payment_recorded',
          producer: 'ecommerce-service',
          sourceDomain: 'ecommerce.invoice-payments',
          payload: expect.objectContaining({
            invoiceId,
            customerUserId: invoiceTrackingCustomerUserId,
            invoiceStatus: 'partially_paid',
          }),
        }),
        expect.objectContaining({
          name: 'invoice.payment_recorded',
          producer: 'ecommerce-service',
          sourceDomain: 'ecommerce.invoice-payments',
          payload: expect.objectContaining({
            invoiceId,
            customerUserId: invoiceTrackingCustomerUserId,
            invoiceStatus: 'paid',
          }),
        }),
      ]),
    );
  });
});
