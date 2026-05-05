import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BookingReservationPaymentGatewayService {
  constructor(private readonly configService: ConfigService) {}

  async createReservationPayment(payload: {
    bookingId: string;
    amountCents: number;
    currencyCode: string;
    customerName: string;
    customerEmail: string;
  }) {
    const secretKey = this.configService.get<string>('payments.paymongoSecretKey');

    if (!secretKey) {
      return {
        provider: 'paymongo' as const,
        status: 'failed' as const,
        providerPaymentId: null,
        checkoutUrl: null,
        failureReason: 'Payment gateway is unavailable — manual counter confirmation is required.',
      };
    }

    const authToken = Buffer.from(`${secretKey}:`).toString('base64');
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
          },
        },
      }),
    });

    const rawText = await response.text();
    const data = rawText ? JSON.parse(rawText) : null;

    if (!response.ok) {
      return {
        provider: 'paymongo' as const,
        status: 'failed' as const,
        providerPaymentId: null,
        checkoutUrl: null,
        failureReason:
          data?.errors?.[0]?.detail ||
          data?.message ||
          'Payment gateway is unavailable — manual counter confirmation is required.',
      };
    }

    return {
      provider: 'paymongo' as const,
      status: 'pending' as const,
      providerPaymentId: data?.data?.id ?? null,
      checkoutUrl: data?.data?.attributes?.checkout_url ?? null,
      failureReason: null,
    };
  }
}
