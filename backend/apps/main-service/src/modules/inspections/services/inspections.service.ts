import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { BookingsService } from '@main-modules/bookings/services/bookings.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

import { CreateInspectionDto } from '../dto/create-inspection.dto';
import { InspectionsRepository } from '../repositories/inspections.repository';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly inspectionsRepository: InspectionsRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly bookingsService: BookingsService,
  ) {}

  async create(vehicleId: string, payload: CreateInspectionDto) {
    await this.vehiclesService.findById(vehicleId);

    if (payload.bookingId) {
      const booking = await this.bookingsService.findById(payload.bookingId);
      if (booking.vehicleId !== vehicleId) {
        throw new ConflictException('Booking does not belong to the target vehicle');
      }
    }

    if (
      payload.inspectionType === 'completion' &&
      (payload.status ?? 'completed') === 'completed' &&
      (!payload.findings || payload.findings.length === 0)
    ) {
      throw new BadRequestException('Completion inspections require at least one finding');
    }

    return this.inspectionsRepository.create(vehicleId, payload);
  }

  async findByVehicleId(vehicleId: string) {
    await this.vehiclesService.findById(vehicleId);
    return this.inspectionsRepository.findByVehicleId(vehicleId);
  }
}
