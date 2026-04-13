import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { InspectionsModule } from '@main-modules/inspections/inspections.module';
import { JobOrdersModule } from '@main-modules/job-orders/job-orders.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { BackJobsController } from './controllers/back-jobs.controller';
import { BackJobsRepository } from './repositories/back-jobs.repository';
import { BackJobsService } from './services/back-jobs.service';

@Module({
  imports: [AuthModule, UsersModule, VehiclesModule, InspectionsModule, forwardRef(() => JobOrdersModule)],
  controllers: [BackJobsController],
  providers: [BackJobsRepository, BackJobsService],
  exports: [BackJobsRepository, BackJobsService],
})
export class BackJobsModule {}
