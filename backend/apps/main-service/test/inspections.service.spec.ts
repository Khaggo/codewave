import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';

import { BookingsService } from '@main-modules/bookings/services/bookings.service';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { InspectionEvidenceStorageService } from '@main-modules/inspections/services/inspection-evidence-storage.service';
import { InspectionsService } from '@main-modules/inspections/services/inspections.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

const inspectionEvidenceStorageService = {
  saveImage: jest.fn(),
  readImage: jest.fn(),
};

const completeArrivalInspectionItems = () => [
  'batteryCondition',
  'engineOilLevel',
  'coolantLevel',
  'tirePressure',
  'allLightsFunctional',
  'brakePedalFeel',
].map((key) => ({ key, status: 'ok' as const }));

const completeIntakeData = (overrides: Record<string, unknown> = {}) => ({
  arrivalType: 'walk_in' as const,
  visitType: 'regular_service' as const,
  reasonForVisit: 'Preventive maintenance',
  reasonForVisits: ['Preventive maintenance'],
  requestedServiceSummary: 'Oil change',
  requestedServiceIds: ['service-1'],
  requestedServiceNames: ['Oil change'],
  serviceConcern: 'Routine service',
  currentOdometerKm: 12000,
  customerAcknowledged: true,
  requirementsChecklist: {
    customerContactConfirmed: true,
    authorizationAcknowledged: true,
    keysHandoffConfirmed: true,
  },
  arrivalInspectionItems: completeArrivalInspectionItems(),
  ...overrides,
});

const createIntakeDraftUpdateHarness = async (
  inspectionOverrides: Record<string, unknown>,
) => {
  const inspection = {
    id: 'inspection-draft-1',
    vehicleId: 'vehicle-1',
    bookingId: null,
    inspectionType: 'intake',
    status: 'pending',
    version: 1,
    intakeDataVersion: 1,
    intakeData: { arrivalType: 'walk_in', visitType: 'regular_service' },
    ...inspectionOverrides,
  };
  const inspectionsRepository = {
    findById: jest.fn().mockResolvedValue(inspection),
    updateIntakeDraft: jest.fn().mockImplementation(
      async (_inspectionId: string, _version: number, normalizedPayload: Record<string, unknown>) => ({
        ...inspection,
        ...normalizedPayload,
        version: 2,
      }),
    ),
  };
  const vehiclesService = {
    findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }),
  };
  const bookingsService = {
    findById: jest.fn().mockResolvedValue({
      id: 'booking-1',
      vehicleId: 'vehicle-1',
      userId: 'customer-1',
      status: 'confirmed',
      reasonForVisits: ['Preventive maintenance'],
      requestedServices: [{ service: { id: 'service-1', name: 'Oil change' } }],
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

  return {
    service: moduleRef.get(InspectionsService),
    inspectionsRepository,
    bookingsService,
  };
};

describe('InspectionsService', () => {
  it('creates an inspection for a valid vehicle and booking reference', async () => {
    const vehiclesService = {
      findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }),
    };

    const bookingsService = {
      findById: jest.fn().mockResolvedValue({
        id: 'booking-1',
        vehicleId: 'vehicle-1',
        userId: 'customer-1',
        status: 'confirmed',
        reasonForVisits: ['Preventive maintenance'],
        requestedServices: [{ service: { id: 'service-1', name: 'Oil change' } }],
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
      intakeDataVersion: 1,
      intakeData: completeIntakeData({
        arrivalType: 'with_booking',
      }),
      findings: [
        {
          category: 'body',
          label: 'Front bumper scratches',
        },
      ],
    }, { userId: 'tech-1', role: 'technician' });

    expect(vehiclesService.findById).toHaveBeenCalledWith('vehicle-1');
    expect(bookingsService.findById).toHaveBeenCalledWith('booking-1');
    expect(inspectionsRepository.create).toHaveBeenCalledWith(
      'vehicle-1',
      expect.any(Object),
      'tech-1',
    );
    expect(result.id).toBe('inspection-1');
  });

  it('accepts a complete walk-in with multiple reasons and services', async () => {
    const inspectionsRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'inspection-walk-in',
        vehicleId: 'vehicle-1',
        inspectionType: 'intake',
        status: 'completed',
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: InspectionsRepository, useValue: inspectionsRepository },
        {
          provide: VehiclesService,
          useValue: { findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }) },
        },
        { provide: BookingsService, useValue: { findById: jest.fn() } },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);
    await expect(
      service.create(
        'vehicle-1',
        {
          inspectionType: 'intake',
          status: 'completed',
          intakeDataVersion: 1,
          intakeData: completeIntakeData({
            reasonForVisits: ['Brake concern', 'Noise or vibration check'],
            reasonForVisit: 'Brake concern',
            requestedServiceIds: ['service-1', 'service-2'],
            requestedServiceNames: ['Oil change', 'Brake inspection'],
            requestedServiceSummary: 'Oil change, Brake inspection',
          }),
        },
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).resolves.toEqual(expect.objectContaining({ id: 'inspection-walk-in' }));
  });

  it('rejects completion when visible requirements or arrival issue details are incomplete', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: InspectionsRepository, useValue: { create: jest.fn() } },
        {
          provide: VehiclesService,
          useValue: { findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }) },
        },
        { provide: BookingsService, useValue: { findById: jest.fn() } },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);
    await expect(
      service.create(
        'vehicle-1',
        {
          inspectionType: 'intake',
          status: 'completed',
          intakeDataVersion: 1,
          intakeData: completeIntakeData({
            customerAcknowledged: false,
            requirementsChecklist: { customerContactConfirmed: false },
            arrivalInspectionItems: completeArrivalInspectionItems().map((item, index) =>
              index === 0
                ? { key: item.key, status: 'unchecked' as const }
                : index === 1
                  ? {
                      key: item.key,
                      status: 'issue' as const,
                      issue: { location: 'hood', severity: 'high' as const, notes: '' },
                    }
                  : item,
            ),
          }),
        },
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).rejects.toThrow(/customer acknowledgement/);
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

  it('rejects stale intake draft updates with HTTP 412 semantics', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        {
          provide: InspectionsRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'inspection-1',
              vehicleId: 'vehicle-1',
              inspectionType: 'intake',
              status: 'pending',
              version: 2,
            }),
          },
        },
        { provide: VehiclesService, useValue: { findById: jest.fn() } },
        { provide: BookingsService, useValue: { findById: jest.fn() } },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);
    await expect(
      service.updateIntakeDraft(
        'inspection-1',
        {
          intakeData: { arrivalType: 'walk_in', visitType: 'regular_service' },
        },
        '"1"',
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).rejects.toBeInstanceOf(PreconditionFailedException);
  });

  it('rejects changing a booked intake draft to a walk-in arrival', async () => {
    const { service, inspectionsRepository } = await createIntakeDraftUpdateHarness({
      bookingId: 'booking-1',
      intakeData: { arrivalType: 'with_booking', visitType: 'regular_service' },
    });

    await expect(
      service.updateIntakeDraft(
        'inspection-draft-1',
        {
          bookingId: 'booking-1',
          intakeData: { arrivalType: 'walk_in', visitType: 'regular_service' },
        },
        '"1"',
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).rejects.toThrow('A booked intake cannot be changed to a walk-in arrival');
    expect(inspectionsRepository.updateIntakeDraft).not.toHaveBeenCalled();
  });

  it('rejects clearing or replacing a booked intake draft booking', async () => {
    const { service, inspectionsRepository } = await createIntakeDraftUpdateHarness({
      bookingId: 'booking-1',
      intakeData: { arrivalType: 'with_booking', visitType: 'regular_service' },
    });

    for (const bookingId of [undefined, 'booking-2']) {
      await expect(
        service.updateIntakeDraft(
          'inspection-draft-1',
          {
            bookingId,
            intakeData: { arrivalType: 'with_booking', visitType: 'regular_service' },
          },
          '"1"',
          { userId: 'adviser-1', role: 'service_adviser' },
        ),
      ).rejects.toThrow('The linked booking for a booked intake cannot be changed or cleared');
    }
    expect(inspectionsRepository.updateIntakeDraft).not.toHaveBeenCalled();
  });

  it('accepts a valid update that preserves booked intake context', async () => {
    const { service, inspectionsRepository } = await createIntakeDraftUpdateHarness({
      bookingId: 'booking-1',
      intakeData: { arrivalType: 'with_booking', visitType: 'regular_service' },
    });

    await expect(
      service.updateIntakeDraft(
        'inspection-draft-1',
        {
          bookingId: 'booking-1',
          intakeData: { arrivalType: 'with_booking', visitType: 'regular_service' },
        },
        '"1"',
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).resolves.toEqual(expect.objectContaining({ id: 'inspection-draft-1', version: 2 }));
    expect(inspectionsRepository.updateIntakeDraft).toHaveBeenCalledWith(
      'inspection-draft-1',
      1,
      expect.objectContaining({
        bookingId: 'booking-1',
        intakeData: expect.objectContaining({
          arrivalType: 'with_booking',
          reasonForVisits: ['Preventive maintenance'],
          requestedServiceIds: ['service-1'],
          requestedServiceNames: ['Oil change'],
        }),
      }),
      'adviser-1',
    );
  });

  it('accepts an ordinary walk-in draft update', async () => {
    const { service, inspectionsRepository, bookingsService } =
      await createIntakeDraftUpdateHarness({});

    await expect(
      service.updateIntakeDraft(
        'inspection-draft-1',
        {
          intakeData: {
            arrivalType: 'walk_in',
            visitType: 'regular_service',
            reasonForVisits: ['Brake concern'],
            requestedServiceIds: ['service-2'],
            requestedServiceNames: ['Brake inspection'],
          },
        },
        '"1"',
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).resolves.toEqual(expect.objectContaining({ id: 'inspection-draft-1', version: 2 }));
    expect(bookingsService.findById).not.toHaveBeenCalled();
    expect(inspectionsRepository.updateIntakeDraft).toHaveBeenCalledWith(
      'inspection-draft-1',
      1,
      expect.objectContaining({
        bookingId: undefined,
        intakeData: expect.objectContaining({
          arrivalType: 'walk_in',
          reasonForVisits: ['Brake concern'],
          requestedServiceIds: ['service-2'],
          requestedServiceNames: ['Brake inspection'],
        }),
      }),
      'adviser-1',
    );
  });

  it('rejects a booking outside confirmed or in-service intake states', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: InspectionsRepository, useValue: { createIntakeDraft: jest.fn() } },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }),
          },
        },
        {
          provide: BookingsService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'booking-1',
              vehicleId: 'vehicle-1',
              userId: 'customer-1',
              status: 'pending',
            }),
          },
        },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);
    await expect(
      service.createIntakeDraft(
        'vehicle-1',
        {
          bookingId: 'booking-1',
          intakeData: { arrivalType: 'with_booking', visitType: 'regular_service' },
        },
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not accept legacy notes markers as completed structured intake data', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: InspectionsRepository, useValue: { create: jest.fn() } },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'vehicle-1', userId: 'customer-1' }),
          },
        },
        { provide: BookingsService, useValue: { findById: jest.fn() } },
        { provide: InspectionEvidenceStorageService, useValue: inspectionEvidenceStorageService },
      ],
    }).compile();

    const service = moduleRef.get(InspectionsService);
    await expect(
      service.create(
        'vehicle-1',
        {
          inspectionType: 'intake',
          status: 'completed',
          inspectorUserId: 'spoofed-user',
          notes: 'SERVICE CONCERN\nINTAKE DETAILS\nCUSTOMER ACKNOWLEDGMENT',
        },
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
