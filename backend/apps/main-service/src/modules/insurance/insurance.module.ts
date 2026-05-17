import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { NotificationsModule } from '@main-modules/notifications/notifications.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { InsuranceController } from './controllers/insurance.controller';
import { InsuranceRepository } from './repositories/insurance.repository';
import { InsuranceDocumentStorageService } from './services/insurance-document-storage.service';
import { InsuranceService } from './services/insurance.service';

@Module({
  imports: [AuthModule, UsersModule, VehiclesModule, NotificationsModule],
  controllers: [InsuranceController],
  providers: [InsuranceRepository, InsuranceDocumentStorageService, InsuranceService],
  exports: [InsuranceRepository, InsuranceDocumentStorageService, InsuranceService],
})
export class InsuranceModule {}
