import { Module, forwardRef } from '@nestjs/common';

import { BackJobsModule } from '@main-modules/back-jobs/back-jobs.module';
import { AuthModule } from '@main-modules/auth/auth.module';
import { BookingsModule } from '@main-modules/bookings/bookings.module';
import { QualityGatesModule } from '@main-modules/quality-gates/quality-gates.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { JobOrdersController } from './controllers/job-orders.controller';
import { JobOrdersRepository } from './repositories/job-orders.repository';
import { JobOrdersService } from './services/job-orders.service';

@Module({
  imports: [
    AuthModule,
    BookingsModule,
    UsersModule,
    VehiclesModule,
    forwardRef(() => BackJobsModule),
    forwardRef(() => QualityGatesModule),
  ],
  controllers: [JobOrdersController],
  providers: [JobOrdersRepository, JobOrdersService],
  exports: [JobOrdersRepository, JobOrdersService],
})
export class JobOrdersModule {}
