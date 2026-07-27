import { Test as NestTest } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { QualityGatesService } from '@main-modules/quality-gates/services/quality-gates.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { JobOrdersService } from '@main-modules/job-orders/services/job-orders.service';
import { StaffWorkQueuesService } from '@main-modules/staff-work-queues/services/staff-work-queues.service';
import { TechnicianProfilesService } from '@main-modules/technician-profiles/services/technician-profiles.service';

const staffWorkQueuesProvider = () => ({
  provide: StaffWorkQueuesService,
  useValue: {
    completeClaim: jest.fn().mockResolvedValue(null),
  },
});

const Test = {
  createTestingModule(
    metadata: Parameters<typeof NestTest.createTestingModule>[0],
  ) {
    return NestTest.createTestingModule({
      ...metadata,
      providers: [staffWorkQueuesProvider(), ...(metadata.providers ?? [])],
    });
  },
};

describe('JobOrdersService', () => {
  it('creates a job order from a confirmed booking with adviser and technician validation', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const jobOrdersRepository = {
      hasBookingSource: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({
        id: 'job-order-1',
        sourceId: 'booking-1',
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
      updateStatus: jest.fn(),
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
    const staffWorkQueuesService = {
      completeClaim: jest.fn().mockResolvedValue(null),
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
        { provide: StaffWorkQueuesService, useValue: staffWorkQueuesService },
        { provide: AutocareEventBusService, useValue: eventBus },
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
    expect(staffWorkQueuesService.completeClaim).toHaveBeenCalledWith(
      'job_order',
      'booking_handoff',
      'booking-1',
      'adviser-1',
    );
    expect(bookingsRepository.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        status: 'in_service',
      }),
    );
    expect(result.id).toBe('job-order-1');
  });

  it('rejects job-order creation when the booking source is not confirmed', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
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
        { provide: AutocareEventBusService, useValue: eventBus },
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
    const eventBus = {
      publish: jest.fn(),
    };
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
      updateStatus: jest.fn(),
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
        {
          provide: TechnicianProfilesService,
          useValue: {
            findActiveByIds: jest.fn().mockResolvedValue([
              {
                id: 'not-tech-1',
                specialties: ['electrical'],
              },
            ]),
          },
        },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
        { provide: AutocareEventBusService, useValue: eventBus },
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

  it('replaces saved assignments, promotes draft job orders, and blocks clearing operational work', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const replacedResult = {
      id: 'job-order-1',
      status: 'assigned',
      assignments: [{ technicianUserId: 'tech-1' }],
    };
    const jobOrdersRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'job-order-1',
          status: 'draft',
          assignments: [],
        })
        .mockResolvedValueOnce({
          id: 'job-order-2',
          status: 'assigned',
          assignments: [{ technicianUserId: 'tech-1' }],
        }),
      replaceAssignments: jest.fn().mockResolvedValue(replacedResult),
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

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.replaceAssignments(
      'job-order-1',
      {
        assignedTechnicianIds: ['tech-1'],
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(jobOrdersRepository.replaceAssignments).toHaveBeenCalledWith('job-order-1', {
      assignments: [
        {
          technicianProfileId: 'tech-1',
          selectedSpecialty: 'general repair',
        },
      ],
      expectedUpdatedAt: undefined,
      status: 'assigned',
    });
    expect(result).toBe(replacedResult);

    await expect(
      service.replaceAssignments(
        'job-order-2',
        {
          assignedTechnicianIds: [],
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('downgrades assignmentless operational job orders to draft and flags finalized records for review', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const jobOrdersRepository = {
      findByStatuses: jest.fn().mockResolvedValue([
        {
          id: 'job-order-1',
          status: 'ready_for_qa',
          notes: null,
          assignments: [],
          progressEntries: [{ technicianUserId: 'tech-1' }],
        },
        {
          id: 'job-order-2',
          status: 'assigned',
          notes: 'Customer waiting for reassignment.',
          assignments: [],
          progressEntries: [],
        },
        {
          id: 'job-order-3',
          status: 'finalized',
          notes: null,
          assignments: [],
          progressEntries: [{ technicianUserId: 'tech-1' }],
        },
      ]),
      replaceAssignments: jest.fn().mockResolvedValue({}),
    };

    const usersService = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === 'tech-1') {
          return Promise.resolve({
            id,
            role: 'technician',
            isActive: true,
          });
        }

        return Promise.resolve({
          id,
          role: 'service_adviser',
          isActive: true,
        });
      }),
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
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);
    const result = await service.repairAssignmentRecovery();

    expect(jobOrdersRepository.replaceAssignments).toHaveBeenNthCalledWith(
      1,
      'job-order-1',
      expect.objectContaining({
        assignments: [],
        status: 'draft',
        notes: expect.stringContaining('[assignment-repair]'),
      }),
    );
    expect(jobOrdersRepository.replaceAssignments).toHaveBeenNthCalledWith(
      2,
      'job-order-2',
      expect.objectContaining({
        assignments: [],
        status: 'draft',
        notes: expect.stringContaining('[assignment-repair]'),
      }),
    );
    expect(result).toEqual({
      repaired: [],
      downgradedToDraft: [
        {
          jobOrderId: 'job-order-1',
          previousStatus: 'ready_for_qa',
        },
        {
          jobOrderId: 'job-order-2',
          previousStatus: 'assigned',
        },
      ],
      manualReview: [
        {
          jobOrderId: 'job-order-3',
          status: 'finalized',
        },
      ],
    });
  });

  it('restricts technician status changes to assigned operational states only', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
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
        { provide: AutocareEventBusService, useValue: eventBus },
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

  it('lets a service adviser append progress entries and mark completed items', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
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
        items: [{ id: 'item-1', requiresPhotoEvidence: false }],
        assignments: [{ technicianUserId: 'tech-1' }],
        photos: [],
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
              id: 'adviser-1',
              role: 'service_adviser',
              isActive: true,
            }),
          },
        },
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.addProgressEntry(
      'job-order-1',
      {
        workItemId: 'item-1',
        entryType: 'work_completed',
        message: 'Finished the first service.',
        completedItemIds: ['item-1'],
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(jobOrdersRepository.addProgressEntry).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        workItemId: 'item-1',
        entryType: 'work_completed',
        completedItemIds: ['item-1'],
      }),
      'adviser-1',
    );
    expect(result).toBe(updateResult);

    jobOrdersRepository.addProgressEntry.mockClear();

    await service.addProgressEntry(
      'job-order-1',
      {
        workItemId: 'item-1',
        entryType: 'work_started',
        message: 'Started the first service.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(jobOrdersRepository.addProgressEntry).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        workItemId: 'item-1',
        entryType: 'work_started',
        nextWorkshopStage: 'in_repair',
      }),
      'adviser-1',
    );
  });

  it('rejects retired technician progress and photo evidence on closed job orders', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const jobOrdersRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({
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
        { provide: AutocareEventBusService, useValue: eventBus },
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
    const eventBus = {
      publish: jest.fn(),
    };
    const finalizedResult = {
      id: 'job-order-1',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      sourceType: 'booking',
      sourceId: 'booking-1',
      serviceAdviserUserId: 'adviser-1',
      serviceAdviserCode: 'SA-1001',
      status: 'finalized',
      invoiceRecord: {
        id: 'invoice-record-1',
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
    const bookingsRepository = {
      findOptionalById: jest.fn().mockResolvedValue({
        id: 'booking-1',
        status: 'in_service',
      }),
      updateStatus: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: bookingsRepository },
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
        { provide: AutocareEventBusService, useValue: eventBus },
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
        invoiceReference: expect.stringMatching(/^INV-SVC-\d{8}-\d{6,9}$/),
        officialReceiptReference: expect.stringMatching(/^OR-\d{8}-\d{6,9}$/),
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith('service.invoice_finalized', {
      jobOrderId: 'job-order-1',
      invoiceRecordId: 'invoice-record-1',
      invoiceReference: 'INV-JO-20260413-ABC12345',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      serviceAdviserUserId: 'adviser-1',
      serviceAdviserCode: 'SA-1001',
      finalizedByUserId: 'adviser-1',
      sourceType: 'booking',
      sourceId: 'booking-1',
    });
    expect(eventBus.publish).not.toHaveBeenCalledWith(
      'service.payment_recorded',
      expect.anything(),
    );
    expect(bookingsRepository.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        status: 'completed',
      }),
    );
    expect(result).toBe(finalizedResult);
  });

  it('returns readable labels and references for job-order detail surfaces', async () => {
    const jobOrdersRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'job-order-1',
        sourceType: 'booking',
        sourceId: 'booking-1',
        jobType: 'normal',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        status: 'assigned',
        createdAt: new Date('2026-05-21T09:15:00.000Z'),
        updatedAt: new Date('2026-05-21T09:20:00.000Z'),
        items: [],
        assignments: [],
        progressEntries: [],
        photos: [],
        invoiceRecord: {
          id: 'invoice-record-1',
          invoiceReference: 'INV-SVC-20260521-091500123',
        },
      }),
    };

    const bookingsRepository = {
      findBookingReadModelByIds: jest.fn().mockResolvedValue([
        {
          id: 'booking-1',
          bookingReference: 'BK-20260521-0007',
        },
      ]),
      findOptionalById: jest.fn(),
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
            profile: {
              firstName: 'Jamie',
              lastName: 'Cruz',
            },
          });
        }

        return Promise.resolve(null);
      }),
    };

    const vehiclesRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'vehicle-1',
        make: 'Toyota',
        model: 'Vios',
        plateNumber: 'ABC-1234',
      }),
      findOwnedByUser: jest.fn(),
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
        { provide: AutocareEventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    await expect(
      service.findById('job-order-1', {
        userId: 'adviser-1',
        role: 'service_adviser',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        jobOrderReference: 'JO · BK-20260521-0007',
        sourceBookingReference: 'BK-20260521-0007',
        customerLabel: 'Jamie Cruz',
        vehicleLabel: 'Toyota Vios (ABC-1234)',
      }),
    );
  });

  it('marks workbench calendar dates from confirmed and workshop-handoff bookings', async () => {
    const jobOrdersRepository = {
      findAllSummaries: jest.fn().mockResolvedValue([]),
      findAssignedSummaries: jest.fn().mockResolvedValue([]),
    };
    const bookingsRepository = {
      findByScheduledDateRange: jest.fn().mockResolvedValue([
        { scheduledDate: '2026-05-18', status: 'in_service' },
        { scheduledDate: '2026-05-18', status: 'confirmed' },
        { scheduledDate: '2026-05-20', status: 'confirmed' },
      ]),
      findBookingReadModelByIds: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: bookingsRepository },
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
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
        { provide: AutocareEventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.listWorkbenchCalendar(
      { userId: 'adviser-1', role: 'service_adviser' },
      { month: '2026-05', scope: 'active' },
    );

    expect(bookingsRepository.findByScheduledDateRange).toHaveBeenCalledWith('2026-05-01', '2026-05-31', {
      statuses: ['confirmed', 'in_service'],
    });
    expect(result.bookingQueueDates).toEqual([
      { date: '2026-05-18', count: 2 },
      { date: '2026-05-20', count: 1 },
    ]);
  });

  it('lets service advisers see all workbench summaries for QA queue visibility', async () => {
    const jobOrdersRepository = {
      findAllSummaries: jest.fn().mockResolvedValue([
        {
          id: 'job-order-ready-for-qa',
          status: 'ready_for_qa',
          sourceType: 'booking',
          sourceId: 'booking-1',
          vehicleId: 'vehicle-1',
          serviceAdviserCode: 'SA-1001',
          assignments: [{ technicianUserId: 'tech-1' }],
          createdAt: new Date('2026-05-20T08:00:00.000Z'),
          updatedAt: new Date('2026-05-20T09:00:00.000Z'),
        },
      ]),
      findAssignedSummaries: jest.fn().mockResolvedValue([]),
    };
    const bookingsRepository = {
      findBookingReadModelByIds: jest.fn().mockResolvedValue([
        { id: 'booking-1', scheduledDate: '2026-05-21', bookingReference: 'BK-20260521-0001' },
      ]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: bookingsRepository },
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
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
        { provide: AutocareEventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.listWorkbenchSummaries(
      { userId: 'adviser-1', role: 'service_adviser' },
      { month: '2026-05', scope: 'active' },
    );

    expect(jobOrdersRepository.findAllSummaries).toHaveBeenCalled();
    expect(jobOrdersRepository.findAssignedSummaries).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        id: 'job-order-ready-for-qa',
        workDate: '2026-05-21',
        status: 'ready_for_qa',
        sourceBookingReference: 'BK-20260521-0001',
      }),
    ]);
  });

  it('syncs linked back-jobs to resolved when a rework job order is finalized', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const finalizedResult = {
      id: 'job-order-rework-1',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      sourceType: 'back_job',
      sourceId: 'back-job-1',
      serviceAdviserUserId: 'adviser-1',
      serviceAdviserCode: 'SA-1001',
      status: 'finalized',
      invoiceRecord: {
        id: 'invoice-record-1',
        invoiceReference: 'INV-JO-20260504-REWORK001',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
      },
    };

    const jobOrdersRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'job-order-rework-1',
        status: 'ready_for_qa',
        sourceType: 'back_job',
        sourceId: 'back-job-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        items: [{ id: 'item-1', isCompleted: true }],
        assignments: [{ technicianUserId: 'tech-1' }],
        invoiceRecord: null,
      }),
      finalize: jest.fn().mockResolvedValue(finalizedResult),
    };
    const backJobsRepository = {
      findOptionalById: jest.fn().mockResolvedValue({
        id: 'back-job-1',
        status: 'in_progress',
        reworkJobOrderId: 'job-order-rework-1',
        resolutionNotes: null,
      }),
      linkReworkJobOrder: jest.fn(),
      updateStatus: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
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
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
        {
          provide: QualityGatesService,
          useValue: {
            beginQualityGate: jest.fn(),
            assertReleaseAllowed: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.finalize(
      'job-order-rework-1',
      {
        summary: 'Rework completed and ready for closure review.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(backJobsRepository.updateStatus).toHaveBeenCalledWith('back-job-1', {
      status: 'resolved',
      resolutionNotes: 'Linked rework job order finalized and ready for closure review.',
    });
    expect(result).toBe(finalizedResult);
  });

  it('records invoice settlement only for finalized job orders and emits the paid service event', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const paidResult = {
      id: 'job-order-1',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      sourceType: 'booking',
      sourceId: 'booking-1',
      serviceAdviserUserId: 'adviser-1',
      serviceAdviserCode: 'SA-1001',
      status: 'finalized',
      invoiceRecord: {
        id: 'invoice-record-1',
        invoiceReference: 'INV-JO-20260413-ABC12345',
        paymentStatus: 'paid',
        amountPaidCents: 159900,
        paymentMethod: 'cash',
        paymentReference: 'OR-2026-0001',
        paidAt: new Date('2026-05-14T10:30:00.000Z'),
      },
    };

    const jobOrdersRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'job-order-1',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        sourceType: 'booking',
        sourceId: 'booking-1',
        status: 'finalized',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        items: [{ id: 'item-1', isCompleted: true }],
        assignments: [{ technicianUserId: 'tech-1' }],
        invoiceRecord: {
          id: 'invoice-record-1',
          invoiceReference: 'INV-JO-20260413-ABC12345',
          paymentStatus: 'pending_payment',
        },
      }),
      recordInvoicePayment: jest.fn().mockResolvedValue(paidResult),
    };

    const bookingsRepository = {
      findOptionalById: jest.fn().mockResolvedValue({
        id: 'booking-1',
        requestedServices: [
          {
            service: {
              id: 'collision_repair',
              categoryId: 'repair',
            },
          },
        ],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: bookingsRepository },
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
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.recordInvoicePayment(
      'job-order-1',
      {
        amountPaidCents: 159900,
        paymentMethod: 'cash',
        reference: 'OR-2026-0001',
        receivedAt: '2026-05-14T10:30:00.000Z',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(jobOrdersRepository.recordInvoicePayment).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        amountPaidCents: 159900,
        paymentMethod: 'cash',
        reference: 'OR-2026-0001',
        recordedByUserId: 'adviser-1',
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith('service.payment_recorded', {
      jobOrderId: 'job-order-1',
      invoiceRecordId: 'invoice-record-1',
      invoiceReference: 'INV-JO-20260413-ABC12345',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      serviceAdviserUserId: 'adviser-1',
      serviceAdviserCode: 'SA-1001',
      recordedByUserId: 'adviser-1',
      sourceType: 'booking',
      sourceId: 'booking-1',
      amountPaidCents: 159900,
      currencyCode: 'PHP',
      paidAt: '2026-05-14T10:30:00.000Z',
      settlementStatus: 'paid',
      paymentMethod: 'cash',
      paymentReference: 'OR-2026-0001',
      serviceTypeCode: 'collision_repair',
      serviceCategoryCode: 'repair',
    });
    expect(result).toBe(paidResult);
  });

  it('rejects invoice generation for incomplete, blocked, or already-invoiced job orders', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
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
        { provide: AutocareEventBusService, useValue: eventBus },
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

  it('allows the claimed adviser to finalize and completes the Job Order claim', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const qualityGatesService = {
      beginQualityGate: jest.fn(),
      assertReleaseAllowed: jest.fn().mockResolvedValue(undefined),
    };
    const finalizedResult = {
      id: 'job-order-1',
      customerUserId: 'customer-1',
      vehicleId: 'vehicle-1',
      sourceType: 'booking',
      sourceId: 'booking-1',
      serviceAdviserUserId: 'adviser-owner',
      serviceAdviserCode: 'SA-OWNER',
      status: 'finalized',
      invoiceRecord: {
        id: 'invoice-record-1',
        invoiceReference: 'INV-JO-20260413-OWNER123',
        serviceAdviserUserId: 'adviser-owner',
        serviceAdviserCode: 'SA-OWNER',
      },
    };
    const jobOrdersRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({
          id: 'job-order-1',
          status: 'ready_for_qa',
          serviceAdviserUserId: 'adviser-owner',
          serviceAdviserCode: 'SA-OWNER',
          items: [{ id: 'item-1', isCompleted: true }],
          assignments: [{ technicianUserId: 'tech-1' }],
          invoiceRecord: null,
        }),
      finalize: jest.fn().mockResolvedValue(finalizedResult),
    };
    const staffWorkQueuesService = {
      completeClaim: jest.fn().mockResolvedValue(null),
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
            findById: jest.fn().mockImplementation((id: string) => {
              if (id === 'adviser-other') {
                return Promise.resolve({
                  id,
                  role: 'service_adviser',
                  isActive: true,
                });
              }

              if (id === 'super-admin-1') {
                return Promise.resolve({
                  id,
                  role: 'super_admin',
                  isActive: true,
                });
              }

              return Promise.resolve(null);
            }),
          },
        },
        { provide: VehiclesRepository, useValue: { findOwnedByUser: jest.fn() } },
        { provide: QualityGatesService, useValue: qualityGatesService },
        { provide: StaffWorkQueuesService, useValue: staffWorkQueuesService },
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    const result = await service.finalize(
      'job-order-1',
      {
        summary: 'Claimed adviser completed the release after QA.',
      },
      {
        userId: 'adviser-other',
        role: 'service_adviser',
      },
    );

    expect(qualityGatesService.assertReleaseAllowed).toHaveBeenCalledWith('job-order-1');
    expect(jobOrdersRepository.finalize).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        finalizedByUserId: 'adviser-other',
        summary: 'Claimed adviser completed the release after QA.',
      }),
    );
    expect(staffWorkQueuesService.completeClaim).toHaveBeenCalledWith(
      'job_order',
      'job_order',
      'job-order-1',
      'adviser-other',
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      'service.invoice_finalized',
      expect.objectContaining({
        finalizedByUserId: 'adviser-other',
        serviceAdviserUserId: 'adviser-owner',
      }),
    );
    expect(result).toBe(finalizedResult);
  });

  it('creates a rework job order from an approved back-job case and links the lineage', async () => {
    const eventBus = {
      publish: jest.fn(),
    };
    const backJobsRepository = {
      findOptionalById: jest.fn().mockResolvedValue({
        id: 'back-job-1',
        status: 'approved_for_rework',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        originalJobOrderId: 'job-order-original-1',
        reworkJobOrderId: null,
        returnInspectionId: 'inspection-1',
        returnInspection: {
          id: 'inspection-1',
          vehicleId: 'vehicle-1',
          inspectionType: 'return',
          status: 'completed',
        },
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
        { provide: AutocareEventBusService, useValue: eventBus },
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

  it('blocks rework job-order creation when the linked return inspection is not completed', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        {
          provide: JobOrdersRepository,
          useValue: {
            hasBackJobSource: jest.fn().mockResolvedValue(false),
          },
        },
        { provide: BookingsRepository, useValue: { findOptionalById: jest.fn() } },
        {
          provide: BackJobsRepository,
          useValue: {
            findOptionalById: jest.fn().mockResolvedValue({
              id: 'back-job-1',
              status: 'approved_for_rework',
              customerUserId: 'customer-1',
              vehicleId: 'vehicle-1',
              originalJobOrderId: 'job-order-original-1',
              reworkJobOrderId: null,
              returnInspectionId: 'inspection-1',
              returnInspection: {
                id: 'inspection-1',
                vehicleId: 'vehicle-1',
                inspectionType: 'return',
                status: 'needs_followup',
              },
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
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
          },
        },
        {
          provide: VehiclesRepository,
          useValue: {
            findOwnedByUser: jest.fn().mockResolvedValue({
              id: 'vehicle-1',
              userId: 'customer-1',
            }),
          },
        },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
        { provide: AutocareEventBusService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    await expect(
      service.create(
        {
          sourceType: 'back_job',
          sourceId: 'back-job-1',
          customerUserId: 'customer-1',
          vehicleId: 'vehicle-1',
          serviceAdviserUserId: 'adviser-1',
          serviceAdviserCode: 'SA-1001',
          items: [{ name: 'Warranty rework' }],
          assignedTechnicianIds: ['tech-1'],
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toThrow('Only back jobs with a completed return inspection can create rework job orders');
  });
});
