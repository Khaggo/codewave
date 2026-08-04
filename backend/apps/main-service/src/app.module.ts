import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration from '@shared/config/configuration';
import { validateEnv } from '@shared/config/env.validation';
import { DatabaseModule } from '@shared/db/database.module';
import { EventsModule } from '@shared/events/events.module';
import { QueueModule } from '@shared/queue/queue.module';
import { AuthModule } from '@main-modules/auth/auth.module';
import { AiWorkerModule } from '@main-modules/ai-worker/ai-worker.module';
import { AccessoriesModule } from '@main-modules/accessories/accessories.module';
import { AnalyticsModule } from '@main-modules/analytics/analytics.module';
import { BackJobsModule } from '@main-modules/back-jobs/back-jobs.module';
import { BookingsModule } from '@main-modules/bookings/bookings.module';
import { ChatbotModule } from '@main-modules/chatbot/chatbot.module';
import { InsuranceModule } from '@main-modules/insurance/insurance.module';
import { InspectionsModule } from '@main-modules/inspections/inspections.module';
import { JobOrdersModule } from '@main-modules/job-orders/job-orders.module';
import { LoyaltyModule } from '@main-modules/loyalty/loyalty.module';
import { NotificationsModule } from '@main-modules/notifications/notifications.module';
import { QualityGatesModule } from '@main-modules/quality-gates/quality-gates.module';
import { StaffWorkQueuesModule } from '@main-modules/staff-work-queues/staff-work-queues.module';
import { TechnicianProfilesModule } from '@main-modules/technician-profiles/technician-profiles.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehicleLifecycleModule } from '@main-modules/vehicle-lifecycle/vehicle-lifecycle.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { HealthController } from './health.controller';
import { HealthReadinessService } from './health-readiness.service';

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
    AccessoriesModule,
    AiWorkerModule,
    AnalyticsModule,
    UsersModule,
    AuthModule,
    VehiclesModule,
    BookingsModule,
    ChatbotModule,
    BackJobsModule,
    InsuranceModule,
    NotificationsModule,
    LoyaltyModule,
    TechnicianProfilesModule,
    JobOrdersModule,
    QualityGatesModule,
    StaffWorkQueuesModule,
    InspectionsModule,
    VehicleLifecycleModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthReadinessService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
