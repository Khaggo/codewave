import { BadRequestException, Injectable } from '@nestjs/common';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

import { AppendVehicleTimelineEventDto } from '../dto/append-vehicle-timeline-event.dto';
import { VehicleLifecycleRepository } from '../repositories/vehicle-lifecycle.repository';

@Injectable()
export class VehicleLifecycleService {
  constructor(
    private readonly vehicleLifecycleRepository: VehicleLifecycleRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly bookingsRepository: BookingsRepository,
    private readonly inspectionsRepository: InspectionsRepository,
  ) {}

  async findByVehicleId(vehicleId: string) {
    await this.vehiclesService.findById(vehicleId);
    await this.refreshVehicleTimeline(vehicleId);

    return this.vehicleLifecycleRepository.findByVehicleId(vehicleId);
  }

  async appendVehicleTimelineEvent(payload: AppendVehicleTimelineEventDto) {
    await this.vehiclesService.findById(payload.vehicleId);

    if (payload.verified) {
      if (!payload.inspectionId) {
        throw new BadRequestException('Verified lifecycle events require an inspection reference');
      }

      const inspection = await this.inspectionsRepository.findById(payload.inspectionId);
      if (inspection.vehicleId !== payload.vehicleId) {
        throw new BadRequestException('Inspection does not belong to the target vehicle');
      }
    }

    return this.vehicleLifecycleRepository.create(payload);
  }

  async refreshVehicleTimeline(vehicleId: string) {
    const [bookings, inspections] = await Promise.all([
      this.bookingsRepository.findByVehicleId(vehicleId),
      this.inspectionsRepository.findByVehicleId(vehicleId),
    ]);

    const bookingEvents = bookings.flatMap((booking) =>
      booking.statusHistory.map((statusEntry) => ({
        vehicleId,
        eventType:
          statusEntry.previousStatus === null
            ? 'booking_created'
            : statusEntry.nextStatus === 'rescheduled'
              ? 'booking_rescheduled'
              : `booking_${statusEntry.nextStatus}`,
        eventCategory: 'administrative' as const,
        sourceType: 'booking' as const,
        sourceId: booking.id,
        occurredAt: statusEntry.changedAt,
        verified: false,
        inspectionId: null,
        actorUserId: statusEntry.changedByUserId ?? null,
        notes: statusEntry.reason ?? null,
        dedupeKey: `booking:${booking.id}:history:${statusEntry.id}`,
      })),
    );

    const inspectionEvents = inspections.map((inspection) => ({
      vehicleId,
      eventType: `inspection_${inspection.inspectionType}_${inspection.status}`,
      eventCategory: inspection.status === 'completed' ? ('verified' as const) : ('administrative' as const),
      sourceType: 'inspection' as const,
      sourceId: inspection.id,
      occurredAt: inspection.createdAt,
      verified: inspection.status === 'completed',
      inspectionId: inspection.id,
      actorUserId: inspection.inspectorUserId ?? null,
      notes: inspection.notes ?? null,
      dedupeKey: `inspection:${inspection.id}:${inspection.status}`,
    }));

    const timelineEvents: AppendVehicleTimelineEventDto[] = [...bookingEvents, ...inspectionEvents].sort(
      (left, right) => {
        const occurredAtDiff = new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
        if (occurredAtDiff !== 0) {
          return occurredAtDiff;
        }

        return left.dedupeKey.localeCompare(right.dedupeKey);
      },
    );

    await this.vehicleLifecycleRepository.replaceForVehicle(vehicleId, timelineEvents);
    return timelineEvents;
  }
}
