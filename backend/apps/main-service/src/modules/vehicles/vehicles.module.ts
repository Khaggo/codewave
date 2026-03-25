import { Module } from '@nestjs/common';

import { UsersModule } from '@main-modules/users/users.module';

import { VehiclesController } from './controllers/vehicles.controller';
import { VehiclesRepository } from './repositories/vehicles.repository';
import { VehiclesService } from './services/vehicles.service';

@Module({
  imports: [UsersModule],
  controllers: [VehiclesController],
  providers: [VehiclesRepository, VehiclesService],
  exports: [VehiclesRepository, VehiclesService],
})
export class VehiclesModule {}
