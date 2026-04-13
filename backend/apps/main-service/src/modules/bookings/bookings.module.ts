import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { BookingsController } from './controllers/bookings.controller';
import { BookingsRepository } from './repositories/bookings.repository';
import { BookingsService } from './services/bookings.service';

@Module({
  imports: [AuthModule, UsersModule, VehiclesModule],
  controllers: [BookingsController],
  providers: [BookingsRepository, BookingsService],
  exports: [BookingsRepository, BookingsService],
})
export class BookingsModule {}
