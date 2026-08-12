import { BadRequestException, ConflictException } from '@nestjs/common';

import { AccessoryPaymentMethodDtoValue } from '../dto/accessories.dto';
import { AccessoriesService } from './accessories.service';

describe('AccessoriesService customer cancellation', () => {
  const actor = { userId: 'customer-1', role: 'customer' as const };

  const order = {
    id: 'order-1',
    userId: actor.userId,
    orderReference: 'AS-20260803-0001',
    status: 'reserved',
    paymentMethod: 'pay_at_shop',
    paymentStatus: 'unpaid',
    currencyCode: 'PHP',
    subtotalCents: 150000,
    totalCents: 150000,
    contactSnapshot: { name: 'Customer', phone: '09000000000' },
    vehicleSnapshot: null,
    pickupCodeHash: 'must-not-leak',
    assignedToUserId: 'staff-1',
    reservationExpiresAt: new Date('2026-08-04T00:00:00.000Z'),
    preparedAt: null,
    readyAt: null,
    collectedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-08-03T00:00:00.000Z'),
    updatedAt: new Date('2026-08-03T00:00:00.000Z'),
    version: 1,
  };

  const createSubject = (overrides: Record<string, jest.Mock> = {}) => {
    const feature = {
      requireOrdering: jest.fn(),
    };
    const repository = {
      findOrder: jest.fn().mockResolvedValue(order),
      claimIdempotency: jest.fn().mockResolvedValue({
        claimed: true,
        record: { id: 'idempotency-1', responseSnapshot: null },
      }),
      cancelOrder: jest.fn().mockResolvedValue({
        ...order,
        status: 'cancelled',
        cancelledAt: new Date('2026-08-03T01:00:00.000Z'),
        version: 2,
      }),
      completeIdempotency: jest.fn().mockResolvedValue(undefined),
      takeOrder: jest.fn().mockResolvedValue({
        ...order,
        assignedToUserId: 'staff-2',
        version: 2,
      }),
      findAssignableStaff: jest.fn().mockResolvedValue({
        id: 'staff-2',
        role: 'service_adviser',
      }),
      reassignOrder: jest.fn().mockResolvedValue({
        ...order,
        assignedToUserId: 'staff-2',
        version: 2,
      }),
      ...overrides,
    };
    return {
      repository,
      feature,
      service: new AccessoriesService(feature as never, repository as never, {} as never),
    };
  };

  it('requires a retry key and does not mutate without one', async () => {
    const { service, repository } = createSubject();

    await expect(service.cancelOrder(order.id, { reason: 'Changed plans' }, undefined, actor))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.cancelOrder).not.toHaveBeenCalled();
  });

  it('records the request and returns only a customer-safe order snapshot', async () => {
    const { service, repository } = createSubject();

    const result = await service.cancelOrder(
      order.id,
      { reason: 'Changed plans' },
      'cancel-order-1',
      actor,
    );

    expect(repository.claimIdempotency).toHaveBeenCalledWith({
      actorUserId: actor.userId,
      scope: 'customer_order_cancellation',
      key: 'cancel-order-1',
      payload: { orderId: order.id, reason: 'Changed plans' },
    });
    expect(result).not.toHaveProperty('pickupCodeHash');
    expect(result).not.toHaveProperty('assignedToUserId');
    expect(result).toMatchObject({ id: order.id, status: 'cancelled', version: 2 });
    expect(repository.completeIdempotency).toHaveBeenCalledWith(
      'idempotency-1',
      result,
      { type: 'accessory_order', id: order.id },
    );
  });

  it('returns the completed response for a retry without cancelling twice', async () => {
    const responseSnapshot = { id: order.id, status: 'cancelled', version: 2 };
    const { service, repository } = createSubject({
      claimIdempotency: jest.fn().mockResolvedValue({
        claimed: false,
        record: { id: 'idempotency-1', responseSnapshot },
      }),
    });

    await expect(
      service.cancelOrder(order.id, { reason: 'Changed plans' }, 'cancel-order-1', actor),
    ).resolves.toEqual(responseSnapshot);
    expect(repository.cancelOrder).not.toHaveBeenCalled();
  });

  it('rejects prepared work before claiming an idempotency record', async () => {
    const { service, repository } = createSubject({
      findOrder: jest.fn().mockResolvedValue({ ...order, status: 'preparing' }),
    });

    await expect(
      service.cancelOrder(order.id, { reason: 'Changed plans' }, 'cancel-order-1', actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.claimIdempotency).not.toHaveBeenCalled();
    expect(repository.cancelOrder).not.toHaveBeenCalled();
  });

  it('blocks checkout for a known-incompatible selected vehicle', async () => {
    const { service, repository } = createSubject({
      checkout: jest.fn().mockResolvedValue({ incompatibleVariantId: 'variant-incompatible' }),
    });

    await expect(
      service.checkout(
        {
          paymentMethod: AccessoryPaymentMethodDtoValue.PayAtShop,
          contact: {
            name: 'Customer',
            phone: '09000000000',
            email: 'customer@example.com',
          },
          fitmentAcknowledgements: [],
        },
        'checkout-incompatible-1',
        actor,
      ),
    ).rejects.toThrow('not compatible');
    expect(repository.findOrder).not.toHaveBeenCalled();
  });

  it('requires explicit acknowledgement for unverified fitment', async () => {
    const { service, repository } = createSubject({
      checkout: jest.fn().mockResolvedValue({
        acknowledgementRequiredVariantId: 'variant-unverified',
      }),
    });

    await expect(
      service.checkout(
        {
          paymentMethod: AccessoryPaymentMethodDtoValue.PayAtShop,
          contact: {
            name: 'Customer',
            phone: '09000000000',
            email: 'customer@example.com',
          },
          fitmentAcknowledgements: [],
        },
        'checkout-unverified-1',
        actor,
      ),
    ).rejects.toThrow('requires unverified-fitment acknowledgement');
    expect(repository.findOrder).not.toHaveBeenCalled();
  });

  it('blocks lighting publication until compatibility and compliance review exists', async () => {
    const admin = { userId: 'admin-1', role: 'super_admin' as const };
    const { service } = createSubject({
      publishProduct: jest.fn().mockResolvedValue({ lightingReviewRequired: true }),
    });

    await expect(
      service.publishProduct(
        'lighting-product-1',
        '1',
        { status: 'active', reason: 'Approved for customer pickup catalog.' },
        admin,
      ),
    ).rejects.toThrow('Lighting requires compatibility and compliance review');
  });

  it.each(['cancelled', 'expired', 'collected', 'payment_exception', 'refund_pending', 'refunded'])(
    'rejects taking a %s order before the atomic claim update',
    async (status) => {
      const staff = { userId: 'staff-2', role: 'service_adviser' as const };
      const { service, repository } = createSubject({
        findOrder: jest.fn().mockResolvedValue({ ...order, status, assignedToUserId: null }),
      });

      await expect(service.takeOrder(order.id, '1', staff)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ACCESSORY_ORDER_NOT_ELIGIBLE' }),
      });
      expect(repository.takeOrder).not.toHaveBeenCalled();
    },
  );

  it.each(['reserved', 'paid', 'preparing', 'ready_for_pickup'])(
    'allows an atomic staff claim for an active %s order',
    async (status) => {
      const staff = { userId: 'staff-2', role: 'service_adviser' as const };
      const activeOrder = { ...order, status, assignedToUserId: null };
      const { service, repository } = createSubject({
        findOrder: jest.fn().mockResolvedValue(activeOrder),
        takeOrder: jest.fn().mockResolvedValue({ ...activeOrder, assignedToUserId: staff.userId }),
      });

      await expect(service.takeOrder(order.id, '1', staff)).resolves.toMatchObject({
        assignedToUserId: staff.userId,
      });
      expect(repository.takeOrder).toHaveBeenCalledWith(order.id, staff, 1);
    },
  );

  it('rejects reassignment to a customer or inactive staff account', async () => {
    const admin = { userId: 'admin-1', role: 'super_admin' as const };
    const { service, repository } = createSubject({
      findAssignableStaff: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.reassignOrder(
        order.id,
        '1',
        { assigneeUserId: 'customer-1', reason: 'Incorrect target' },
        admin,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ACCESSORY_ASSIGNEE_INVALID' }),
    });
    expect(repository.reassignOrder).not.toHaveBeenCalled();
  });

  it('allows reassignment to an active staff web account', async () => {
    const admin = { userId: 'admin-1', role: 'super_admin' as const };
    const { service, repository } = createSubject();

    await expect(
      service.reassignOrder(
        order.id,
        '1',
        { assigneeUserId: 'staff-2', reason: 'Balance the fulfillment queue' },
        admin,
      ),
    ).resolves.toMatchObject({ assignedToUserId: 'staff-2' });
    expect(repository.findAssignableStaff).toHaveBeenCalledWith('staff-2');
  });
});

describe('AccessoriesService customer read shapes', () => {
  const actor = { userId: 'customer-1', role: 'customer' as const };

  const createReadSubject = (overrides: Record<string, jest.Mock> = {}) => {
    const feature = {
      requireCatalog: jest.fn(),
      requireOrdering: jest.fn(),
    };
    const repository = {
      listProducts: jest.fn(),
      findProductBySlug: jest.fn(),
      getCart: jest.fn(),
      ...overrides,
    };
    return {
      repository,
      service: new AccessoriesService(feature as never, repository as never, {} as never),
    };
  };

  it('returns zero availability without leaking inventory internals', async () => {
    const { service, repository } = createReadSubject({
      listProducts: jest.fn().mockResolvedValue({
        rows: [
          {
            product: {
              id: 'product-1',
              categoryId: 'category-1',
              slug: 'fog-lights',
              name: 'Fog lights',
              description: null,
              isLighting: true,
            },
            category: { id: 'category-1', slug: 'lighting', name: 'Lighting' },
            startingPriceCents: 120000,
            availableQuantity: 0,
            mediaId: null,
          },
        ],
        hasMore: false,
      }),
    });

    const result = await service.listProducts({ limit: 20 }, actor);

    expect(repository.listProducts).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
    expect(result.items[0]).toMatchObject({
      availability: { availableQuantity: 0, inStock: false },
    });
    expect(result.items[0].product).not.toHaveProperty('inventoryId');
    expect(result.items[0]).not.toHaveProperty('inventory');
  });

  it('maps variant availability for null and reserved inventory', async () => {
    const { service, repository } = createReadSubject({
      findProductBySlug: jest.fn().mockResolvedValue({
        product: {
          id: 'product-1',
          categoryId: 'category-1',
          slug: 'fog-lights',
          name: 'Fog lights',
          description: 'Test',
          isLighting: true,
        },
        category: { id: 'category-1', slug: 'lighting', name: 'Lighting' },
        variants: [
          {
            variant: {
              id: 'variant-1',
              productId: 'product-1',
              sku: 'LIGHT-1',
              name: 'Pair',
              attributes: {},
              priceCents: 120000,
              currencyCode: 'PHP',
              isActive: true,
            },
            inventory: { onHandQuantity: 4, reservedQuantity: 4, internalId: 'secret' },
          },
          {
            variant: {
              id: 'variant-2',
              productId: 'product-1',
              sku: 'LIGHT-2',
              name: 'Single',
              attributes: {},
              priceCents: 70000,
              currencyCode: 'PHP',
              isActive: true,
            },
            inventory: null,
          },
        ],
        media: [],
      }),
    });

    const result = await service.getProduct('fog-lights', actor) as {
      product: { availability: { availableQuantity: number; inStock: boolean } };
      variants: Array<{
        availability: { availableQuantity: number; inStock: boolean };
        inventory: { availableQuantity: number };
      }>;
    };

    expect(result.product.availability).toEqual({ availableQuantity: 0, inStock: false });
    expect(result.variants.map((row) => row.availability)).toEqual([
      { availableQuantity: 0, inStock: false },
      { availableQuantity: 0, inStock: false },
    ]);
    expect(result.variants[0]).not.toHaveProperty('inventory.internalId');
  });

  it('returns current server prices, line totals, and cart totals for the authenticated customer', async () => {
    const { service, repository } = createReadSubject({
      getCart: jest.fn().mockResolvedValue({
        userId: actor.userId,
        selectedVehicleId: 'vehicle-1',
        version: 7,
        updatedAt: new Date('2026-08-12T00:00:00.000Z'),
        items: [
          {
            item: { id: 'line-1', variantId: 'variant-1', quantity: 2 },
            variant: {
              id: 'variant-1',
              productId: 'product-1',
              sku: 'LIGHT-1',
              name: 'Pair',
              attributes: {},
              priceCents: 125000,
              currencyCode: 'PHP',
            },
            product: {
              id: 'product-1',
              categoryId: 'category-1',
              slug: 'fog-lights',
              name: 'Fog lights',
              description: null,
              isLighting: true,
            },
            inventory: { onHandQuantity: 5, reservedQuantity: 1 },
          },
        ],
      }),
    });

    const result = await service.getCart(actor);

    expect(repository.getCart).toHaveBeenCalledWith(actor.userId);
    expect(result).toMatchObject({
      selectedVehicleId: 'vehicle-1',
      currencyCode: 'PHP',
      subtotalCents: 250000,
      totalCents: 250000,
    });
    expect(result.items[0]).toMatchObject({
      unitPriceCents: 125000,
      lineSubtotalCents: 250000,
      lineTotalCents: 250000,
      availability: { availableQuantity: 4, inStock: true },
    });
    expect(result).not.toHaveProperty('userId');
  });
});
