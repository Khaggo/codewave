import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class SmtpMailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const secure = this.configService.get<boolean>('mail.secure');
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.pass');
    const from = this.configService.get<string>('mail.from');

    if (!host || !port || !from) {
      throw new InternalServerErrorException('SMTP mail transport is not configured');
    }

    if (!user || !pass) {
      throw new InternalServerErrorException('SMTP credentials are not configured');
    }

    this.from = from;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(payload: SendMailInput) {
    return this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });
  }
}
