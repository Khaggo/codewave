import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  buildPaymongoAuthToken,
  normalizePaymongoCheckoutSession,
  parsePaymongoJsonPayload,
  parsePaymongoWebhookEvent,
  PaymongoCheckoutSessionResult,
} from '@shared/payments/paymongo.util';

type ServiceInvoicePaymongoResult = PaymongoCheckoutSessionResult;

@Injectable()
export class JobOrderInvoicePaymongoService {
  constructor(private readonly configService: ConfigService) {}

  private getSecretKey() {
    return this.configService.get<string>('payments.paymongoSecretKey');
  }

  async createCheckoutSession(payload: {
    jobOrderId: string;
    invoiceRecordId: string;
    invoiceReference: string;
    amountCents: number;
    currencyCode: string;
    customerName: string;
    customerEmail: string | null;
  }): Promise<ServiceInvoicePaymongoResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      return {
        provider: 'paymongo',
        status: 'unavailable',
        providerPaymentId: null,
        checkoutUrl: null,
        referenceNumber: null,
        paidAt: null,
        failureReason: 'PayMongo payment gateway is unavailable.',
        metadata: {
          sourceType: 'service_invoice',
          jobOrderId: payload.jobOrderId,
          invoiceRecordId: payload.invoiceRecordId,
        },
      };
    }

    const successUrl = this.configService.get<string>('payments.paymongoCheckoutSuccessUrl');
    const cancelUrl = this.configService.get<string>('payments.paymongoCheckoutCancelUrl');
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${buildPaymongoAuthToken(secretKey)}`,
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
                name: `Service invoice ${payload.invoiceReference}`,
                quantity: 1,
              },
            ],
            payment_method_types: ['card', 'gcash', 'paymaya'],
            description: `Settlement for service invoice ${payload.invoiceReference}`,
            metadata: {
              sourceType: 'service_invoice',
              jobOrderId: payload.jobOrderId,
              invoiceRecordId: payload.invoiceRecordId,
              invoiceReference: payload.invoiceReference,
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
        provider: 'paymongo',
        status: 'failed',
        providerPaymentId: null,
        checkoutUrl: null,
        referenceNumber: null,
        paidAt: null,
        failureReason:
          data?.errors?.[0]?.detail ||
          data?.message ||
          'Unable to create the PayMongo service-invoice checkout session.',
        metadata: {
          sourceType: 'service_invoice',
          jobOrderId: payload.jobOrderId,
          invoiceRecordId: payload.invoiceRecordId,
        },
      };
    }

    return normalizePaymongoCheckoutSession({
      ...(data?.data?.attributes ?? {}),
      id: data?.data?.id ?? null,
    });
  }

  async retrieveCheckoutSession(providerPaymentId: string): Promise<ServiceInvoicePaymongoResult> {
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
          'Unable to retrieve the PayMongo service-invoice checkout session.',
        metadata: {},
      };
    }

    return normalizePaymongoCheckoutSession({
      ...(data?.data?.attributes ?? {}),
      id: data?.data?.id ?? providerPaymentId,
    });
  }

  parseWebhook(rawPayload: Buffer | string, signatureHeader?: string | null) {
    const webhookSecret =
      this.configService.get<string>('payments.paymongoServiceInvoiceWebhookSecret') ??
      this.configService.get<string>('payments.paymongoWebhookSecret');
    return parsePaymongoWebhookEvent(rawPayload, signatureHeader, webhookSecret);
  }
}
