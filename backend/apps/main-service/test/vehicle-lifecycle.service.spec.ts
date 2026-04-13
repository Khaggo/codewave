import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { VehicleLifecycleRepository } from '@main-modules/vehicle-lifecycle/repositories/vehicle-lifecycle.repository';
import { VehicleLifecycleService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle.service';
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
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: InspectionsRepository, useValue: inspectionsRepository },
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
      ],
    }).compile();

    const service = moduleRef.get(VehicleLifecycleService);

    await expect(service.findByVehicleId('missing-vehicle-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
