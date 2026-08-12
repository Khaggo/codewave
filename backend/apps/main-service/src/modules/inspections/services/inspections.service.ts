import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';

import { BookingsService } from '@main-modules/bookings/services/bookings.service';
import { LoyaltyService } from '@main-modules/loyalty/services/loyalty.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';
import { AppDatabaseExecutor } from '@shared/db/database.types';

import { CreateInspectionDto } from '../dto/create-inspection.dto';
import {
  InspectionHistoryQueryDto,
  SaveIntakeInspectionDraftDto,
} from '../dto/intake-inspection.dto';
import { UploadInspectionPhotoDto } from '../dto/upload-inspection-photo.dto';
import { InspectionsRepository } from '../repositories/inspections.repository';
import { InspectionEvidenceStorageService } from './inspection-evidence-storage.service';

export type InspectionUploadFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size?: number;
};

const INSPECTION_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

type InspectionActor = {
  userId: string;
  role: string;
};

type IntakeBookingRecord = {
  id?: string;
  vehicleId?: string;
  userId?: string;
  status?: string;
  reasonForVisits?: unknown;
  reasonForVisit?: unknown;
  visitReason?: unknown;
  requestedServices?: unknown[];
};

const arrivalInspectionKeys = [
  'batteryCondition',
  'engineOilLevel',
  'coolantLevel',
  'tirePressure',
  'allLightsFunctional',
  'brakePedalFeel',
] as const;

const intakeRequirementKeysByVisitType = {
  regular_service: ['customerContactConfirmed', 'authorizationAcknowledged', 'keysHandoffConfirmed'],
  insurance_related: [
    'customerContactConfirmed',
    'authorizationAcknowledged',
    'keysHandoffConfirmed',
    'insuranceDocumentsPresent',
  ],
  back_job_complaint: [
    'customerContactConfirmed',
    'authorizationAcknowledged',
    'keysHandoffConfirmed',
    'backJobDocumentsPresent',
  ],
  inspection_only: ['customerContactConfirmed', 'authorizationAcknowledged', 'keysHandoffConfirmed'],
} as const;

const trimIntakeText = (value: unknown) => String(value ?? '').trim();

const normalizeIntakeStringList = (value: unknown, maxItems: number, maxLength: number) =>
  [...new Set(
    (Array.isArray(value) ? value : [])
      .map(trimIntakeText)
      .filter(Boolean),
  )].slice(0, maxItems).map((item) => item.slice(0, maxLength));

const normalizeOptionalIntakeStringList = (value: unknown, maxItems: number, maxLength: number) => {
  const normalized = normalizeIntakeStringList(value, maxItems, maxLength);
  return normalized.length ? normalized : undefined;
};

const normalizeIntakeConcerns = (value: unknown, legacySummary?: unknown) => {
  const source = Array.isArray(value)
    ? value
    : trimIntakeText(legacySummary)
      ? [{ id: 'legacy-1', text: trimIntakeText(legacySummary) }]
      : [];
  return source
    .map((concern: any, index) => ({
      id: trimIntakeText(concern?.id) || `concern-${index + 1}`,
      text: trimIntakeText(concern?.text),
    }))
    .filter((concern) => concern.text)
    .slice(0, 10);
};

const normalizeBookingServices = (booking?: IntakeBookingRecord) =>
  (Array.isArray(booking?.requestedServices) ? booking.requestedServices : [])
    .map((entry: any) => entry?.service ?? entry)
    .map((service: any) => ({
      id: trimIntakeText(service?.id ?? service?.serviceId),
      name: trimIntakeText(service?.name ?? service?.serviceName ?? service?.label),
    }))
    .filter((service) => service.id || service.name);

const sameStringSet = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

@Injectable()
export class InspectionsService {
  constructor(
    private readonly inspectionsRepository: InspectionsRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly bookingsService: BookingsService,
    private readonly inspectionEvidenceStorageService: InspectionEvidenceStorageService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async create(vehicleId: string, payload: CreateInspectionDto, actor: InspectionActor) {
    this.assertInspectionActor(actor);
    const vehicle = await this.vehiclesService.findById(vehicleId);

    const booking = payload.bookingId
      ? ((await this.bookingsService.findById(payload.bookingId)) as IntakeBookingRecord)
      : undefined;
    if (booking) {
      if (booking.vehicleId !== vehicleId) {
        throw new ConflictException('Booking does not belong to the target vehicle');
      }
      if (booking.userId !== vehicle.userId) {
        throw new ConflictException('Booking customer does not own the target vehicle');
      }
      if (!['confirmed', 'in_service'].includes(String(booking.status))) {
        throw new ConflictException('Booking is not eligible for workshop intake');
      }
    }

    if (
      payload.inspectionType === 'completion' &&
      (payload.status ?? 'completed') === 'completed' &&
      (!payload.findings || payload.findings.length === 0)
    ) {
      throw new BadRequestException('Completion inspections require at least one finding');
    }

    if (
      payload.inspectionType === 'intake' &&
      (payload.status ?? 'completed') === 'completed'
    ) {
      this.assertCompletedIntake({
        bookingId: payload.bookingId,
        intakeData: payload.intakeData as SaveIntakeInspectionDraftDto['intakeData'],
        notes: payload.notes,
      }, booking);
      if (payload.intakeDataVersion !== 1) {
        throw new BadRequestException('Completed intake requires intakeDataVersion 1');
      }
    }

    const isCompletedIntake =
      payload.inspectionType === 'intake' && (payload.status ?? 'completed') === 'completed';
    if (isCompletedIntake) {
      await this.loyaltyService.assertCanRecordVehicleStickerObservation(actor.userId);
    }
    const completedAt = new Date();
    const created = isCompletedIntake
      ? await this.inspectionsRepository.withTransaction(async (tx) => {
          const inspection = await this.inspectionsRepository.create(
            vehicleId,
            payload,
            actor.userId,
            tx,
            completedAt,
          );
          await this.recordStickerObservation(inspection, vehicleId, actor.userId, tx);
          return inspection;
        })
      : await this.inspectionsRepository.create(vehicleId, payload, actor.userId);
    return this.toInspectionResponse(created);
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
    _payload: UploadInspectionPhotoDto,
    _file: InspectionUploadFile,
    actor: InspectionActor,
  ) {
    this.assertInspectionActor(actor);
    await this.vehiclesService.findById(vehicleId);
    throw new BadRequestException('Create an intake draft before uploading evidence to it');
  }

  async createIntakeDraft(
    vehicleId: string,
    payload: SaveIntakeInspectionDraftDto,
    actor: InspectionActor,
  ) {
    this.assertInspectionActor(actor);
    const vehicle = await this.vehiclesService.findById(vehicleId);
    const booking = await this.assertIntakeBooking(vehicle.id, vehicle.userId, payload);
    this.assertDraftArrivalContext(payload);

    const inspection = await this.inspectionsRepository.createIntakeDraft(
      vehicleId,
      this.normalizeIntakePayload(payload, booking),
      actor.userId,
    );
    return this.toInspectionResponse(inspection);
  }

  async updateIntakeDraft(
    inspectionId: string,
    payload: SaveIntakeInspectionDraftDto,
    ifMatch: string | undefined,
    actor: InspectionActor,
  ) {
    this.assertInspectionActor(actor);
    const expectedVersion = this.parseIfMatch(ifMatch);
    const inspection = await this.inspectionsRepository.findById(inspectionId);
    if (inspection.inspectionType !== 'intake' || inspection.status !== 'pending') {
      throw new ConflictException('Only pending intake drafts can be updated');
    }
    if (inspection.version !== expectedVersion) {
      throw new PreconditionFailedException('The intake draft changed. Reload it before saving again.');
    }
    this.assertImmutableBookedIntakeContext(inspection, payload);
    const vehicle = await this.vehiclesService.findById(inspection.vehicleId);
    const booking = await this.assertIntakeBooking(vehicle.id, vehicle.userId, payload);
    this.assertDraftArrivalContext(payload);

    const updated = await this.inspectionsRepository.updateIntakeDraft(
      inspectionId,
      expectedVersion,
      this.normalizeIntakePayload(payload, booking),
      actor.userId,
    );
    if (!updated) {
      throw new PreconditionFailedException('The intake draft changed. Reload it before saving again.');
    }
    return this.toInspectionResponse(updated);
  }

  async completeIntakeDraft(
    inspectionId: string,
    ifMatch: string | undefined,
    actor: InspectionActor,
  ) {
    this.assertInspectionActor(actor);
    const expectedVersion = this.parseIfMatch(ifMatch);
    const inspection = await this.inspectionsRepository.findById(inspectionId);
    if (inspection.inspectionType !== 'intake') {
      throw new ConflictException('Only intake inspections can use this completion route');
    }
    if (inspection.version !== expectedVersion) {
      throw new PreconditionFailedException('The intake draft changed. Reload it before completing.');
    }
    if (inspection.status !== 'pending') {
      throw new ConflictException('This intake inspection cannot be completed from its current state');
    }

    const vehicle = await this.vehiclesService.findById(inspection.vehicleId);
    const payload = {
      bookingId: inspection.bookingId ?? undefined,
      intakeData: (inspection.intakeData ?? {}) as unknown as SaveIntakeInspectionDraftDto['intakeData'],
      notes: inspection.notes ?? undefined,
    };
    const booking = await this.assertIntakeBooking(vehicle.id, vehicle.userId, payload);
    if (inspection.intakeDataVersion !== 1) {
      throw new BadRequestException('Completed intake requires intakeDataVersion 1');
    }
    this.assertCompletedIntake(payload, booking);
    await this.loyaltyService.assertCanRecordVehicleStickerObservation(actor.userId);

    const completedAt = new Date();
    const completed = await this.inspectionsRepository.withTransaction(async (tx) => {
      const updated = await this.inspectionsRepository.completeIntakeDraft(
        inspectionId,
        expectedVersion,
        actor.userId,
        completedAt,
        tx,
      );
      if (!updated) {
        throw new PreconditionFailedException(
          'The intake draft changed. Reload it before completing.',
        );
      }
      await this.recordStickerObservation(updated, vehicle.id, actor.userId, tx);
      return updated;
    });
    return this.toInspectionResponse(completed);
  }

  private async recordStickerObservation(
    inspection: {
      id: string;
      inspectionReference: string;
      intakeData?: Record<string, unknown> | null;
      completedAt?: Date | null;
    },
    vehicleId: string,
    verifiedByUserId: string,
    db: AppDatabaseExecutor,
  ) {
    const intakeData = inspection.intakeData ?? {};
    const observation = intakeData.stickerObservation;
    if (!['verified_present', 'not_present'].includes(String(observation))) {
      throw new BadRequestException('Completed intake requires a sticker observation');
    }

    await this.loyaltyService.recordVehicleStickerObservation({
      vehicleId,
      inspectionId: inspection.id,
      intakeReference: inspection.inspectionReference,
      observation: observation as 'verified_present' | 'not_present',
      verifiedByUserId,
      observedAt: inspection.completedAt ?? new Date(),
      reason:
        typeof intakeData.stickerObservationReason === 'string'
          ? intakeData.stickerObservationReason.trim() || null
          : null,
    }, db, true);
  }

  async findHistoryPage(
    vehicleId: string,
    query: InspectionHistoryQueryDto,
    actor: InspectionActor,
  ) {
    this.assertInspectionActor(actor);
    await this.vehiclesService.findById(vehicleId);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 25);
    const page = await this.inspectionsRepository.findHistoryPage({
      vehicleId,
      limit,
      status: query.status,
      cursor: this.decodeHistoryCursor(query.cursor),
    });
    const items = page.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items: items.map((inspection) => this.toInspectionResponse(inspection)),
      page: {
        limit,
        hasNext: page.length > limit,
        nextCursor:
          page.length > limit && last
            ? Buffer.from(
                JSON.stringify({ version: 1, createdAt: last.createdAt.toISOString(), id: last.id }),
              ).toString('base64url')
            : null,
      },
    };
  }

  async findDrafts(bookingId: string | undefined, actor: InspectionActor) {
    this.assertInspectionActor(actor);
    if (!bookingId) {
      throw new BadRequestException('bookingId is required to recover a booked intake draft');
    }
    const booking = await this.bookingsService.findById(bookingId);
    if (!['confirmed', 'in_service'].includes(booking.status)) {
      return { items: [] };
    }
    const draft = await this.inspectionsRepository.findPendingIntakeByBookingId(bookingId);
    return { items: draft ? [this.toInspectionResponse(draft)] : [] };
  }

  async uploadEvidence(
    inspectionId: string,
    payload: UploadInspectionPhotoDto,
    file: InspectionUploadFile,
    actor: InspectionActor,
  ) {
    this.assertInspectionActor(actor);
    const inspection = await this.inspectionsRepository.findById(inspectionId);
    if (inspection.status !== 'pending') {
      throw new ConflictException('Evidence can only be added to a pending inspection draft');
    }
    if (
      !file?.buffer?.length ||
      file.buffer.length > INSPECTION_UPLOAD_MAX_BYTES ||
      !String(file.mimetype).startsWith('image/')
    ) {
      throw new BadRequestException('A supported image upload is required');
    }

    const persisted = await this.inspectionEvidenceStorageService.saveImage({
      vehicleId: inspection.vehicleId,
      slot: payload.slot?.trim() || 'general',
      mimeType: file.mimetype,
      buffer: file.buffer,
    });
    const evidence = await this.inspectionsRepository.createEvidence({
      inspectionId,
      slot: persisted.slot,
      originalName: this.normalizeOriginalName(file.originalname),
      mimeType: persisted.mimeType,
      byteSize: persisted.byteSize,
      storageKey: persisted.storageKey,
      createdByUserId: actor.userId,
    });
    return this.toEvidenceResponse(inspectionId, evidence);
  }

  async readEvidence(inspectionId: string, evidenceId: string, actor: InspectionActor) {
    this.assertInspectionActor(actor);
    await this.inspectionsRepository.findById(inspectionId);
    const evidence = await this.inspectionsRepository.findEvidence(inspectionId, evidenceId);
    if (!evidence) {
      throw new NotFoundException('Inspection evidence not found');
    }
    const storedFile = await this.inspectionEvidenceStorageService.readImage(evidence.storageKey);
    return {
      stream: storedFile.stream,
      mimeType: evidence.mimeType,
      fileName: evidence.originalName,
      byteSize: storedFile.byteSize,
    };
  }

  private assertDraftArrivalContext(payload: SaveIntakeInspectionDraftDto) {
    if (!payload.intakeData?.arrivalType || !payload.intakeData?.visitType) {
      throw new BadRequestException('Arrival type and visit type are required to save an intake draft');
    }
  }

  private assertImmutableBookedIntakeContext(
    inspection: Awaited<ReturnType<InspectionsRepository['findById']>>,
    payload: SaveIntakeInspectionDraftDto,
  ) {
    const persistedBookingId = trimIntakeText(inspection.bookingId);
    const persistedIntakeData = inspection.intakeData as { arrivalType?: unknown } | null;
    const hasBookedOrigin =
      Boolean(persistedBookingId) || trimIntakeText(persistedIntakeData?.arrivalType) === 'with_booking';

    if (!hasBookedOrigin) return;

    if (trimIntakeText(payload.intakeData?.arrivalType) !== 'with_booking') {
      throw new ConflictException('A booked intake cannot be changed to a walk-in arrival');
    }
    if (persistedBookingId && trimIntakeText(payload.bookingId) !== persistedBookingId) {
      throw new ConflictException('The linked booking for a booked intake cannot be changed or cleared');
    }
  }

  private assertCompletedIntake(
    payload: SaveIntakeInspectionDraftDto,
    booking?: IntakeBookingRecord,
  ) {
    const data = payload.intakeData ?? ({} as SaveIntakeInspectionDraftDto['intakeData']);
    const missing: string[] = [];
    const reasons = normalizeIntakeStringList(
      data.reasonForVisits ?? (data.reasonForVisit ? [data.reasonForVisit] : []),
      8,
      240,
    );
    const requestedServiceIds = normalizeIntakeStringList(data.requestedServiceIds, 25, 80);
    const requestedServiceNames = normalizeIntakeStringList(data.requestedServiceNames, 25, 160);
    const serviceSummary = trimIntakeText(data.requestedServiceSummary);
    if (!reasons.length) missing.push('reason for visit');
    if (!requestedServiceIds.length && !requestedServiceNames.length && !serviceSummary) {
      missing.push('requested services');
    }
    if (!normalizeIntakeConcerns(data.customerConcerns, data.serviceConcern).length) missing.push('service concern');
    if (!Number.isInteger(data.currentOdometerKm) || Number(data.currentOdometerKm) < 0) {
      missing.push('odometer');
    }
    if (!data.customerAcknowledged) missing.push('customer acknowledgement');
    if (!['verified_present', 'not_present'].includes(String(data.stickerObservation ?? ''))) {
      missing.push('vehicle sticker observation');
    }
    if (
      data.stickerObservation === 'not_present' &&
      !trimIntakeText(data.stickerObservationReason)
    ) {
      missing.push('reason for absent vehicle sticker');
    }
    if (data.arrivalType === 'with_booking' && !payload.bookingId) missing.push('booking');
    if (data.arrivalType === 'walk_in' && payload.bookingId) {
      throw new ConflictException('Walk-in intake cannot be linked to a booking');
    }
    const arrivalItems = Array.isArray(data.arrivalInspectionItems) ? data.arrivalInspectionItems : [];
    const arrivalKeySet = new Set(arrivalItems.map((item) => trimIntakeText(item?.key)));
    if (
      arrivalItems.length !== arrivalInspectionKeys.length ||
      arrivalInspectionKeys.some((key) => !arrivalKeySet.has(key)) ||
      arrivalItems.some((item) => !['ok', 'issue'].includes(String(item?.status ?? '')))
    ) {
      missing.push('arrival inspection checks');
    }
    if (
      arrivalItems.some(
        (item) =>
          item?.status === 'issue' &&
          (!trimIntakeText(item.issue?.location) ||
            !trimIntakeText(item.issue?.notes) ||
            !['low', 'medium', 'high'].includes(String(item.issue?.severity ?? ''))),
      )
    ) {
      missing.push('arrival issue details');
    }

    const requiredRequirementKeys =
      intakeRequirementKeysByVisitType[data.visitType] ?? intakeRequirementKeysByVisitType.regular_service;
    for (const key of requiredRequirementKeys) {
      if (!data.requirementsChecklist?.[key]) {
        missing.push(
          key === 'customerContactConfirmed'
            ? 'customer contact confirmed'
            : key === 'authorizationAcknowledged'
              ? 'authorization acknowledged'
              : key === 'keysHandoffConfirmed'
                ? 'keys / vehicle handoff confirmed'
                : key === 'insuranceDocumentsPresent'
                  ? 'insurance documents present'
                  : 'back-job reference present',
        );
      }
    }

    if (booking) {
      const bookingServices = normalizeBookingServices(booking);
      const bookingServiceIds = normalizeIntakeStringList(
        bookingServices.map((service) => service.id),
        25,
        80,
      );
      if (bookingServiceIds.length && !sameStringSet(requestedServiceIds, bookingServiceIds)) {
        throw new ConflictException('Booked intake services must match the linked booking');
      }
      const bookingReasons = normalizeIntakeStringList(
        booking.reasonForVisits ??
          (booking.reasonForVisit
            ? [booking.reasonForVisit]
            : booking.visitReason
              ? [booking.visitReason]
              : []),
        8,
        240,
      );
      if (bookingReasons.length && !sameStringSet(reasons, bookingReasons)) {
        throw new ConflictException('Booked intake reasons must match the linked booking');
      }
    }
    if (missing.length) {
      throw new BadRequestException(`Completed intake is missing: ${[...new Set(missing)].join(', ')}`);
    }
  }

  private async assertIntakeBooking(
    vehicleId: string,
    customerUserId: string,
    payload: SaveIntakeInspectionDraftDto,
  ): Promise<IntakeBookingRecord | undefined> {
    if (payload.intakeData?.arrivalType === 'walk_in') {
      if (payload.bookingId) throw new ConflictException('Walk-in intake cannot be linked to a booking');
      return undefined;
    }
    if (!payload.bookingId) {
      throw new BadRequestException('Booked intake requires a linked eligible booking');
    }
    const booking = (await this.bookingsService.findById(payload.bookingId)) as IntakeBookingRecord;
    if (booking.vehicleId !== vehicleId || booking.userId !== customerUserId) {
      throw new ConflictException('Booking does not match the selected customer and vehicle');
    }
    if (!['confirmed', 'in_service'].includes(String(booking.status))) {
      throw new ConflictException('Booking is not eligible for workshop intake');
    }
    return booking;
  }

  private normalizeIntakePayload(
    payload: SaveIntakeInspectionDraftDto,
    booking?: IntakeBookingRecord,
  ) {
    const intakeData = payload.intakeData;
    let reasonForVisits = normalizeIntakeStringList(
      intakeData.reasonForVisits ?? (intakeData.reasonForVisit ? [intakeData.reasonForVisit] : []),
      8,
      240,
    );
    let requestedServiceIds = normalizeIntakeStringList(intakeData.requestedServiceIds, 25, 80);
    let requestedServiceNames = normalizeIntakeStringList(intakeData.requestedServiceNames, 25, 160);
    const customerConcerns = normalizeIntakeConcerns(intakeData.customerConcerns, intakeData.serviceConcern);
    const serviceConcern = trimIntakeText(intakeData.serviceConcern) ||
      customerConcerns.map((concern) => concern.text).join(' • ').slice(0, 1000);
    const bookingServices = normalizeBookingServices(booking);

    if (intakeData.arrivalType === 'with_booking' && bookingServices.length) {
      const bookingServiceIds = normalizeIntakeStringList(
        bookingServices.map((service) => service.id),
        25,
        80,
      );
      if (requestedServiceIds.length && !sameStringSet(requestedServiceIds, bookingServiceIds)) {
        throw new ConflictException('Booked intake services must match the linked booking');
      }
      requestedServiceIds = bookingServiceIds;
      requestedServiceNames = normalizeIntakeStringList(
        bookingServices.map((service) => service.name),
        25,
        160,
      );
    }

    const bookingReasons = normalizeIntakeStringList(
      booking?.reasonForVisits ??
        (booking?.reasonForVisit
          ? [booking.reasonForVisit]
          : booking?.visitReason
            ? [booking.visitReason]
            : []),
      8,
      240,
    );
    if (intakeData.arrivalType === 'with_booking' && bookingReasons.length) {
      reasonForVisits = bookingReasons;
    }

    const arrivalInspectionItems = Array.isArray(intakeData.arrivalInspectionItems)
      ? intakeData.arrivalInspectionItems.map((item) => {
          const status = trimIntakeText(item?.status) as 'unchecked' | 'ok' | 'issue';
          const issue = status === 'issue' && item?.issue
            ? {
                location: trimIntakeText(item.issue.location) || undefined,
                severity: trimIntakeText(item.issue.severity) as 'low' | 'medium' | 'high' | undefined,
                notes: trimIntakeText(item.issue.notes) || undefined,
                evidenceSlot: trimIntakeText(item.issue.evidenceSlot) || undefined,
              }
            : undefined;
          return { key: trimIntakeText(item?.key), status, issue };
        })
      : undefined;

    return {
      ...payload,
      bookingId: intakeData.arrivalType === 'walk_in' ? undefined : trimIntakeText(payload.bookingId) || undefined,
      notes: trimIntakeText(payload.notes) || undefined,
      intakeData: {
        ...intakeData,
        reasonForVisit: reasonForVisits[0] || undefined,
        reasonForVisits: reasonForVisits.length ? reasonForVisits : undefined,
        requestedServiceSummary:
          (requestedServiceNames.length
            ? requestedServiceNames.join(', ')
            : trimIntakeText(intakeData.requestedServiceSummary)) || undefined,
        requestedServiceIds: requestedServiceIds.length ? requestedServiceIds : undefined,
        requestedServiceNames: requestedServiceNames.length ? requestedServiceNames : undefined,
        customerConcerns: customerConcerns.length ? customerConcerns : undefined,
        serviceConcern: serviceConcern || undefined,
        fuelLevel: trimIntakeText(intakeData.fuelLevel) || undefined,
        requirementsChecklist: intakeData.requirementsChecklist
          ? {
              customerContactConfirmed: Boolean(intakeData.requirementsChecklist.customerContactConfirmed),
              authorizationAcknowledged: Boolean(intakeData.requirementsChecklist.authorizationAcknowledged),
              keysHandoffConfirmed: Boolean(intakeData.requirementsChecklist.keysHandoffConfirmed),
              insuranceDocumentsPresent: Boolean(intakeData.requirementsChecklist.insuranceDocumentsPresent),
              backJobDocumentsPresent: Boolean(intakeData.requirementsChecklist.backJobDocumentsPresent),
            }
          : undefined,
        arrivalInspectionItems,
        damageAreas: normalizeOptionalIntakeStringList(intakeData.damageAreas, 20, 80),
        damageNotes: trimIntakeText(intakeData.damageNotes) || undefined,
        customerItems: trimIntakeText(intakeData.customerItems) || undefined,
        customerSignatureName: trimIntakeText(intakeData.customerSignatureName) || undefined,
        missingRequirementsNote: trimIntakeText(intakeData.missingRequirementsNote) || undefined,
        safetyAccessNotes: trimIntakeText(intakeData.safetyAccessNotes) || undefined,
        stickerObservation: ['verified_present', 'not_present'].includes(
          trimIntakeText(intakeData.stickerObservation),
        )
          ? (trimIntakeText(intakeData.stickerObservation) as 'verified_present' | 'not_present')
          : undefined,
        stickerObservationReason: trimIntakeText(intakeData.stickerObservationReason) || undefined,
        paperChecklistStatus: intakeData.paperChecklistStatus ?? 'not_started',
      },
    };
  }

  private parseIfMatch(value: string | undefined) {
    const normalized = String(value ?? '').replace(/^W\//, '').replace(/^\"|\"$/g, '');
    const version = Number(normalized);
    if (!Number.isInteger(version) || version < 1) {
      throw new PreconditionFailedException('A current numeric If-Match version is required');
    }
    return version;
  }

  private decodeHistoryCursor(cursor?: string) {
    if (!cursor) return undefined;
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        version?: number;
        createdAt?: string;
        id?: string;
      };
      const createdAt = new Date(String(decoded.createdAt ?? ''));
      if (decoded.version !== 1 || !decoded.id || Number.isNaN(createdAt.getTime())) {
        throw new Error('invalid');
      }
      return { createdAt, id: decoded.id };
    } catch {
      throw new BadRequestException('Invalid inspection history cursor');
    }
  }

  private toInspectionResponse(inspection: Awaited<ReturnType<InspectionsRepository['findById']>>) {
    return {
      ...inspection,
      inspectionReference:
        inspection.inspectionReference ??
        `INSP-LEGACY-${inspection.id.replaceAll('-', '').slice(0, 8).toUpperCase()}`,
      attachmentRefs: (inspection.attachmentRefs ?? []).filter(
        (reference) => !String(reference).startsWith('upload://'),
      ),
      evidence: (inspection.evidence ?? []).map((item) =>
        this.toEvidenceResponse(inspection.id, item),
      ),
      legacyRecord: !inspection.intakeData,
    };
  }

  private toEvidenceResponse(
    inspectionId: string,
    evidence: {
      id: string;
      slot: string;
      originalName: string;
      mimeType: string;
      byteSize: number;
      createdAt: Date;
    },
  ) {
    return {
      id: evidence.id,
      slot: evidence.slot,
      originalName: evidence.originalName,
      mimeType: evidence.mimeType,
      byteSize: evidence.byteSize,
      createdAt: evidence.createdAt,
      fileUrl: `/api/intake-inspections/${inspectionId}/evidence/${evidence.id}/file`,
    };
  }

  private normalizeOriginalName(value: string) {
    const normalized = String(value ?? 'inspection-image')
      .replace(/[\\/\0-\x1f<>:\"|?*]+/g, '-')
      .trim();
    return (normalized || 'inspection-image').slice(0, 255);
  }

  private assertInspectionActor(actor: InspectionActor) {
    if (
      !actor?.userId ||
      !['technician', 'head_technician', 'service_adviser', 'super_admin'].includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Only technicians, head technicians, service advisers, or super admins can access inspection records',
      );
    }
  }
}
