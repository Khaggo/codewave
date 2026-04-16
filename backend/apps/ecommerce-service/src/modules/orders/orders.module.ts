import { Module } from '@nestjs/common';

import { CommerceEventsModule } from '@shared/events/commerce-events.module';
import { CartModule } from '@ecommerce-modules/cart/cart.module';
import { InvoicePaymentsModule } from '@ecommerce-modules/invoice-payments/invoice-payments.module';

import { OrdersController } from './controllers/orders.controller';
import { OrdersRepository } from './repositories/orders.repository';
import { OrdersService } from './services/orders.service';

@Module({
  imports: [CommerceEventsModule, CartModule, InvoicePaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
