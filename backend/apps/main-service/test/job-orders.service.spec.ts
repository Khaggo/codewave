import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { QualityGatesService } from '@main-modules/quality-gates/services/quality-gates.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { JobOrdersService } from '@main-modules/job-orders/services/job-orders.service';

describe('JobOrdersService', () => {
  it('creates a job order from a confirmed booking with adviser and technician validation', async () => {
    const jobOrdersRepository = {
      hasBookingSource: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({
        id: 'job-order-1',
        status: 'assigned',
      }),
    };

    const bookingsRepository = {
      findOptionalById: jest.fn().mockResolvedValue({
        id: 'booking-1',
        status: 'confirmed',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
      }),
    };

    const usersService = {
      findById: jest
        .fn()
        .mockImplementation((id: string) => {
          if (id === 'adviser-1') {
            return Promise.resolve({
              id,
              role: 'service_adviser',
              isActive: true,
              staffCode: 'SA-1001',
            });
          }

          if (id === 'customer-1') {
            return Promise.resolve({
              id,
              role: 'customer',
              isActive: true,
            });
          }

          if (id === 'tech-1') {
            return Promise.resolve({
              id,
              role: 'technician',
              isActive: true,
            });
          }

          return Promise.resolve(null);
        }),
    };

    const vehiclesRepository = {
      findOwnedByUser: jest.fn().mockResolvedValue({
        id: 'vehicle-1',
        userId: 'customer-1',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.create(
      {
        sourceType: 'booking',
        sourceId: 'booking-1',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        items: [{ name: 'Replace spark plugs' }],
        assignedTechnicianIds: ['tech-1'],
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(bookingsRepository.findOptionalById).toHaveBeenCalledWith('booking-1');
    expect(jobOrdersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'booking-1',
        status: 'assigned',
      }),
    );
    expect(result.id).toBe('job-order-1');
  });

  it('rejects job-order creation when the booking source is not confirmed', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        {
          provide: JobOrdersRepository,
          useValue: {
            hasBookingSource: jest.fn().mockResolvedValue(false),
            create: jest.fn(),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findOptionalById: jest.fn().mockResolvedValue({
              id: 'booking-1',
              status: 'pending',
              userId: 'customer-1',
              vehicleId: 'vehicle-1',
            }),
          },
        },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'adviser-1',
              role: 'service_adviser',
              isActive: true,
              staffCode: 'SA-1001',
            }),
          },
        },
        {
          provide: VehiclesRepository,
          useValue: {
            findOwnedByUser: jest.fn(),
          },
        },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    await expect(
      service.create(
        {
          sourceType: 'booking',
          sourceId: 'booking-1',
          customerUserId: 'customer-1',
          vehicleId: 'vehicle-1',
          serviceAdviserUserId: 'adviser-1',
          serviceAdviserCode: 'SA-1001',
          items: [{ name: 'Replace spark plugs' }],
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid technician assignments during job-order creation', async () => {
    const jobOrdersRepository = {
      hasBookingSource: jest.fn().mockResolvedValue(false),
      create: jest.fn(),
    };

    const bookingsRepository = {
      findOptionalById: jest.fn().mockResolvedValue({
        id: 'booking-1',
        status: 'confirmed',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
      }),
    };

    const usersService = {
      findById: jest
        .fn()
        .mockImplementation((id: string) => {
          if (id === 'adviser-1') {
            return Promise.resolve({
              id,
              role: 'service_adviser',
              isActive: true,
              staffCode: 'SA-1001',
            });
          }

          if (id === 'customer-1') {
            return Promise.resolve({
              id,
              role: 'customer',
              isActive: true,
            });
          }

          if (id === 'not-tech-1') {
            return Promise.resolve({
              id,
              role: 'service_adviser',
              isActive: true,
              staffCode: 'SA-2001',
            });
          }

          return Promise.resolve(null);
        }),
    };

    const vehiclesRepository = {
      findOwnedByUser: jest.fn().mockResolvedValue({
        id: 'vehicle-1',
        userId: 'customer-1',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    await expect(
      service.create(
        {
          sourceType: 'booking',
          sourceId: 'booking-1',
          customerUserId: 'customer-1',
          vehicleId: 'vehicle-1',
          serviceAdviserUserId: 'adviser-1',
          serviceAdviserCode: 'SA-1001',
          items: [{ name: 'Replace spark plugs' }],
          assignedTechnicianIds: ['not-tech-1'],
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('restricts technician status changes to assigned operational states only', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        {
          provide: JobOrdersRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'job-order-1',
              status: 'assigned',
              assignments: [
                {
                  technicianUserId: 'tech-1',
                },
              ],
            }),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: BookingsRepository,
          useValue: {
            findOptionalById: jest.fn(),
          },
        },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'tech-1',
              role: 'technician',
              isActive: true,
            }),
          },
        },
        {
          provide: VehiclesRepository,
          useValue: {
            findOwnedByUser: jest.fn(),
          },
        },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    await expect(
      service.updateStatus(
        'job-order-1',
        {
          status: 'cancelled',
        },
        {
          userId: 'tech-1',
          role: 'technician',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets an assigned technician append progress entries and mark completed items', async () => {
    const updateResult = {
      id: 'job-order-1',
      progressEntries: [
        {
          id: 'progress-1',
          technicianUserId: 'tech-1',
        },
      ],
      items: [
        {
          id: 'item-1',
          isCompleted: true,
        },
      ],
    };

    const jobOrdersRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'job-order-1',
        status: 'in_progress',
        items: [{ id: 'item-1' }],
        assignments: [{ technicianUserId: 'tech-1' }],
      }),
      addProgressEntry: jest.fn().mockResolvedValue(updateResult),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'tech-1',
              role: 'technician',
              isActive: true,
            }),
          },
        },
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.addProgressEntry(
      'job-order-1',
      {
        entryType: 'work_completed',
        message: 'Finished the first work item.',
        completedItemIds: ['item-1'],
      },
      {
        userId: 'tech-1',
        role: 'technician',
      },
    );

    expect(jobOrdersRepository.addProgressEntry).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        entryType: 'work_completed',
        completedItemIds: ['item-1'],
      }),
      'tech-1',
    );
    expect(result).toBe(updateResult);
  });

  it('rejects progress entries from unassigned technicians and photo evidence on closed job orders', async () => {
    const jobOrdersRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'job-order-1',
          status: 'assigned',
          items: [],
          assignments: [],
        })
        .mockResolvedValueOnce({
          id: 'job-order-2',
          status: 'cancelled',
          items: [],
          assignments: [{ technicianUserId: 'tech-1' }],
        }),
      addProgressEntry: jest.fn(),
      addPhoto: jest.fn(),
    };

    const usersService = {
      findById: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve({
            id,
            role: id === 'adviser-1' ? 'service_adviser' : 'technician',
            isActive: true,
          }),
        ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    await expect(
      service.addProgressEntry(
        'job-order-1',
        {
          entryType: 'note',
          message: 'Tried to update an unassigned job order.',
        },
        {
          userId: 'tech-1',
          role: 'technician',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.addPhoto(
        'job-order-2',
        {
          fileName: 'closed-job-order.jpg',
          fileUrl: 'https://files.example.com/closed-job-order.jpg',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finalizes a ready-for-QA job order into an invoice-ready record with adviser snapshot data', async () => {
    const finalizedResult = {
      id: 'job-order-1',
      status: 'finalized',
      invoiceRecord: {
        invoiceReference: 'INV-JO-20260413-ABC12345',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
      },
    };

    const jobOrdersRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'job-order-1',
        status: 'ready_for_qa',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        items: [{ id: 'item-1', isCompleted: true }],
        assignments: [{ technicianUserId: 'tech-1' }],
        invoiceRecord: null,
      }),
      finalize: jest.fn().mockResolvedValue(finalizedResult),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
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
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
        {
          provide: QualityGatesService,
          useValue: {
            beginQualityGate: jest.fn(),
            assertReleaseAllowed: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.finalize(
      'job-order-1',
      {
        summary: 'Ready to hand off for invoice generation.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(jobOrdersRepository.finalize).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        finalizedByUserId: 'adviser-1',
        summary: 'Ready to hand off for invoice generation.',
      }),
    );
    expect(result).toBe(finalizedResult);
  });

  it('rejects invoice generation for incomplete, blocked, or already-invoiced job orders', async () => {
    const jobOrdersRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'job-order-1',
          status: 'ready_for_qa',
          serviceAdviserUserId: 'adviser-1',
          items: [{ id: 'item-1', isCompleted: false }],
          assignments: [],
          invoiceRecord: null,
        })
        .mockResolvedValueOnce({
          id: 'job-order-2',
          status: 'blocked',
          serviceAdviserUserId: 'adviser-1',
          items: [{ id: 'item-1', isCompleted: true }],
          assignments: [],
          invoiceRecord: null,
        })
        .mockResolvedValueOnce({
          id: 'job-order-3',
          status: 'ready_for_qa',
          serviceAdviserUserId: 'adviser-1',
          items: [{ id: 'item-1', isCompleted: true }],
          assignments: [],
          invoiceRecord: {
            id: 'invoice-record-1',
          },
        }),
      finalize: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
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
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
        {
          provide: QualityGatesService,
          useValue: {
            beginQualityGate: jest.fn(),
            assertReleaseAllowed: jest.fn(),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    await expect(
      service.finalize(
        'job-order-1',
        {},
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.finalize(
        'job-order-2',
        {},
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.finalize(
        'job-order-3',
        {},
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a rework job order from an approved back-job case and links the lineage', async () => {
    const backJobsRepository = {
      findOptionalById: jest.fn().mockResolvedValue({
        id: 'back-job-1',
        status: 'approved_for_rework',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        originalJobOrderId: 'job-order-original-1',
        reworkJobOrderId: null,
      }),
      linkReworkJobOrder: jest.fn().mockResolvedValue({
        id: 'back-job-1',
        reworkJobOrderId: 'job-order-rework-1',
      }),
    };

    const jobOrdersRepository = {
      hasBackJobSource: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({
        id: 'job-order-rework-1',
        status: 'assigned',
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'job-order-rework-1',
        sourceType: 'back_job',
        sourceId: 'back-job-1',
        jobType: 'back_job',
        parentJobOrderId: 'job-order-original-1',
        status: 'assigned',
      }),
    };

    const usersService = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === 'adviser-1') {
          return Promise.resolve({
            id,
            role: 'service_adviser',
            isActive: true,
            staffCode: 'SA-1001',
          });
        }

        if (id === 'customer-1') {
          return Promise.resolve({
            id,
            role: 'customer',
            isActive: true,
          });
        }

        if (id === 'tech-1') {
          return Promise.resolve({
            id,
            role: 'technician',
            isActive: true,
          });
        }

        return Promise.resolve(null);
      }),
    };

    const vehiclesRepository = {
      findOwnedByUser: jest.fn().mockResolvedValue({
        id: 'vehicle-1',
        userId: 'customer-1',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: backJobsRepository },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.create(
      {
        sourceType: 'back_job',
        sourceId: 'back-job-1',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        items: [{ name: 'Rework oil leak inspection' }],
        assignedTechnicianIds: ['tech-1'],
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(jobOrdersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'back_job',
        sourceId: 'back-job-1',
        jobType: 'back_job',
        parentJobOrderId: 'job-order-original-1',
      }),
    );
    expect(backJobsRepository.linkReworkJobOrder).toHaveBeenCalledWith('back-job-1', 'job-order-rework-1');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'job-order-rework-1',
        jobType: 'back_job',
        parentJobOrderId: 'job-order-original-1',
      }),
    );
  });
});
