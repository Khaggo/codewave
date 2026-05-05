import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const nodemailer = require('nodemailer') as {
  createTransport: (options: {
    host: string;
    port: number;
    secure: boolean;
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
    auth: {
      user: string;
      pass: string;
    };
  }) => {
    sendMail: (payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html?: string;
      attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType?: string;
      }>;
    }) => Promise<{ messageId?: string | null }>;
  };
};

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

@Injectable()
export class SmtpMailService {
  private readonly transporter: ReturnType<typeof nodemailer.createTransport>;
  private readonly from: string;
  private readonly socketTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const secure = this.configService.get<boolean>('mail.secure');
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.pass');
    const from = this.configService.get<string>('mail.from');
    const connectionTimeoutMs = this.configService.get<number>('mail.connectionTimeoutMs', 10000);
    const greetingTimeoutMs = this.configService.get<number>('mail.greetingTimeoutMs', 10000);
    const socketTimeoutMs = this.configService.get<number>('mail.socketTimeoutMs', 15000);

    if (!host || !port || !from) {
      throw new InternalServerErrorException('SMTP mail transport is not configured');
    }

    if (!user || !pass) {
      throw new InternalServerErrorException('SMTP credentials are not configured');
    }

    this.from = from;
    this.socketTimeoutMs = socketTimeoutMs;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? false,
      connectionTimeout: connectionTimeoutMs,
      greetingTimeout: greetingTimeoutMs,
      socketTimeout: socketTimeoutMs,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(payload: SendMailInput): Promise<{ messageId?: string | null }> {
    return withTimeout(
      this.transporter.sendMail({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        attachments: payload.attachments,
      }),
      this.socketTimeoutMs + 1000,
      'SMTP delivery timed out',
    );
  }
}
