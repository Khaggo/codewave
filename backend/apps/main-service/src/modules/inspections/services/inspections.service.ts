import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';

import { BookingsService } from '@main-modules/bookings/services/bookings.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

import { CreateInspectionDto } from '../dto/create-inspection.dto';
import { UploadInspectionPhotoDto } from '../dto/upload-inspection-photo.dto';
import { InspectionsRepository } from '../repositories/inspections.repository';
import { InspectionEvidenceStorageService } from './inspection-evidence-storage.service';

export type InspectionUploadFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

type InspectionActor = {
  userId: string;
  role: string;
};

@Injectable()
export class InspectionsService {
  constructor(
    private readonly inspectionsRepository: InspectionsRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly bookingsService: BookingsService,
    private readonly inspectionEvidenceStorageService: InspectionEvidenceStorageService,
  ) {}

  async create(vehicleId: string, payload: CreateInspectionDto, actor?: InspectionActor) {
    if (actor) {
      this.assertInspectionActor(actor);
    }
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

  async findByVehicleId(vehicleId: string, actor?: InspectionActor) {
    if (actor) {
      this.assertInspectionActor(actor);
    }
    await this.vehiclesService.findById(vehicleId);
    return this.inspectionsRepository.findByVehicleId(vehicleId);
  }

  async uploadPhoto(
    vehicleId: string,
    payload: UploadInspectionPhotoDto,
    file: InspectionUploadFile,
    actor?: InspectionActor,
  ) {
    if (actor) {
      this.assertInspectionActor(actor);
    }
    await this.vehiclesService.findById(vehicleId);

    if (!file?.buffer?.length) {
      throw new BadRequestException('An image upload is required');
    }

    if (!String(file.mimetype).startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported for inspection evidence');
    }

    const slot = payload.slot?.trim() || 'general';
    const persistedFile = await this.inspectionEvidenceStorageService.saveImage({
      vehicleId,
      slot,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    return {
      slot: persistedFile.slot,
      attachmentRef: persistedFile.attachmentRef,
      storageKey: persistedFile.storageKey,
    };
  }

  private assertInspectionActor(actor: InspectionActor) {
    if (!['technician', 'service_adviser', 'super_admin'].includes(actor.role)) {
      throw new ForbiddenException(
        'Only technicians, service advisers, or super admins can access inspection records',
      );
    }
  }
}
