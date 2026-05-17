import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
};

type ResendSendEmailResponse = {
  id?: string | null;
  error?: {
    message?: string;
  };
  message?: string;
};

@Injectable()
export class MailDeliveryService {
  private readonly apiKey?: string;
  private readonly fromEmail?: string;
  private readonly fromName?: string;
  private readonly replyTo?: string;
  private readonly requestTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('mail.apiKey');
    this.fromEmail = this.configService.get<string>('mail.fromEmail');
    this.fromName = this.configService.get<string>('mail.fromName');
    this.replyTo = this.configService.get<string>('mail.replyTo');
    this.requestTimeoutMs = this.configService.get<number>('mail.requestTimeoutMs', 15000);
  }

  async sendMail(payload: SendMailInput): Promise<{ messageId?: string | null }> {
    this.assertConfigured();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.buildFromIdentity(),
          to: [payload.to],
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          reply_to: this.replyTo,
          attachments: payload.attachments?.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content.toString('base64'),
            content_type: attachment.contentType,
          })),
        }),
        signal: controller.signal,
      });

      const responseBody = (await response.json().catch(() => null)) as ResendSendEmailResponse | null;
      if (!response.ok) {
        throw new Error(this.mapResendError(response.status, responseBody));
      }

      return {
        messageId: responseBody?.id ?? null,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Resend delivery timed out');
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Resend delivery failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  private assertConfigured() {
    if (!this.apiKey?.trim()) {
      throw new Error('Resend mail transport is not configured');
    }

    if (!this.fromEmail?.trim()) {
      throw new Error('Resend sender email is not configured');
    }
  }

  private buildFromIdentity() {
    const normalizedEmail = this.fromEmail!.trim();
    const normalizedName = this.fromName?.trim();
    return normalizedName ? `${normalizedName} <${normalizedEmail}>` : normalizedEmail;
  }

  private mapResendError(status: number, responseBody: ResendSendEmailResponse | null) {
    const providerMessage =
      responseBody?.error?.message?.trim() ||
      responseBody?.message?.trim() ||
      null;

    if (status === 400 || status === 422) {
      if (providerMessage?.toLowerCase().includes('from')) {
        return `Invalid sender configuration: ${providerMessage}`;
      }

      return providerMessage
        ? `Message rejected by Resend: ${providerMessage}`
        : 'Message rejected by Resend';
    }

    if (status === 401 || status === 403) {
      return providerMessage
        ? `Resend rejected the configured credentials: ${providerMessage}`
        : 'Resend rejected the configured credentials';
    }

    if (status === 408 || status === 429 || status >= 500) {
      return providerMessage
        ? `Resend is unavailable right now: ${providerMessage}`
        : 'Resend is unavailable right now';
    }

    return providerMessage ? `Resend delivery failed: ${providerMessage}` : 'Resend delivery failed';
  }
}
