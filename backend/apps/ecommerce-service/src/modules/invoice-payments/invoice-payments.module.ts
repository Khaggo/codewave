import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommerceEventsModule } from '@shared/events/commerce-events.module';

import { InvoicePaymentsController } from './controllers/invoice-payments.controller';
import { InvoicePaymentsRepository } from './repositories/invoice-payments.repository';
import { InvoicePaymentsPaymongoService } from './services/invoice-payments-paymongo.service';
import { InvoicePaymentsService } from './services/invoice-payments.service';

@Module({
  imports: [ConfigModule, CommerceEventsModule],
  controllers: [InvoicePaymentsController],
  providers: [InvoicePaymentsRepository, InvoicePaymentsPaymongoService, InvoicePaymentsService],
  exports: [InvoicePaymentsRepository, InvoicePaymentsService],
})
export class InvoicePaymentsModule {}
