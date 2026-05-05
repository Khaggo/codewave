import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';

import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BackJobsService } from '@main-modules/back-jobs/services/back-jobs.service';
import { InspectionsRepository } from '@main-modules/inspections/repositories/inspections.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

describe('BackJobsService', () => {
  it('creates a back-job case when original lineage and return inspection are valid', async () => {
    const backJobsRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'back-job-1',
        status: 'reported',
      }),
    };

    const usersService = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === 'adviser-1') {
          return Promise.resolve({
            id,
            role: 'service_adviser',
            isActive: true,
          });
        }

        if (id === 'customer-1') {
          return Promise.resolve({
            id,
            role: 'customer',
            isActive: true,
          });
        }

        return Promise.resolve(null);
      }),
    };

    const vehiclesService = {
      findById: jest.fn().mockResolvedValue({
        id: 'vehicle-1',
        userId: 'customer-1',
      }),
    };

    const inspectionsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'inspection-1',
        vehicleId: 'vehicle-1',
        inspectionType: 'return',
        findings: [{ id: 'finding-1' }],
      }),
    };

    const jobOrdersRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'job-order-1',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        sourceType: 'booking',
        sourceId: 'booking-1',
        status: 'finalized',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BackJobsService,
        { provide: BackJobsRepository, useValue: backJobsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesService, useValue: vehiclesService },
        { provide: InspectionsRepository, useValue: inspectionsRepository },
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
      ],
    }).compile();

    const service = moduleRef.get(BackJobsService);

    const result = await service.create(
      {
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        originalJobOrderId: 'job-order-1',
        originalBookingId: 'booking-1',
        returnInspectionId: 'inspection-1',
        complaint: 'Leak came back after the previous repair.',
        findings: [
          {
            category: 'engine',
            label: 'Leak still present around gasket',
            severity: 'high',
            isValidated: true,
          },
        ],
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(backJobsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originalJobOrderId: 'job-order-1',
        returnInspectionId: 'inspection-1',
        createdByUserId: 'adviser-1',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'back-job-1',
        status: 'reported',
      }),
    );
  });

  it('rejects invalid lineage or missing review evidence before approval', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BackJobsService,
        {
          provide: BackJobsRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'back-job-1',
              status: 'reported',
              vehicleId: 'vehicle-1',
              customerUserId: 'customer-1',
              returnInspectionId: null,
              reworkJobOrderId: null,
              findings: [],
            }),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockImplementation((id: string) =>
              Promise.resolve({
                id,
                role: id === 'customer-1' ? 'customer' : 'service_adviser',
                isActive: true,
              }),
            ),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'vehicle-1',
              userId: 'customer-1',
            }),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              customerUserId: 'customer-1',
              vehicleId: 'vehicle-2',
              sourceType: 'booking',
              sourceId: 'booking-1',
              status: 'finalized',
            }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(BackJobsService);

    await expect(
      service.create(
        {
          customerUserId: 'customer-1',
          vehicleId: 'vehicle-1',
          originalJobOrderId: 'job-order-1',
          complaint: 'Same issue returned after service.',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.updateStatus(
        'back-job-1',
        {
          status: 'approved_for_rework',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks resolving or closing a back-job until the linked rework job order is finalized', async () => {
    const backJobsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'back-job-1',
        status: 'in_progress',
        vehicleId: 'vehicle-1',
        customerUserId: 'customer-1',
        returnInspectionId: 'inspection-1',
        reworkJobOrderId: 'job-order-rework-1',
        findings: [{ id: 'finding-1' }],
      }),
      updateStatus: jest.fn(),
    };

    const jobOrdersRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'job-order-rework-1',
        status: 'ready_for_qa',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BackJobsService,
        { provide: BackJobsRepository, useValue: backJobsRepository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'adviser-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
      ],
    }).compile();

    const service = moduleRef.get(BackJobsService);

    await expect(
      service.updateStatus(
        'back-job-1',
        {
          status: 'resolved',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toThrow('Linked rework job orders must be finalized before the back-job can be resolved or closed');

    expect(backJobsRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('emits a customer-visible notification trigger after staff changes back-job status', async () => {
    const notificationsService = {
      applyTrigger: jest.fn().mockResolvedValue({ triggerName: 'back_job.status_changed' }),
    };

    const backJobsRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'back-job-1',
        status: 'reported',
        vehicleId: 'vehicle-1',
        customerUserId: 'customer-1',
        returnInspectionId: 'inspection-1',
        reworkJobOrderId: null,
        findings: [{ id: 'finding-1' }],
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'back-job-1',
        status: 'inspected',
        vehicleId: 'vehicle-1',
        customerUserId: 'customer-1',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BackJobsService,
        { provide: BackJobsRepository, useValue: backJobsRepository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'adviser-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: InspectionsRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'inspection-1',
              vehicleId: 'vehicle-1',
              inspectionType: 'return',
              findings: [{ id: 'inspection-finding-1' }],
            }),
          },
        },
        { provide: JobOrdersRepository, useValue: { findById: jest.fn() } },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    const service = moduleRef.get(BackJobsService);

    await service.updateStatus(
      'back-job-1',
      {
        status: 'inspected',
        reviewNotes: 'Return inspection confirms the concern.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(notificationsService.applyTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'back_job.status_changed',
        sourceDomain: 'main-service.back-jobs',
        payload: expect.objectContaining({
          backJobId: 'back-job-1',
          customerUserId: 'customer-1',
          status: 'inspected',
        }),
      }),
    );
  });

  it('prevents non-reviewers from opening back-job cases', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BackJobsService,
        { provide: BackJobsRepository, useValue: { create: jest.fn() } },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'customer-1',
              role: 'customer',
              isActive: true,
            }),
          },
        },
        { provide: VehiclesService, useValue: { findById: jest.fn() } },
        { provide: InspectionsRepository, useValue: { findById: jest.fn() } },
        { provide: JobOrdersRepository, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(BackJobsService);

    await expect(
      service.create(
        {
          customerUserId: 'customer-1',
          vehicleId: 'vehicle-1',
          originalJobOrderId: 'job-order-1',
          complaint: 'Attempted unauthorized back-job creation.',
        },
        {
          userId: 'customer-1',
          role: 'customer',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
