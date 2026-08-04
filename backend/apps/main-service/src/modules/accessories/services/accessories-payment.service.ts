import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AccessoryActor,
  accessoryError,
  assertAccessoryAdmin,
  assertAccessoryOwner,
  decodeAccessoryCursor,
  encodeAccessoryCursor,
  fingerprintAccessoryPayload,
  normalizeAccessoryPageSize,
  requireIdempotencyKey,
} from '../common/accessories-common';
import { AccessoryPageQueryDto } from '../dto/accessories.dto';
import { AccessoriesRepository } from '../repositories/accessories.repository';

type PayMongoEvent = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      livemode?: boolean;
      data?: {
        id?: string;
        attributes?: {
          amount?: number;
          currency?: string;
          metadata?: Record<string, string>;
        };
      };
    };
  };
};

export const isAccessoryPaymentSessionEligible = (
  order: { status?: string; paymentStatus?: string; reservationExpiresAt?: Date | null },
  now = new Date(),
) =>
  order.status === 'pending_payment' &&
  ['pending', 'failed'].includes(order.paymentStatus ?? '') &&
  order.reservationExpiresAt instanceof Date &&
  order.reservationExpiresAt.getTime() > now.getTime();

const parseSignature = (value: string | undefined) => {
  const parts = Object.fromEntries(
    String(value ?? '')
      .split(',')
      .map((part) => part.trim().split('='))
      .filter(([key, nested]) => key && nested),
  );
  return { timestamp: Number(parts.t), test: parts.te, live: parts.li };
};

@Injectable()
export class AccessoriesPaymentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly repository: AccessoriesRepository,
  ) {}

  async createCheckoutSession(
    orderId: string,
    actor: AccessoryActor,
    rawIdempotencyKey: string | undefined,
  ) {
    const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
    const order = await this.repository.findOrder(orderId);
    if (!order) throw new NotFoundException(accessoryError('ACCESSORY_ORDER_NOT_FOUND', 'Order not found.'));
    assertAccessoryOwner(actor, order.userId);
    if (order.paymentMethod !== 'paymongo') {
      throw new ConflictException(
        accessoryError('ACCESSORY_PAYMENT_METHOD_CONFLICT', 'This order is configured for pay at shop.'),
      );
    }
    if (order.paymentStatus === 'paid') return { orderId, status: 'paid' };
    const now = new Date();
    if (!isAccessoryPaymentSessionEligible(order, now)) {
      throw new ConflictException(
        accessoryError(
          'ACCESSORY_PAYMENT_ORDER_NOT_ELIGIBLE',
          'This order no longer has an active PayMongo reservation. Refresh the order before continuing.',
        ),
      );
    }
    const existing = order.paymentAttempts.find(
      (attempt) =>
        attempt.status === 'pending' &&
        attempt.checkoutUrl &&
        (!attempt.expiresAt || attempt.expiresAt > now),
    );
    if (existing) {
      return { orderId, checkoutUrl: existing.checkoutUrl, expiresAt: existing.expiresAt };
    }

    const claim = await this.repository.claimIdempotency({
      actorUserId: actor.userId,
      scope: 'payment_session',
      key: idempotencyKey,
      payload: { orderId },
    });
    if (!claim.claimed) {
      if (claim.record.responseSnapshot) return claim.record.responseSnapshot;
      throw new ConflictException(
        accessoryError('ACCESSORY_REQUEST_IN_PROGRESS', 'The payment request is still being processed.'),
      );
    }

    let completed = false;
    try {

    const secretKey = this.configService.get<string>('payments.paymongoSecretKey');
    const successUrl = this.configService.get<string>('accessories.payments.checkoutSuccessUrl');
    const cancelUrl = this.configService.get<string>('accessories.payments.checkoutCancelUrl');
    if (!secretKey || !successUrl || !cancelUrl) {
      throw new BadGatewayException(
        accessoryError('ACCESSORY_PAYMENT_UNAVAILABLE', 'PayMongo is not configured.'),
      );
    }
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: order.contactSnapshot,
            cancel_url: cancelUrl,
            success_url: successUrl,
            description: `Accessory pickup order ${order.orderReference}`,
            line_items: order.items.map((item) => ({
              name: `${item.productNameSnapshot} - ${item.variantNameSnapshot}`,
              quantity: item.quantity,
              amount: item.unitPriceCents,
              currency: order.currencyCode,
            })),
            payment_method_types: ['card', 'gcash', 'paymaya'],
            metadata: { accessory_order_id: order.id, order_reference: order.orderReference },
          },
        },
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: { id?: string; attributes?: { checkout_url?: string; expires_at?: number } };
      errors?: Array<{ detail?: string }>;
    };
    if (!response.ok || !body.data?.id || !body.data.attributes?.checkout_url) {
      await this.repository.createPaymentAttempt({
        orderId,
        amountCents: order.totalCents,
        currencyCode: order.currencyCode,
        failureReason: body.errors?.[0]?.detail ?? `PayMongo returned ${response.status}`,
      });
      throw new BadGatewayException(
        accessoryError('ACCESSORY_PAYMENT_SESSION_FAILED', 'Unable to create the payment session.'),
      );
    }
    const expiresAt = body.data.attributes.expires_at
      ? new Date(body.data.attributes.expires_at * 1000)
      : order.reservationExpiresAt ?? undefined;
    const attempt = await this.repository.createPaymentAttempt({
      orderId,
      amountCents: order.totalCents,
      currencyCode: order.currencyCode,
      providerCheckoutId: body.data.id,
      checkoutUrl: body.data.attributes.checkout_url,
      expiresAt,
    });
    const result = { orderId, checkoutUrl: attempt.checkoutUrl, expiresAt: attempt.expiresAt };
    await this.repository.completeIdempotency(claim.record.id, result, {
      type: 'accessory_payment_attempt',
      id: attempt.id,
    });
    completed = true;
    return result;
    } finally {
      if (!completed) {
        await this.repository.releaseIncompleteIdempotency(claim.record.id).catch(() => undefined);
      }
    }
  }

  async handlePayMongoWebhook(rawBody: Buffer | undefined, signatureHeader: string | undefined) {
    if (!rawBody?.length) {
      throw new BadRequestException(
        accessoryError('ACCESSORY_WEBHOOK_RAW_BODY_REQUIRED', 'Raw webhook bytes are required.'),
      );
    }
    const secret = this.configService.get<string>('accessories.payments.paymongoWebhookSecret');
    if (!secret) throw new UnauthorizedException('Accessories webhook secret is not configured.');
    const signature = parseSignature(signatureHeader);
    const tolerance = this.configService.get<number>(
      'accessories.payments.webhookToleranceSeconds',
      300,
    );
    if (
      !Number.isInteger(signature.timestamp) ||
      Math.abs(Math.floor(Date.now() / 1000) - signature.timestamp) > tolerance
    ) {
      throw new UnauthorizedException('The Accessories webhook signature timestamp is invalid.');
    }
    const event = JSON.parse(rawBody.toString('utf8')) as PayMongoEvent;
    const livemode = event.data?.attributes?.livemode === true;
    const supplied = livemode ? signature.live : signature.test;
    const expected = createHmac('sha256', secret)
      .update(`${signature.timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');
    if (
      !supplied ||
      supplied.length !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    ) {
      throw new UnauthorizedException('The Accessories webhook signature is invalid.');
    }
    const expectedLivemode = this.configService.get<boolean>(
      'accessories.payments.paymongoLivemode',
      false,
    );
    if (livemode !== expectedLivemode) {
      throw new UnauthorizedException(
        'The Accessories webhook livemode does not match this environment.',
      );
    }
    const providerEventId = event.data?.id;
    const eventType = event.data?.attributes?.type;
    const payment = event.data?.attributes?.data;
    const metadata = payment?.attributes?.metadata ?? {};
    const orderId = metadata.accessory_order_id;
    if (!providerEventId || !eventType) {
      throw new BadRequestException('The Accessories webhook event is incomplete.');
    }
    const isPaidEvent = eventType.includes('paid');
    if (
      isPaidEvent &&
      (!orderId ||
        !payment?.id ||
        !Number.isInteger(payment.attributes?.amount) ||
        !payment.attributes?.currency)
    ) {
      throw new BadRequestException('The paid Accessories event is missing order or amount data.');
    }
    if (isPaidEvent) {
      const order = await this.repository.findOrder(orderId!);
      if (
        !order ||
        order.paymentMethod !== 'paymongo' ||
        order.totalCents !== payment!.attributes!.amount ||
        order.currencyCode !== payment!.attributes!.currency!.toUpperCase() ||
        (metadata.order_reference && metadata.order_reference !== order.orderReference)
      ) {
        throw new ConflictException(
          accessoryError(
            'ACCESSORY_PAYMENT_AMOUNT_MISMATCH',
            'Payment order, amount, currency, or reference did not match.',
          ),
        );
      }
    }
    const paymentEvent = {
      providerEventId,
      eventType,
      orderId: orderId || null,
      livemode,
      payloadHash: fingerprintAccessoryPayload(event),
    };
    if (!isPaidEvent) {
      const inserted = await this.repository.insertPaymentEvent(paymentEvent);
      return inserted
        ? { received: true, ignored: true }
        : { received: true, duplicate: true };
    }
    const paidPayment = payment!;
    const result = await this.repository.markOrderPaid({
      orderId: orderId!,
      providerPaymentId: paidPayment.id,
      amountCents: paidPayment.attributes!.amount!,
      currencyCode: paidPayment.attributes!.currency!.toUpperCase(),
    });
    if ('missing' in result) {
      throw new NotFoundException('The Accessories order for this payment no longer exists.');
    }
    if ('amountMismatch' in result) {
      throw new ConflictException(
        accessoryError('ACCESSORY_PAYMENT_AMOUNT_MISMATCH', 'Payment amount or currency did not match.'),
      );
    }
    const inserted = await this.repository.insertPaymentEvent(paymentEvent);
    if (!inserted) return { received: true, duplicate: true };
    return { received: true, orderId, stockException: 'stockConflict' in result };
  }

  async refund(
    refundId: string,
    actor: AccessoryActor,
    rawIdempotencyKey: string | undefined,
  ) {
    assertAccessoryAdmin(actor);
    const idempotencyKey = requireIdempotencyKey(rawIdempotencyKey);
    const refund = await this.repository.findRefund(refundId);
    if (!refund) throw new NotFoundException('Refund not found.');
    if (refund.status === 'completed') return refund;
    const order = await this.repository.findOrder(refund.orderId);
    const payment = order?.paymentAttempts.find((attempt) => attempt.providerPaymentId);
    if (!order || !payment?.providerPaymentId) {
      throw new ConflictException('A settled PayMongo payment is required for this refund.');
    }
    const claim = await this.repository.claimIdempotency({
      actorUserId: actor.userId,
      scope: 'refund',
      key: idempotencyKey,
      payload: { refundId, amountCents: refund.amountCents },
    });
    if (!claim.claimed && claim.record.responseSnapshot) return claim.record.responseSnapshot;
    if (!claim.claimed) throw new ConflictException('The refund request is still being processed.');
    const refundClaim = await this.repository.claimRefund(refundId);
    if (!refundClaim) {
      await this.repository.releaseIncompleteIdempotency(claim.record.id);
      throw new ConflictException('The refund request is already being processed.');
    }
    let completed = false;
    try {
      const secretKey = this.configService.get<string>('payments.paymongoSecretKey');
      if (!secretKey) throw new BadGatewayException('PayMongo is not configured.');
      const response = await fetch('https://api.paymongo.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: refund.amountCents,
            payment_id: payment.providerPaymentId,
            reason: 'requested_by_customer',
            notes: refund.reason,
          },
        },
      }),
      });
      const body = (await response.json().catch(() => ({}))) as { data?: { id?: string } };
      if (!response.ok || !body.data?.id) throw new BadGatewayException('PayMongo refund failed.');
      const completedRefund = await this.repository.completeRefund({
        refundId,
        actorUserId: actor.userId,
        providerRefundId: body.data.id,
      });
      if (!completedRefund) throw new ConflictException('The refund state changed before completion.');
      await this.repository.completeIdempotency(
        claim.record.id,
        completedRefund as Record<string, unknown>,
        { type: 'accessory_refund', id: refundId },
      );
      completed = true;
      return completedRefund;
    } finally {
      if (!completed) {
        await Promise.allSettled([
          this.repository.releaseRefundClaim(refundId),
          this.repository.releaseIncompleteIdempotency(claim.record.id),
        ]);
      }
    }
  }

  async listRefunds(query: AccessoryPageQueryDto, actor: AccessoryActor) {
    assertAccessoryAdmin(actor);
    const limit = normalizeAccessoryPageSize(query.limit);
    const page = await this.repository.listRefunds({
      limit,
      cursor: decodeAccessoryCursor(query.cursor),
    });
    const last = page.rows[page.rows.length - 1];
    return {
      items: page.rows,
      nextCursor:
        page.hasMore && last
          ? encodeAccessoryCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }
}
