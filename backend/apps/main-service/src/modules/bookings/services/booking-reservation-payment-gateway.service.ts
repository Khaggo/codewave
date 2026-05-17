import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildPaymongoAuthToken,
  normalizePaymongoCheckoutSession,
  parsePaymongoJsonPayload,
  parsePaymongoWebhookEvent,
  PaymongoCheckoutSessionResult,
} from '@shared/payments/paymongo.util';

type ReservationPaymentGatewayResult = PaymongoCheckoutSessionResult;

@Injectable()
export class BookingReservationPaymentGatewayService {
  constructor(private readonly configService: ConfigService) {}

  private getSecretKey() {
    return this.configService.get<string>('payments.paymongoSecretKey');
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

    const authToken = buildPaymongoAuthToken(secretKey);
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
    const data = parsePaymongoJsonPayload(rawText);

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
      ...normalizePaymongoCheckoutSession({
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
        metadata: {},
      };
    }

    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${providerPaymentId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${buildPaymongoAuthToken(secretKey)}`,
      },
    });

    const rawText = await response.text();
    const data = parsePaymongoJsonPayload(rawText);

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
        metadata: {},
      };
    }

    return normalizePaymongoCheckoutSession({
      ...(data?.data?.attributes ?? {}),
      id: data?.data?.id ?? providerPaymentId,
    });
  }

  parseReservationPaymentWebhook(
    rawPayload: Buffer | string,
    signatureHeader?: string | null,
  ) {
    const webhookSecret =
      this.configService.get<string>('payments.paymongoBookingWebhookSecret') ??
      this.configService.get<string>('payments.paymongoWebhookSecret');
    const event = parsePaymongoWebhookEvent(rawPayload, signatureHeader, webhookSecret);

    return {
      eventType: event.eventType,
      livemode: event.livemode,
      providerPaymentId: event.providerPaymentId,
      bookingId: typeof event.metadata.bookingId === 'string' ? event.metadata.bookingId : null,
      referenceNumber: event.referenceNumber,
      paidAt: event.paidAt,
      status: event.status,
      failureReason: event.failureReason,
    };
  }
}
