import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from '@shared/config/configuration';
import { validateEnv } from '@shared/config/env.validation';
import { DatabaseModule } from '@shared/db/database.module';
import { EventsModule } from '@shared/events/events.module';
import { QueueModule } from '@shared/queue/queue.module';
import { CartModule } from '@ecommerce-modules/cart/cart.module';
import { CatalogModule } from '@ecommerce-modules/catalog/catalog.module';
import { InventoryModule } from '@ecommerce-modules/inventory/inventory.module';
import { InvoicePaymentsModule } from '@ecommerce-modules/invoice-payments/invoice-payments.module';
import { OrdersModule } from '@ecommerce-modules/orders/orders.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    QueueModule,
    EventsModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    InvoicePaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
