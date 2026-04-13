import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

import { AppendVehicleTimelineEventDto } from '../dto/append-vehicle-timeline-event.dto';
import { ReviewVehicleLifecycleSummaryDto } from '../dto/review-vehicle-lifecycle-summary.dto';
import { VehicleLifecycleRepository } from '../repositories/vehicle-lifecycle.repository';
import { VehicleLifecycleSummaryProviderService } from './vehicle-lifecycle-summary-provider.service';

type LifecycleActor = {
  userId: string;
  role: string;
};

@Injectable()
export class VehicleLifecycleService {
  constructor(
    private readonly vehicleLifecycleRepository: VehicleLifecycleRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly usersService: UsersService,
    private readonly bookingsRepository: BookingsRepository,
    private readonly inspectionsRepository: InspectionsRepository,
    private readonly vehicleLifecycleSummaryProvider: VehicleLifecycleSummaryProviderService,
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

  async generateLifecycleSummary(vehicleId: string, actor: LifecycleActor) {
    await this.assertReviewer(actor);
    const vehicle = await this.vehiclesService.findById(vehicleId);
    const timelineEvents = await this.refreshVehicleTimeline(vehicleId);

    if (!timelineEvents.length) {
      throw new ConflictException('Lifecycle summary generation requires at least one timeline event');
    }

    const { summaryText, provenance } = this.vehicleLifecycleSummaryProvider.generate({
      vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      timelineEvents: timelineEvents.map((event) => ({
        eventType: event.eventType,
        eventCategory: event.eventCategory,
        sourceType: event.sourceType,
        occurredAt: new Date(event.occurredAt),
        dedupeKey: event.dedupeKey,
      })),
    });

    return this.vehicleLifecycleRepository.createSummary({
      vehicleId,
      requestedByUserId: actor.userId,
      summaryText,
      provenance,
    });
  }

  async reviewLifecycleSummary(
    vehicleId: string,
    summaryId: string,
    payload: ReviewVehicleLifecycleSummaryDto,
    actor: LifecycleActor,
  ) {
    await this.assertReviewer(actor);
    await this.vehiclesService.findById(vehicleId);

    const summary = await this.vehicleLifecycleRepository.findSummaryById(summaryId);
    if (summary.vehicleId !== vehicleId) {
      throw new NotFoundException('Vehicle lifecycle summary not found');
    }

    if (summary.status !== 'pending_review') {
      throw new ConflictException('Vehicle lifecycle summary has already been reviewed');
    }

    const reviewedAt = new Date();
    return this.vehicleLifecycleRepository.reviewSummary(summaryId, {
      status: payload.decision,
      reviewNotes: payload.reviewNotes ?? null,
      reviewedByUserId: actor.userId,
      reviewedAt,
      customerVisible: payload.decision === 'approved',
      customerVisibleAt: payload.decision === 'approved' ? reviewedAt : null,
    });
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

  private async assertReviewer(actor: LifecycleActor) {
    const reviewer = await this.usersService.findById(actor.userId);
    if (!reviewer || !reviewer.isActive) {
      throw new NotFoundException('Lifecycle reviewer not found');
    }

    if (!['service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException('Only service advisers or super admins can manage lifecycle summaries');
    }

    return reviewer;
  }
}
