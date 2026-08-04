import { createHmac } from 'node:crypto';

import { isAccessoryPaymentSettlementEligibleStatus } from '../repositories/accessories-payments.repository';
import {
  AccessoriesPaymentService,
  isAccessoryPaymentSessionEligible,
} from './accessories-payment.service';

const secret = 'whsec_accessories_test';
const timestamp = Math.floor(Date.now() / 1000);

const eventBody = (overrides: Record<string, unknown> = {}) => ({
  data: {
    id: 'evt_accessory_paid_1',
    attributes: {
      type: 'payment.paid',
      livemode: false,
      data: {
        id: 'pay_accessory_1',
        attributes: {
          amount: 189900,
          currency: 'PHP',
          metadata: {
            accessory_order_id: 'order-1',
            order_reference: 'ACC-260803-ABC123',
          },
        },
      },
      ...overrides,
    },
  },
});

const signed = (
  event: Record<string, unknown>,
  mode: 'te' | 'li' = 'te',
  signedAt = timestamp,
) => {
  const raw = Buffer.from(JSON.stringify(event));
  const digest = createHmac('sha256', secret)
    .update(`${signedAt}.${raw.toString('utf8')}`)
    .digest('hex');
  return { raw, header: `t=${signedAt},${mode}=${digest}` };
};

const eventWithId = (id: string) => {
  const event = eventBody();
  event.data.id = id;
  return event;
};

describe('Accessories payment state eligibility', () => {
  const now = new Date('2026-08-04T08:00:00.000Z');

  it('creates sessions only for live pending-payment reservations', () => {
    expect(isAccessoryPaymentSessionEligible({
      status: 'pending_payment',
      paymentStatus: 'pending',
      reservationExpiresAt: new Date('2026-08-04T08:15:00.000Z'),
    }, now)).toBe(true);
    expect(isAccessoryPaymentSessionEligible({
      status: 'cancelled',
      paymentStatus: 'pending',
      reservationExpiresAt: new Date('2026-08-04T08:15:00.000Z'),
    }, now)).toBe(false);
    expect(isAccessoryPaymentSessionEligible({
      status: 'pending_payment',
      paymentStatus: 'pending',
      reservationExpiresAt: new Date('2026-08-04T07:59:59.000Z'),
    }, now)).toBe(false);
  });

  it('settles only pending or explicitly late-expired orders into fulfillment', () => {
    expect(isAccessoryPaymentSettlementEligibleStatus('pending_payment')).toBe(true);
    expect(isAccessoryPaymentSettlementEligibleStatus('expired')).toBe(true);
    for (const status of ['cancelled', 'refund_pending', 'refunded', 'collected', 'payment_exception']) {
      expect(isAccessoryPaymentSettlementEligibleStatus(status)).toBe(false);
    }
  });
});

describe('Accessories payment operation recovery', () => {
  const customer = { userId: 'customer-1', role: 'customer' as const };
  const admin = { userId: 'admin-1', role: 'super_admin' as const };
  const config = { get: jest.fn((_key: string, fallback?: unknown) => fallback) };

  it('releases an incomplete payment-session key when provider configuration fails', async () => {
    const repository = {
      findOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        userId: customer.userId,
        orderReference: 'ACC-1',
        status: 'pending_payment',
        paymentMethod: 'paymongo',
        paymentStatus: 'pending',
        reservationExpiresAt: new Date(Date.now() + 60_000),
        paymentAttempts: [],
      }),
      claimIdempotency: jest.fn().mockResolvedValue({ claimed: true, record: { id: 'claim-1' } }),
      releaseIncompleteIdempotency: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AccessoriesPaymentService(config as never, repository as never);

    await expect(service.createCheckoutSession('order-1', customer, 'payment-key-1'))
      .rejects.toThrow('PayMongo is not configured');
    expect(repository.releaseIncompleteIdempotency).toHaveBeenCalledWith('claim-1');
  });

  it('atomically claims a refund and releases both claims after provider failure', async () => {
    const repository = {
      findRefund: jest.fn().mockResolvedValue({
        id: 'refund-1',
        orderId: 'order-1',
        status: 'requested',
        amountCents: 1000,
        reason: 'Customer cancellation',
      }),
      findOrder: jest.fn().mockResolvedValue({
        id: 'order-1',
        paymentAttempts: [{ providerPaymentId: 'pay-1' }],
      }),
      claimIdempotency: jest.fn().mockResolvedValue({ claimed: true, record: { id: 'claim-1' } }),
      claimRefund: jest.fn().mockResolvedValue({ id: 'refund-1', status: 'processing' }),
      releaseRefundClaim: jest.fn().mockResolvedValue(undefined),
      releaseIncompleteIdempotency: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AccessoriesPaymentService(config as never, repository as never);

    await expect(service.refund('refund-1', admin, 'refund-key-1'))
      .rejects.toThrow('PayMongo is not configured');
    expect(repository.claimRefund).toHaveBeenCalledWith('refund-1');
    expect(repository.releaseRefundClaim).toHaveBeenCalledWith('refund-1');
    expect(repository.releaseIncompleteIdempotency).toHaveBeenCalledWith('claim-1');
  });
});

describe('AccessoriesPaymentService webhook verification', () => {
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'accessories.payments.paymongoWebhookSecret') return secret;
      if (key === 'accessories.payments.webhookToleranceSeconds') return 300;
      if (key === 'accessories.payments.paymongoLivemode') return false;
      return fallback;
    }),
  };
  const repository = {
    findOrder: jest.fn(),
    insertPaymentEvent: jest.fn(),
    markOrderPaid: jest.fn(),
  };
  const service = new AccessoriesPaymentService(config as never, repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findOrder.mockResolvedValue({
      id: 'order-1',
      orderReference: 'ACC-260803-ABC123',
      paymentMethod: 'paymongo',
      totalCents: 189900,
      currencyCode: 'PHP',
    });
    repository.insertPaymentEvent.mockResolvedValue({ id: 'event-row-1' });
    repository.markOrderPaid.mockResolvedValue({ order: { id: 'order-1' } });
  });

  it('fails closed when raw bytes or the signature are missing', async () => {
    await expect(service.handlePayMongoWebhook(undefined, undefined)).rejects.toThrow(
      'Raw webhook bytes are required',
    );
    const { raw } = signed(eventBody());
    await expect(service.handlePayMongoWebhook(raw, 't=1,te=invalid')).rejects.toThrow();
    expect(repository.insertPaymentEvent).not.toHaveBeenCalled();
  });

  it('rejects a valid signature from the wrong livemode', async () => {
    const { raw, header } = signed(eventBody({ livemode: true }), 'li');
    await expect(service.handlePayMongoWebhook(raw, header)).rejects.toThrow('livemode');
    expect(repository.insertPaymentEvent).not.toHaveBeenCalled();
  });

  it('rejects a correctly signed event outside the timestamp tolerance', async () => {
    const staleTimestamp = timestamp - 301;
    const { raw, header } = signed(eventBody(), 'te', staleTimestamp);

    await expect(service.handlePayMongoWebhook(raw, header)).rejects.toThrow('timestamp');
    expect(repository.insertPaymentEvent).not.toHaveBeenCalled();
    expect(repository.markOrderPaid).not.toHaveBeenCalled();
  });

  it('validates paid order data before reserving the provider event id', async () => {
    const { raw, header } = signed(eventBody({ data: { id: 'pay-1', attributes: {} } }));
    await expect(service.handlePayMongoWebhook(raw, header)).rejects.toThrow('missing order or amount');
    expect(repository.insertPaymentEvent).not.toHaveBeenCalled();
  });

  it('does not record an event when its order cannot be found', async () => {
    repository.findOrder.mockResolvedValueOnce(undefined);
    const { raw, header } = signed(eventBody());

    await expect(service.handlePayMongoWebhook(raw, header)).rejects.toThrow(
      'Payment order, amount, currency, or reference did not match.',
    );
    expect(repository.insertPaymentEvent).not.toHaveBeenCalled();
    expect(repository.markOrderPaid).not.toHaveBeenCalled();
  });

  it('does not record an event when the amount does not match the order', async () => {
    const event = eventBody();
    event.data.attributes.data.attributes.amount = 189901;
    const { raw, header } = signed(event);

    await expect(service.handlePayMongoWebhook(raw, header)).rejects.toThrow(
      'Payment order, amount, currency, or reference did not match.',
    );
    expect(repository.insertPaymentEvent).not.toHaveBeenCalled();
    expect(repository.markOrderPaid).not.toHaveBeenCalled();
  });

  it('deduplicates provider events and applies one payment transition', async () => {
    const event = eventBody();
    const { raw, header } = signed(event);
    await expect(service.handlePayMongoWebhook(raw, header)).resolves.toMatchObject({
      received: true,
      orderId: 'order-1',
    });
    repository.insertPaymentEvent.mockResolvedValueOnce(null);
    await expect(service.handlePayMongoWebhook(raw, header)).resolves.toEqual({
      received: true,
      duplicate: true,
    });
    expect(repository.markOrderPaid).toHaveBeenCalledTimes(2);
    expect(repository.markOrderPaid.mock.invocationCallOrder[0]).toBeLessThan(
      repository.insertPaymentEvent.mock.invocationCallOrder[0],
    );
  });

  it('leaves a paid provider event retryable when settlement fails', async () => {
    const { raw, header } = signed(eventBody());
    repository.markOrderPaid.mockRejectedValueOnce(new Error('temporary database failure'));

    await expect(service.handlePayMongoWebhook(raw, header)).rejects.toThrow(
      'temporary database failure',
    );
    expect(repository.insertPaymentEvent).not.toHaveBeenCalled();

    await expect(service.handlePayMongoWebhook(raw, header)).resolves.toMatchObject({
      received: true,
      orderId: 'order-1',
    });
    expect(repository.markOrderPaid).toHaveBeenCalledTimes(2);
    expect(repository.insertPaymentEvent).toHaveBeenCalledTimes(1);
  });

  it('keeps ten out-of-order paid events and a duplicate to one settlement transition', async () => {
    let settlementTransitions = 0;
    repository.markOrderPaid.mockImplementation(async () => {
      if (settlementTransitions > 0) {
        return { order: { id: 'order-1' }, replay: true };
      }
      settlementTransitions += 1;
      return { order: { id: 'order-1' } };
    });
    const deliveries = Array.from({ length: 10 }, (_, index) =>
      signed(eventWithId(`evt_paid_${String(9 - index).padStart(2, '0')}`)),
    );
    repository.insertPaymentEvent.mockResolvedValue({ id: 'event-row' });

    for (const delivery of deliveries) {
      await expect(
        service.handlePayMongoWebhook(delivery.raw, delivery.header),
      ).resolves.toMatchObject({ received: true, orderId: 'order-1' });
    }
    repository.insertPaymentEvent.mockResolvedValueOnce(null);
    await expect(
      service.handlePayMongoWebhook(deliveries[0].raw, deliveries[0].header),
    ).resolves.toEqual({
      received: true,
      duplicate: true,
    });

    expect(settlementTransitions).toBe(1);
    expect(repository.markOrderPaid).toHaveBeenCalledTimes(11);
  });

  it('keeps a late stock conflict retry-safe', async () => {
    let stockConflictTransitions = 0;
    repository.markOrderPaid.mockImplementation(async () => {
      if (stockConflictTransitions === 0) {
        stockConflictTransitions += 1;
        return { order: { id: 'order-1' }, stockConflict: true };
      }
      return { order: { id: 'order-1' }, replay: true, stockConflict: true };
    });
    repository.insertPaymentEvent
      .mockResolvedValueOnce({ id: 'event-row-1' })
      .mockResolvedValueOnce(null);

    const { raw, header } = signed(eventBody());
    await expect(service.handlePayMongoWebhook(raw, header)).resolves.toMatchObject({
      received: true,
      orderId: 'order-1',
      stockException: true,
    });
    await expect(service.handlePayMongoWebhook(raw, header)).resolves.toEqual({
      received: true,
      duplicate: true,
    });

    expect(stockConflictTransitions).toBe(1);
    expect(repository.insertPaymentEvent).toHaveBeenCalledTimes(2);
  });

  it('deduplicates non-payment events without settling an order', async () => {
    const { raw, header } = signed(eventBody({ type: 'payment.failed' }));

    await expect(service.handlePayMongoWebhook(raw, header)).resolves.toEqual({
      received: true,
      ignored: true,
    });
    expect(repository.markOrderPaid).not.toHaveBeenCalled();
    expect(repository.insertPaymentEvent).toHaveBeenCalledTimes(1);
  });
});
