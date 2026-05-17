import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export type PaymongoProviderStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'unavailable';

export type PaymongoCheckoutSessionResult = {
  provider: 'paymongo';
  status: PaymongoProviderStatus;
  providerPaymentId: string | null;
  checkoutUrl: string | null;
  referenceNumber: string | null;
  paidAt: Date | null;
  failureReason: string | null;
  metadata: Record<string, unknown>;
};

export type PaymongoWebhookEvent = {
  eventType: string;
  livemode: boolean;
  providerPaymentId: string | null;
  referenceNumber: string | null;
  paidAt: Date | null;
  status: PaymongoProviderStatus;
  failureReason: string | null;
  metadata: Record<string, unknown>;
};

export const buildPaymongoAuthToken = (secretKey: string) =>
  Buffer.from(`${secretKey}:`).toString('base64');

export const parsePaymongoJsonPayload = (rawText: string) => {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
};

export const toDateOrNull = (value: unknown) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return new Date(value * 1000);
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizePaymongoCheckoutSession = (
  attributes: Record<string, any> | null | undefined,
): PaymongoCheckoutSessionResult => {
  const paymentIntent = attributes?.payment_intent?.attributes ?? null;
  const payments: Array<{ attributes?: Record<string, any> }> = Array.isArray(paymentIntent?.payments)
    ? paymentIntent.payments
    : [];
  const paidPayment =
    payments.find((entry: { attributes?: Record<string, any> }) => entry?.attributes?.status === 'paid')
      ?.attributes ?? null;
  const failedPayment =
    payments.find((entry: { attributes?: Record<string, any> }) => entry?.attributes?.status === 'failed')
      ?.attributes ?? null;
  const paymentStatuses = payments
    .map((entry: { attributes?: Record<string, any> }) => entry?.attributes?.status)
    .filter((value: unknown): value is string => typeof value === 'string');

  const paymentIntentStatus = String(paymentIntent?.status ?? '').toLowerCase();
  const checkoutStatus = String(attributes?.status ?? '').toLowerCase();
  let status: PaymongoProviderStatus = 'pending';
  let failureReason: string | null = null;

  if (paidPayment || ['succeeded', 'paid'].includes(paymentIntentStatus)) {
    status = 'paid';
  } else if (['cancelled', 'canceled'].includes(checkoutStatus) || ['cancelled', 'canceled'].includes(paymentIntentStatus)) {
    status = 'cancelled';
    failureReason = 'The PayMongo checkout session was cancelled before payment was completed.';
  } else if (checkoutStatus === 'expired' || paymentIntentStatus === 'expired') {
    status = 'expired';
    failureReason = 'The PayMongo checkout session expired before payment was completed.';
  } else if (paymentStatuses.includes('failed')) {
    status = 'failed';
    failureReason =
      failedPayment?.last_payment_error?.message ??
      failedPayment?.last_payment_error?.detail ??
      'PayMongo reported that the payment failed.';
  }

  return {
    provider: 'paymongo',
    status,
    providerPaymentId: attributes?.id ?? null,
    checkoutUrl: attributes?.checkout_url ?? null,
    referenceNumber:
      attributes?.reference_number ??
      paidPayment?.metadata?.pm_reference_number ??
      failedPayment?.metadata?.pm_reference_number ??
      null,
    paidAt: toDateOrNull(paidPayment?.paid_at),
    failureReason,
    metadata:
      attributes?.metadata && typeof attributes.metadata === 'object'
        ? { ...attributes.metadata }
        : {},
  };
};

export const parsePaymongoWebhookEvent = (
  rawPayload: Buffer | string,
  signatureHeader: string | null | undefined,
  webhookSecret: string | undefined,
): PaymongoWebhookEvent => {
  const payloadText = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : String(rawPayload ?? '');
  const payload = parsePaymongoJsonPayload(payloadText);
  const eventAttributes = payload?.data?.attributes;

  if (!eventAttributes?.type) {
    throw new BadRequestException('Invalid PayMongo webhook payload.');
  }

  assertValidPaymongoWebhookSignature(
    payloadText,
    signatureHeader,
    Boolean(eventAttributes.livemode),
    webhookSecret,
  );

  const checkoutSession = eventAttributes?.data;
  const checkoutAttributes = checkoutSession?.attributes ?? {};
  const normalized = normalizePaymongoCheckoutSession({
    ...checkoutAttributes,
    id: checkoutSession?.id ?? null,
  });

  return {
    eventType: String(eventAttributes.type),
    livemode: Boolean(eventAttributes.livemode),
    providerPaymentId: checkoutSession?.id ?? null,
    referenceNumber: normalized.referenceNumber,
    paidAt: normalized.paidAt,
    status: normalized.status,
    failureReason: normalized.failureReason,
    metadata: normalized.metadata,
  };
};

export const assertValidPaymongoWebhookSignature = (
  rawPayload: string,
  signatureHeader: string | null | undefined,
  livemode: boolean,
  webhookSecret: string | undefined,
) => {
  if (!webhookSecret) {
    throw new ServiceUnavailableException(
      'PAYMONGO_WEBHOOK_SECRET is not configured for webhook verification.',
    );
  }

  if (!signatureHeader) {
    throw new BadRequestException('Missing PayMongo webhook signature header.');
  }

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((segment) => {
      const [key, ...rest] = segment.split('=');
      return [key?.trim(), rest.join('=').trim()];
    }),
  );

  const timestamp = parts.t;
  const providedSignature = livemode ? parts.li : parts.te;

  if (!timestamp || !providedSignature) {
    throw new BadRequestException('Malformed PayMongo webhook signature header.');
  }

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawPayload}`)
    .digest('hex');

  const providedBuffer = Buffer.from(providedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new BadRequestException('Invalid PayMongo webhook signature.');
  }
};
