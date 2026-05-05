import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type ReservationPaymentGatewayResult = {
  provider: 'paymongo';
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'unavailable';
  providerPaymentId: string | null;
  checkoutUrl: string | null;
  referenceNumber: string | null;
  paidAt: Date | null;
  failureReason: string | null;
};

@Injectable()
export class BookingReservationPaymentGatewayService {
  constructor(private readonly configService: ConfigService) {}

  private getSecretKey() {
    return this.configService.get<string>('payments.paymongoSecretKey');
  }

  private buildAuthToken(secretKey: string) {
    return Buffer.from(`${secretKey}:`).toString('base64');
  }

  private parseJsonPayload(rawText: string) {
    if (!rawText) {
      return null;
    }

    try {
      return JSON.parse(rawText);
    } catch {
      return null;
    }
  }

  private toDateOrNull(value: unknown) {
    if (!value) {
      return null;
    }

    if (typeof value === 'number') {
      return new Date(value * 1000);
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeCheckoutSession(attributes: Record<string, any> | null | undefined): ReservationPaymentGatewayResult {
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

    let status: ReservationPaymentGatewayResult['status'] = 'pending';
    let failureReason: string | null = null;

    if (paidPayment || ['succeeded', 'paid'].includes(String(paymentIntent?.status ?? '').toLowerCase())) {
      status = 'paid';
    } else if (
      String(attributes?.status ?? '').toLowerCase() === 'expired' ||
      ['cancelled', 'canceled', 'expired'].includes(String(paymentIntent?.status ?? '').toLowerCase())
    ) {
      status = 'expired';
      failureReason = 'The PayMongo checkout session expired before payment was completed.';
    } else if (paymentStatuses.includes('failed')) {
      status = 'failed';
      failureReason =
        failedPayment?.last_payment_error?.message ??
        failedPayment?.last_payment_error?.detail ??
        'PayMongo reported that the reservation-fee payment failed.';
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
      paidAt: this.toDateOrNull(paidPayment?.paid_at),
      failureReason,
    };
  }

  async createReservationPayment(payload: {
    bookingId: string;
    amountCents: number;
    currencyCode: string;
    customerName: string;
    customerEmail: string;
  }) {
    const secretKey = this.getSecretKey();

    if (!secretKey) {
      return {
        provider: 'paymongo' as const,
        status: 'failed' as const,
        providerPaymentId: null,
        checkoutUrl: null,
        referenceNumber: null,
        paidAt: null,
        failureReason: 'Payment gateway is unavailable — manual counter confirmation is required.',
      };
    }

    const authToken = this.buildAuthToken(secretKey);
    const successUrl = this.configService.get<string>('payments.paymongoCheckoutSuccessUrl');
    const cancelUrl = this.configService.get<string>('payments.paymongoCheckoutCancelUrl');
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            line_items: [
              {
                currency: payload.currencyCode.toUpperCase(),
                amount: payload.amountCents,
                name: `Booking reservation fee ${payload.bookingId}`,
                quantity: 1,
              },
            ],
            payment_method_types: ['card', 'gcash', 'paymaya'],
            description: `Reservation fee for booking ${payload.bookingId}`,
            metadata: {
              bookingId: payload.bookingId,
              customerName: payload.customerName,
              customerEmail: payload.customerEmail,
            },
            success_url: successUrl || undefined,
            cancel_url: cancelUrl || undefined,
          },
        },
      }),
    });

    const rawText = await response.text();
    const data = this.parseJsonPayload(rawText);

    if (!response.ok) {
      return {
        provider: 'paymongo' as const,
        status: 'failed' as const,
        providerPaymentId: null,
        checkoutUrl: null,
        referenceNumber: null,
        paidAt: null,
        failureReason:
          data?.errors?.[0]?.detail ||
          data?.message ||
          'Payment gateway is unavailable — manual counter confirmation is required.',
      };
    }

    return {
      ...this.normalizeCheckoutSession({
        ...(data?.data?.attributes ?? {}),
        id: data?.data?.id ?? null,
      }),
    };
  }

  async retrieveReservationPayment(providerPaymentId: string): Promise<ReservationPaymentGatewayResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return {
        provider: 'paymongo',
        status: 'unavailable',
        providerPaymentId,
        checkoutUrl: null,
        referenceNumber: null,
        paidAt: null,
        failureReason: 'PayMongo secret key is not configured.',
      };
    }

    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${providerPaymentId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${this.buildAuthToken(secretKey)}`,
      },
    });

    const rawText = await response.text();
    const data = this.parseJsonPayload(rawText);

    if (!response.ok) {
      return {
        provider: 'paymongo',
        status: 'unavailable',
        providerPaymentId,
        checkoutUrl: null,
        referenceNumber: null,
        paidAt: null,
        failureReason:
          data?.errors?.[0]?.detail ||
          data?.message ||
          'Unable to retrieve the PayMongo checkout session.',
      };
    }

    return this.normalizeCheckoutSession({
      ...(data?.data?.attributes ?? {}),
      id: data?.data?.id ?? providerPaymentId,
    });
  }

  parseReservationPaymentWebhook(
    rawPayload: Buffer | string,
    signatureHeader?: string | null,
  ) {
    const payloadText = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : String(rawPayload ?? '');
    const payload = this.parseJsonPayload(payloadText);
    const eventAttributes = payload?.data?.attributes;

    if (!eventAttributes?.type) {
      throw new BadRequestException('Invalid PayMongo webhook payload.');
    }

    this.assertValidWebhookSignature(payloadText, signatureHeader, Boolean(eventAttributes.livemode));

    const checkoutSession = eventAttributes?.data;
    const checkoutAttributes = checkoutSession?.attributes ?? {};
    const normalized = this.normalizeCheckoutSession({
      ...checkoutAttributes,
      id: checkoutSession?.id ?? null,
    });

    return {
      eventType: String(eventAttributes.type),
      livemode: Boolean(eventAttributes.livemode),
      providerPaymentId: checkoutSession?.id ?? null,
      bookingId: checkoutAttributes?.metadata?.bookingId ?? null,
      referenceNumber: normalized.referenceNumber,
      paidAt: normalized.paidAt,
      status: normalized.status,
      failureReason: normalized.failureReason,
    };
  }

  private assertValidWebhookSignature(
    rawPayload: string,
    signatureHeader: string | null | undefined,
    livemode: boolean,
  ) {
    const webhookSecret = this.configService.get<string>('payments.paymongoWebhookSecret');
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
  }
}
