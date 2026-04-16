import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from '@shared/config/configuration';
import { validateEnv } from '@shared/config/env.validation';
import { DatabaseModule } from '@shared/db/database.module';
import { EventsModule } from '@shared/events/events.module';
import { QueueModule } from '@shared/queue/queue.module';
import { AuthModule } from '@main-modules/auth/auth.module';
import { AiWorkerModule } from '@main-modules/ai-worker/ai-worker.module';
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
import { UsersModule } from '@main-modules/users/users.module';
import { VehicleLifecycleModule } from '@main-modules/vehicle-lifecycle/vehicle-lifecycle.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

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
    JobOrdersModule,
    QualityGatesModule,
    InspectionsModule,
    VehicleLifecycleModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
