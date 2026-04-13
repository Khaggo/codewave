import { Module } from '@nestjs/common';

import { BookingsModule } from '@main-modules/bookings/bookings.module';
import { InspectionsModule } from '@main-modules/inspections/inspections.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { VehicleLifecycleController } from './controllers/vehicle-lifecycle.controller';
import { VehicleLifecycleRepository } from './repositories/vehicle-lifecycle.repository';
import { VehicleLifecycleService } from './services/vehicle-lifecycle.service';

@Module({
  imports: [VehiclesModule, BookingsModule, InspectionsModule],
  controllers: [VehicleLifecycleController],
  providers: [VehicleLifecycleRepository, VehicleLifecycleService],
  exports: [VehicleLifecycleRepository, VehicleLifecycleService],
})
export class VehicleLifecycleModule {}
