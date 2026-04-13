import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { InsuranceController } from './controllers/insurance.controller';
import { InsuranceRepository } from './repositories/insurance.repository';
import { InsuranceService } from './services/insurance.service';

@Module({
  imports: [AuthModule, UsersModule, VehiclesModule],
  controllers: [InsuranceController],
  providers: [InsuranceRepository, InsuranceService],
  exports: [InsuranceRepository, InsuranceService],
})
export class InsuranceModule {}
