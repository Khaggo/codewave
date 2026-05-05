import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { BackJobsRepository } from '@main-modules/back-jobs/repositories/back-jobs.repository';
import { BookingsRepository } from '@main-modules/bookings/repositories/bookings.repository';
import { QualityGatesService } from '@main-modules/quality-gates/services/quality-gates.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesRepository } from '@main-modules/vehicles/repositories/vehicles.repository';
import { JobOrdersRepository } from '@main-modules/job-orders/repositories/job-orders.repository';
import { JobOrdersService } from '@main-modules/job-orders/services/job-orders.service';

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

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobOrdersService,
        { provide: JobOrdersRepository, useValue: jobOrdersRepository },
        { provide: BookingsRepository, useValue: bookingsRepository },
        { provide: BackJobsRepository, useValue: { findOptionalById: jest.fn(), linkReworkJobOrder: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        { provide: VehiclesRepository, useValue: vehiclesRepository },
        { provide: QualityGatesService, useValue: { beginQualityGate: jest.fn(), assertReleaseAllowed: jest.fn() } },
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
      assignedTechnicianIds: ['tech-1'],
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

  it('repairs assignmentless operational job orders from inferred technician activity or downgrades them to draft', async () => {
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

    expect(jobOrdersRepository.replaceAssignments).toHaveBeenNthCalledWith(1, 'job-order-1', {
      assignedTechnicianIds: ['tech-1'],
      status: 'ready_for_qa',
    });
    expect(jobOrdersRepository.replaceAssignments).toHaveBeenNthCalledWith(
      2,
      'job-order-2',
      expect.objectContaining({
        assignedTechnicianIds: [],
        status: 'draft',
        notes: expect.stringContaining('[assignment-repair]'),
      }),
    );
    expect(result).toEqual({
      repaired: [
        {
          jobOrderId: 'job-order-1',
          status: 'ready_for_qa',
          assignedTechnicianIds: ['tech-1'],
        },
      ],
      downgradedToDraft: [
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

  it('lets an assigned technician append progress entries and mark completed items', async () => {
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
              id: 'tech-1',
              role: 'technician',
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
    const eventBus = {
      publish: jest.fn(),
    };
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
    expect(bookingsRepository.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        status: 'completed',
      }),
    );
    expect(result).toBe(finalizedResult);
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

  it('restricts finalize ownership to the responsible adviser while still allowing super-admin release', async () => {
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
        { provide: AutocareEventBusService, useValue: eventBus },
      ],
    }).compile();

    const service = moduleRef.get(JobOrdersService);

    await expect(
      service.finalize(
        'job-order-1',
        {
          summary: 'Different adviser should not be able to finalize this job order.',
        },
        {
          userId: 'adviser-other',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const result = await service.finalize(
      'job-order-1',
      {
        summary: 'Super admin completed the release after escalation review.',
      },
      {
        userId: 'super-admin-1',
        role: 'super_admin',
      },
    );

    expect(qualityGatesService.assertReleaseAllowed).toHaveBeenCalledWith('job-order-1');
    expect(jobOrdersRepository.finalize).toHaveBeenCalledWith(
      'job-order-1',
      expect.objectContaining({
        finalizedByUserId: 'super-admin-1',
        summary: 'Super admin completed the release after escalation review.',
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      'service.invoice_finalized',
      expect.objectContaining({
        finalizedByUserId: 'super-admin-1',
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
});
