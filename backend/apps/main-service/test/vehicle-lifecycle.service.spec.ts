import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { VehicleLifecycleRepository } from '@main-modules/vehicle-lifecycle/repositories/vehicle-lifecycle.repository';
import { VehicleLifecycleService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle.service';
import { VehicleLifecycleSummaryProviderService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle-summary-provider.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

describe('VehicleLifecycleService', () => {
  it('builds a timeline with administrative and verified events', async () => {
    const bookingsRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'booking-1',
          statusHistory: [
            {
              id: 'history-1',
              previousStatus: null,
              nextStatus: 'pending',
              reason: 'Booking created',
              changedByUserId: 'user-1',
              changedAt: new Date('2026-04-20T09:00:00.000Z'),
            },
            {
              id: 'history-2',
              previousStatus: 'pending',
              nextStatus: 'confirmed',
              reason: 'Staff approved the booking',
              changedByUserId: 'user-2',
              changedAt: new Date('2026-04-20T10:00:00.000Z'),
            },
          ],
        },
      ]),
    };

    const inspectionsRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'inspection-1',
          inspectionType: 'completion',
          status: 'completed',
          inspectorUserId: 'user-2',
          notes: 'Vehicle condition verified.',
          createdAt: new Date('2026-04-20T11:00:00.000Z'),
        },
      ]),
    };

    const vehicleLifecycleRepository = {
      replaceForVehicle: jest.fn().mockImplementation(async (_vehicleId: string, events: unknown[]) => events),
      findByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'event-1',
          eventType: 'booking_created',
          eventCategory: 'administrative',
          verified: false,
        },
        {
          id: 'event-2',
          eventType: 'inspection_completion_completed',
          eventCategory: 'verified',
          verified: true,
          inspectionId: 'inspection-1',
        },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        { provide: VehicleLifecycleRepository, useValue: vehicleLifecycleRepository },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: InspectionsRepository, useValue: inspectionsRepository },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    const result = await service.findByVehicleId('vehicle-1');

    expect(bookingsRepository.findByVehicleId).toHaveBeenCalledWith('vehicle-1');
    expect(inspectionsRepository.findByVehicleId).toHaveBeenCalledWith('vehicle-1');
    expect(vehicleLifecycleRepository.replaceForVehicle).toHaveBeenCalled();
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventCategory: 'administrative',
          verified: false,
        }),
        expect.objectContaining({
          eventCategory: 'verified',
          verified: true,
          inspectionId: 'inspection-1',
        }),
      ]),
    );
  });

  it('rejects verified lifecycle events without inspection evidence', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
            findById: jest.fn(),
          },
        },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.appendVehicleTimelineEvent({
        vehicleId: 'vehicle-1',
        eventType: 'manual_verification',
        eventCategory: 'verified',
        sourceType: 'manual',
        sourceId: 'manual-1',
        occurredAt: new Date('2026-04-20T12:00:00.000Z'),
        verified: true,
        dedupeKey: 'manual:manual-1:verified',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inspection references that belong to another vehicle', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
            findById: jest.fn().mockResolvedValue({
              id: 'inspection-1',
              vehicleId: 'vehicle-2',
            }),
          },
        },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.appendVehicleTimelineEvent({
        vehicleId: 'vehicle-1',
        eventType: 'manual_verification',
        eventCategory: 'verified',
        sourceType: 'manual',
        sourceId: 'manual-1',
        occurredAt: new Date('2026-04-20T12:00:00.000Z'),
        verified: true,
        inspectionId: 'inspection-1',
        dedupeKey: 'manual:manual-1:verified',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates not found when the vehicle does not exist', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            replaceForVehicle: jest.fn(),
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockRejectedValue(new NotFoundException('Vehicle not found')),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(service.findByVehicleId('missing-vehicle-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates pending lifecycle summaries with reviewer-gated visibility', async () => {
    const vehicleLifecycleRepository = {
      replaceForVehicle: jest.fn().mockResolvedValue(undefined),
      createSummary: jest.fn().mockResolvedValue({
        id: 'summary-1',
        vehicleId: 'vehicle-1',
        requestedByUserId: 'reviewer-1',
        summaryText: 'Summary draft',
        status: 'pending_review',
        customerVisible: false,
        customerVisibleAt: null,
        reviewNotes: null,
        reviewedByUserId: null,
        reviewedAt: null,
        provenance: {
          provider: 'local-summary-adapter',
          model: 'timeline-summary-v1',
          promptVersion: 'vehicle-lifecycle.summary.v1',
          evidenceRefs: ['booking:1'],
          evidenceSummary: 'Safe timeline evidence only.',
        },
        createdAt: new Date('2026-05-10T08:30:00.000Z'),
        updatedAt: new Date('2026-05-10T08:30:00.000Z'),
      }),
    };

    const bookingsRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([
        {
          id: 'booking-1',
          statusHistory: [
            {
              id: 'history-1',
              previousStatus: null,
              nextStatus: 'pending',
              reason: 'Booking created',
              changedByUserId: 'reviewer-1',
              changedAt: new Date('2026-05-10T08:00:00.000Z'),
            },
          ],
        },
      ]),
    };

    const inspectionsRepository = {
      findByVehicleId: jest.fn().mockResolvedValue([]),
    };

    const summaryProvider = {
      generate: jest.fn().mockReturnValue({
        summaryText: 'Summary draft',
        provenance: {
          provider: 'local-summary-adapter',
          model: 'timeline-summary-v1',
          promptVersion: 'vehicle-lifecycle.summary.v1',
          evidenceRefs: ['booking:1'],
          evidenceSummary: 'Safe timeline evidence only.',
        },
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        { provide: VehicleLifecycleRepository, useValue: vehicleLifecycleRepository },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'vehicle-1',
              year: 2023,
              make: 'Toyota',
              model: 'Vios',
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'reviewer-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: InspectionsRepository, useValue: inspectionsRepository },
        { provide: VehicleLifecycleSummaryProviderService, useValue: summaryProvider },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    const result = await service.generateLifecycleSummary('vehicle-1', {
      userId: 'reviewer-1',
      role: 'service_adviser',
    });

    expect(summaryProvider.generate).toHaveBeenCalled();
    expect(vehicleLifecycleRepository.createSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'vehicle-1',
        requestedByUserId: 'reviewer-1',
      }),
    );
    expect(result.status).toBe('pending_review');
    expect(result.customerVisible).toBe(false);
  });

  it('stores review metadata when approving a lifecycle summary', async () => {
    const vehicleLifecycleRepository = {
      findSummaryById: jest.fn().mockResolvedValue({
        id: 'summary-1',
        vehicleId: 'vehicle-1',
        status: 'pending_review',
      }),
      reviewSummary: jest.fn().mockResolvedValue({
        id: 'summary-1',
        vehicleId: 'vehicle-1',
        requestedByUserId: 'reviewer-1',
        summaryText: 'Approved summary',
        status: 'approved',
        customerVisible: true,
        customerVisibleAt: new Date('2026-05-10T09:00:00.000Z'),
        reviewNotes: 'Approved for customer visibility.',
        reviewedByUserId: 'reviewer-1',
        reviewedAt: new Date('2026-05-10T09:00:00.000Z'),
        provenance: {
          provider: 'local-summary-adapter',
          model: 'timeline-summary-v1',
          promptVersion: 'vehicle-lifecycle.summary.v1',
          evidenceRefs: ['booking:1'],
          evidenceSummary: 'Safe timeline evidence only.',
        },
        createdAt: new Date('2026-05-10T08:30:00.000Z'),
        updatedAt: new Date('2026-05-10T09:00:00.000Z'),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        { provide: VehicleLifecycleRepository, useValue: vehicleLifecycleRepository },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'reviewer-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    const result = await service.reviewLifecycleSummary(
      'vehicle-1',
      'summary-1',
      {
        decision: 'approved',
        reviewNotes: 'Approved for customer visibility.',
      },
      {
        userId: 'reviewer-1',
        role: 'service_adviser',
      },
    );

    expect(vehicleLifecycleRepository.reviewSummary).toHaveBeenCalledWith(
      'summary-1',
      expect.objectContaining({
        status: 'approved',
        reviewedByUserId: 'reviewer-1',
        customerVisible: true,
      }),
    );
    expect(result.reviewedByUserId).toBe('reviewer-1');
    expect(result.customerVisible).toBe(true);
  });

  it('rejects lifecycle summary generation from non-reviewer roles', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            createSummary: jest.fn(),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'technician-1',
              role: 'technician',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.generateLifecycleSummary('vehicle-1', {
        userId: 'technician-1',
        role: 'technician',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects re-reviewing a lifecycle summary that already has a decision', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleLifecycleService,
        {
          provide: VehicleLifecycleRepository,
          useValue: {
            findSummaryById: jest.fn().mockResolvedValue({
              id: 'summary-1',
              vehicleId: 'vehicle-1',
              status: 'approved',
            }),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'reviewer-1',
              role: 'super_admin',
              isActive: true,
            }),
          },
        },
        { provide: BookingsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findByVehicleId: jest.fn() } },
        { provide: VehicleLifecycleSummaryProviderService, useValue: { generate: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(
      service.reviewLifecycleSummary(
        'vehicle-1',
        'summary-1',
        {
          decision: 'rejected',
          reviewNotes: 'Needs revision.',
        },
        {
          userId: 'reviewer-1',
          role: 'super_admin',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
