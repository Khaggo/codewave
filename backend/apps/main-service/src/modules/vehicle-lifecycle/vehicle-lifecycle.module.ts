import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { BookingsModule } from '@main-modules/bookings/bookings.module';
import { InspectionsModule } from '@main-modules/inspections/inspections.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { VehicleLifecycleController } from './controllers/vehicle-lifecycle.controller';
import { VehicleLifecycleRepository } from './repositories/vehicle-lifecycle.repository';
import { VehicleLifecycleService } from './services/vehicle-lifecycle.service';
import { VehicleLifecycleSummaryProviderService } from './services/vehicle-lifecycle-summary-provider.service';

@Module({
  imports: [AuthModule, UsersModule, VehiclesModule, BookingsModule, InspectionsModule],
  controllers: [VehicleLifecycleController],
  providers: [
    VehicleLifecycleRepository,
    VehicleLifecycleSummaryProviderService,
    VehicleLifecycleService,
  ],
  exports: [VehicleLifecycleRepository, VehicleLifecycleService],
})
export class VehicleLifecycleModule {}
