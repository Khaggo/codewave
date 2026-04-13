import { BackJobsModule } from '@main-modules/back-jobs/back-jobs.module';
import { BookingsModule } from '@main-modules/bookings/bookings.module';
import { InspectionsModule } from '@main-modules/inspections/inspections.module';
import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { JobOrdersModule } from '@main-modules/job-orders/job-orders.module';
import { UsersModule } from '@main-modules/users/users.module';

import { QUALITY_GATES_QUEUE_NAME } from './quality-gates.constants';
import { QualityGatesController } from './controllers/quality-gates.controller';
import { QualityGatesRepository } from './repositories/quality-gates.repository';
import { QualityGatesProcessor } from './quality-gates.processor';
import { QualityGateDiscrepancyEngineService } from './services/quality-gate-discrepancy-engine.service';
import { QualityGateSemanticAuditorService } from './services/quality-gate-semantic-auditor.service';
import { QualityGatesService } from './services/quality-gates.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    BookingsModule,
    InspectionsModule,
    forwardRef(() => BackJobsModule),
    forwardRef(() => JobOrdersModule),
    BullModule.registerQueue({ name: QUALITY_GATES_QUEUE_NAME }),
  ],
  controllers: [QualityGatesController],
  providers: [
    QualityGatesRepository,
    QualityGateDiscrepancyEngineService,
    QualityGateSemanticAuditorService,
    QualityGatesService,
    QualityGatesProcessor,
  ],
  exports: [QualityGatesRepository, QualityGatesService],
})
export class QualityGatesModule {}
