import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration from '@shared/config/configuration';
import { validateEnv } from '@shared/config/env.validation';
import { DatabaseModule } from '@shared/db/database.module';
import { EventsModule } from '@shared/events/events.module';
import { QueueModule } from '@shared/queue/queue.module';
import { AuthModule } from '@ecommerce-modules/auth/auth.module';
import { CartModule } from '@ecommerce-modules/cart/cart.module';
import { CatalogModule } from '@ecommerce-modules/catalog/catalog.module';
import { InventoryModule } from '@ecommerce-modules/inventory/inventory.module';
import { InvoicePaymentsModule } from '@ecommerce-modules/invoice-payments/invoice-payments.module';
import { OrdersModule } from '@ecommerce-modules/orders/orders.module';

import { HealthController } from './health.controller';

const isProduction = process.env.NODE_ENV?.trim().toLowerCase() === 'production';
const configuredGlobalThrottleLimit = Number.parseInt(process.env.API_GLOBAL_THROTTLE_LIMIT ?? '', 10);
const globalThrottleLimit =
  Number.isInteger(configuredGlobalThrottleLimit) && configuredGlobalThrottleLimit > 0
    ? configuredGlobalThrottleLimit
    : isProduction
      ? 1_200
      : 30_000;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
      ignoreEnvFile: isProduction,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: seconds(60),
        limit: globalThrottleLimit,
      },
    ]),
    DatabaseModule,
    QueueModule,
    EventsModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    InvoicePaymentsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
