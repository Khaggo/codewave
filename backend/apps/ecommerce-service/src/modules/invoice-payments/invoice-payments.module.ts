import { Module } from '@nestjs/common';

import { CommerceEventsModule } from '@shared/events/commerce-events.module';

import { InvoicePaymentsController } from './controllers/invoice-payments.controller';
import { InvoicePaymentsRepository } from './repositories/invoice-payments.repository';
import { InvoicePaymentsService } from './services/invoice-payments.service';

@Module({
  imports: [CommerceEventsModule],
  controllers: [InvoicePaymentsController],
  providers: [InvoicePaymentsRepository, InvoicePaymentsService],
  exports: [InvoicePaymentsRepository, InvoicePaymentsService],
})
export class InvoicePaymentsModule {}
