import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { NotificationsModule } from '@main-modules/notifications/notifications.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { BOOKINGS_CLOCK } from './bookings.constants';
import { BookingsController } from './controllers/bookings.controller';
import { BookingsRepository } from './repositories/bookings.repository';
import { BookingsService } from './services/bookings.service';
import { BookingReservationPaymentGatewayService } from './services/booking-reservation-payment-gateway.service';

@Module({
  imports: [AuthModule, UsersModule, VehiclesModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [
    BookingsRepository,
    BookingReservationPaymentGatewayService,
    BookingsService,
    {
      provide: BOOKINGS_CLOCK,
      useValue: {
        now: () => new Date(),
      },
    },
  ],
  exports: [BookingsRepository, BookingsService],
})
export class BookingsModule {}
