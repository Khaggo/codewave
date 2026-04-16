import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { BackJobsModule } from '@main-modules/back-jobs/back-jobs.module';
import { BookingsModule } from '@main-modules/bookings/bookings.module';
import { InsuranceModule } from '@main-modules/insurance/insurance.module';
import { JobOrdersModule } from '@main-modules/job-orders/job-orders.module';
import { LoyaltyModule } from '@main-modules/loyalty/loyalty.module';
import { NotificationsModule } from '@main-modules/notifications/notifications.module';
import { QualityGatesModule } from '@main-modules/quality-gates/quality-gates.module';
import { UsersModule } from '@main-modules/users/users.module';

import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    BookingsModule,
    JobOrdersModule,
    InsuranceModule,
    BackJobsModule,
    LoyaltyModule,
    NotificationsModule,
    QualityGatesModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsRepository, AnalyticsService],
  exports: [AnalyticsRepository, AnalyticsService],
})
export class AnalyticsModule {}
