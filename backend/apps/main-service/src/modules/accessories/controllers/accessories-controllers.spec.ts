import { createHmac } from 'node:crypto';

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import {
  CustomerAccessoriesController,
  StaffAccessoriesController,
  AccessoriesWebhookController,
} from './accessories.controller';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';
import { AccessoriesService } from '../services/accessories.service';
import { AccessoriesPaymentService } from '../services/accessories-payment.service';

type Actor = { userId: string; role: 'customer' | 'service_adviser' | 'super_admin' };

const customer: Actor = { userId: 'customer-1', role: 'customer' };
const foreignCustomer: Actor = { userId: 'customer-2', role: 'customer' };
const adviser: Actor = { userId: 'adviser-1', role: 'service_adviser' };
const admin: Actor = { userId: 'admin-1', role: 'super_admin' };

const requestFor = (actor: Actor): Request => ({ user: actor } as unknown as Request);

const checkoutPayload = {
  paymentMethod: 'pay_at_shop',
  contact: {
    name: 'Queue Customer',
    phone: '+639171234567',
    email: 'customer@example.com',
  },
};

const createService = (repository: Record<string, jest.Mock> = {}) => {
  const feature = {
    capabilities: jest.fn().mockReturnValue({ mode: 'ordering' }),
    requireCatalog: jest.fn(),
    requireOrdering: jest.fn(),
  };
  const payments = {
    createCheckoutSession: jest.fn(),
  };
  return {
    service: new AccessoriesService(feature as never, repository as never, payments as never),
    feature,
    payments,
  };
};

const createPaymentService = (repository: Record<string, jest.Mock> = {}) => {
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'accessories.payments.paymongoWebhookSecret') return 'accessory-secret';
      if (key === 'accessories.payments.webhookToleranceSeconds') return 300;
      if (key === 'accessories.payments.paymongoLivemode') return false;
      return fallback;
    }),
  };
  return new AccessoriesPaymentService(config as never, repository as never);
};

const guardContext = (controller: Function, method: string, role: string) => {
  const handler = (controller as { prototype: Record<string, Function> }).prototype[method];
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as never;
};

describe('Accessories controllers security contracts', () => {
  it('uses the authenticated request actor instead of trusting payload identity', async () => {
    const service = {
      getOrder: jest.fn().mockResolvedValue({ id: 'order-1' }),
      getCart: jest.fn().mockResolvedValue({ items: [] }),
      checkout: jest.fn().mockResolvedValue({ id: 'order-1' }),
    };
    const controller = new CustomerAccessoriesController(
      service as never,
      {} as never,
      {} as never,
    );

    await controller.getOrder('order-1', requestFor(customer));
    await controller.getCart(requestFor(customer));
    await controller.checkout(checkoutPayload as never, 'checkout-identity-1', requestFor(customer));

    expect(service.getOrder).toHaveBeenCalledWith('order-1', customer);
    expect(service.getCart).toHaveBeenCalledWith(customer);
    expect(service.checkout).toHaveBeenCalledWith(
      checkoutPayload,
      'checkout-identity-1',
      customer,
    );
    expect(service.checkout.mock.calls[0][2]).not.toBe(foreignCustomer);
  });

  it('rejects a customer attempting to read another customer order', async () => {
    const repository = {
      findOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        userId: customer.userId,
        status: 'pending_payment',
      }),
      claimIdempotency: jest.fn(),
    };
    const { service } = createService(repository);

    await expect(service.getOrder('order-1', foreignCustomer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findOrder).toHaveBeenCalledWith('order-1');
  });

  it.each([
    ['checkout', async (service: AccessoriesService) => service.checkout(checkoutPayload as never, undefined, customer)],
    [
      'cancel',
      async (service: AccessoriesService) =>
        service.cancelOrder(
          'order-1',
          { reason: 'Customer changed plans' },
          undefined,
          customer,
        ),
    ],
  ])('requires Idempotency-Key for customer %s', async (_operation, invoke) => {
    const repository = {
      findOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        userId: customer.userId,
        status: 'pending_payment',
      }),
      claimIdempotency: jest.fn(),
    };
    const { service } = createService(repository);

    await expect(invoke(service)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.claimIdempotency).not.toHaveBeenCalled();
  });

  it('requires Idempotency-Key for payment-session retry before repository work', async () => {
    const repository = { findOrder: jest.fn() };
    const payments = createPaymentService(repository);

    await expect(payments.createCheckoutSession('order-1', customer, undefined)).rejects.toThrow(
      'Idempotency-Key',
    );
    expect(repository.findOrder).not.toHaveBeenCalled();
  });

  it('keeps pickup-code regeneration authenticated and owner-scoped', async () => {
    const repository = {
      findOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        userId: customer.userId,
        status: 'pending_payment',
      }),
      regeneratePickupCode: jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    };
    const { service } = createService(repository);

    await expect(service.regeneratePickupCode('order-1', foreignCustomer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.regeneratePickupCode('order-1', customer)).resolves.toEqual({
      orderId: 'order-1',
    });
    expect(repository.regeneratePickupCode).toHaveBeenCalledTimes(1);
  });

  it('rejects page sizes above 25 and forwards the maximum bounded page size', async () => {
    const repository = {
      listProducts: jest.fn().mockResolvedValue({ rows: [], hasMore: false }),
      listOrders: jest.fn().mockResolvedValue({ rows: [], hasMore: false }),
      listStock: jest.fn().mockResolvedValue({ rows: [], hasMore: false }),
    };
    const { service } = createService(repository);

    await expect(service.listProducts({ limit: 26 }, customer)).rejects.toThrow(
      'between 1 and 25',
    );
    await expect(service.listMyOrders({ limit: 26 }, customer)).rejects.toThrow(
      'between 1 and 25',
    );
    await expect(service.listStaffOrders({ limit: 26 }, adviser)).rejects.toThrow(
      'between 1 and 25',
    );
    await expect(service.listStock({ limit: 26 }, admin)).rejects.toThrow('between 1 and 25');

    await service.listProducts({ limit: 25 }, customer);
    await service.listMyOrders({ limit: 25 }, customer);
    await service.listStaffOrders({ limit: 25 }, adviser);
    await service.listStock({ limit: 25 }, admin);

    expect(repository.listProducts).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
    expect(repository.listOrders).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
    expect(repository.listStock).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
  });

  it('keeps customer, adviser, and super-admin routes separated by RolesGuard metadata', () => {
    const guard = new RolesGuard(new Reflector());

    expect(guard.canActivate(guardContext(CustomerAccessoriesController, 'getOrder', 'customer'))).toBe(
      true,
    );
    expect(
      guard.canActivate(guardContext(CustomerAccessoriesController, 'readMedia', 'service_adviser')),
    ).toBe(true);
    expect(
      guard.canActivate(guardContext(CustomerAccessoriesController, 'readMedia', 'super_admin')),
    ).toBe(true);
    expect(() =>
      guard.canActivate(guardContext(CustomerAccessoriesController, 'getOrder', 'service_adviser')),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(guardContext(StaffAccessoriesController, 'listOrders', 'customer')),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(guardContext(StaffAccessoriesController, 'listOrders', 'service_adviser'))).toBe(
      true,
    );
    expect(() =>
      guard.canActivate(guardContext(StaffAccessoriesController, 'adjustStock', 'service_adviser')),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(guardContext(StaffAccessoriesController, 'adjustStock', 'super_admin'))).toBe(
      true,
    );
    expect(() =>
      guard.canActivate(guardContext(StaffAccessoriesController, 'approveRefund', 'service_adviser')),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(guardContext(StaffAccessoriesController, 'approveRefund', 'super_admin'))).toBe(
      true,
    );
  });

  it('passes raw webhook bytes and signature unchanged to the payment service', async () => {
    const payments = { handlePayMongoWebhook: jest.fn().mockResolvedValue({ received: true }) };
    const controller = new AccessoriesWebhookController(payments as never);
    const raw = Buffer.from('{"data":{"id":"evt-1"}}');

    await expect(controller.webhook({ rawBody: raw } as never, 't=1,te=signature')).resolves.toEqual({
      received: true,
    });
    expect(payments.handlePayMongoWebhook).toHaveBeenCalledWith(raw, 't=1,te=signature');
  });

  it('fails closed for missing raw bytes and invalid webhook signatures', async () => {
    const repository = { insertPaymentEvent: jest.fn() };
    const controller = new AccessoriesWebhookController(createPaymentService(repository));

    await expect(controller.webhook({ rawBody: undefined } as never, undefined)).rejects.toThrow(
      'Raw webhook bytes are required',
    );

    const timestamp = Math.floor(Date.now() / 1000);
    const raw = Buffer.from(
      JSON.stringify({
        data: {
          id: 'evt-1',
          attributes: { type: 'payment.paid', livemode: false },
        },
      }),
    );
    const invalidSignature = `t=${timestamp},te=${createHmac('sha256', 'wrong-secret')
      .update(`${timestamp}.${raw.toString('utf8')}`)
      .digest('hex')}`;

    await expect(controller.webhook({ rawBody: raw } as never, invalidSignature)).rejects.toThrow(
      'signature is invalid',
    );
    expect(repository.insertPaymentEvent).not.toHaveBeenCalled();
  });
});
