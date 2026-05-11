import { Module } from '@nestjs/common';

import { BookingsModule } from '@main-modules/bookings/bookings.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { InspectionsController } from './controllers/inspections.controller';
import { InspectionsRepository } from './repositories/inspections.repository';
import { InspectionEvidenceStorageService } from './services/inspection-evidence-storage.service';
import { InspectionsService } from './services/inspections.service';

@Module({
  imports: [VehiclesModule, BookingsModule],
  controllers: [InspectionsController],
  providers: [InspectionsRepository, InspectionEvidenceStorageService, InspectionsService],
  exports: [InspectionsRepository, InspectionEvidenceStorageService, InspectionsService],
})
export class InspectionsModule {}
