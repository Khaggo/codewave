import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { BookingsService } from '@main-modules/bookings/services/bookings.service';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { InspectionEvidenceStorageService } from '@main-modules/inspections/services/inspection-evidence-storage.service';
import { InspectionsService } from '@main-modules/inspections/services/inspections.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

const inspectionEvidenceStorageService = {
  saveImage: jest.fn(),
};

describe('InspectionsService', () => {
  it('creates an inspection for a valid vehicle and booking reference', async () => {
    const vehiclesService = {
      findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
    };

    const bookingsService = {
      findById: jest.fn().mockResolvedValue({
        id: 'booking-1',
        vehicleId: 'vehicle-1',
      }),
    };

    const inspectionsRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'inspection-1',
        vehicleId: 'vehicle-1',
        inspectionType: 'intake',
        status: 'completed',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: InspectionsRepository, useValue: inspectionsRepository },
        { provide: VehiclesService, useValue: vehiclesService },
        { provide: BookingsService, useValue: bookingsService },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);

    const result = await service.create('vehicle-1', {
      bookingId: 'booking-1',
      inspectionType: 'intake',
      status: 'completed',
      findings: [
        {
          category: 'body',
          label: 'Front bumper scratches',
        },
      ],
    }, { userId: 'tech-1', role: 'technician' });

    expect(vehiclesService.findById).toHaveBeenCalledWith('vehicle-1');
    expect(bookingsService.findById).toHaveBeenCalledWith('booking-1');
    expect(inspectionsRepository.create).toHaveBeenCalled();
    expect(result.id).toBe('inspection-1');
  });

  it('rejects mismatched booking references', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        {
          provide: InspectionsRepository,
          useValue: {},
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: BookingsService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'booking-1',
              vehicleId: 'vehicle-2',
            }),
          },
        },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);

    await expect(
      service.create('vehicle-1', {
        bookingId: 'booking-1',
        inspectionType: 'intake',
      }, { userId: 'tech-1', role: 'technician' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects completion inspections without findings', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        {
          provide: InspectionsRepository,
          useValue: {},
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1' }),
          },
        },
        {
          provide: BookingsService,
          useValue: {
            findById: jest.fn(),
          },
        },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);

    await expect(
      service.create('vehicle-1', {
        inspectionType: 'completion',
        status: 'completed',
      }, { userId: 'tech-1', role: 'technician' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inspection lookup when the vehicle does not exist', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        {
          provide: InspectionsRepository,
          useValue: {
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
          provide: BookingsService,
          useValue: {
            findById: jest.fn(),
          },
        },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);

    await expect(
      service.findByVehicleId('missing-vehicle-id', { userId: 'tech-1', role: 'technician' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects customer access to inspection records', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        {
          provide: InspectionsRepository,
          useValue: {
            findByVehicleId: jest.fn(),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: BookingsService,
          useValue: {
            findById: jest.fn(),
          },
        },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);

    await expect(
      service.findByVehicleId('vehicle-1', { userId: 'customer-1', role: 'customer' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
