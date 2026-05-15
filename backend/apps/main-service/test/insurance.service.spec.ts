import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { InsuranceRepository } from '@main-modules/insurance/repositories/insurance.repository';
import { InsuranceService } from '@main-modules/insurance/services/insurance.service';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

describe('InsuranceRepository', () => {
  it('hydrates staff-facing customer and vehicle labels when finding an inquiry by id', async () => {
    const insuranceDb = {
      query: {
        insuranceInquiries: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'insurance-inquiry-1',
            userId: 'customer-1',
            vehicleId: 'vehicle-1',
            inquiryType: 'comprehensive',
            purpose: 'renewal',
            subject: 'Renewal due next month',
            description: 'Customer should receive a renewal quote before the current policy expires.',
            providerName: null,
            policyNumber: null,
            notes: null,
            status: 'for_renewal',
            documentStatus: 'incomplete',
            paymentStatus: 'not_required',
            renewalStatus: 'upcoming',
            assignedStaffId: 'adviser-1',
            paymentDueAt: null,
            policyExpiryAt: new Date('2026-06-20T00:00:00.000Z'),
            renewalDueAt: new Date('2026-06-15T00:00:00.000Z'),
            reviewNotes: null,
            createdByUserId: 'adviser-1',
            reviewedByUserId: null,
            reviewedAt: null,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
            user: {
              profile: {
                firstName: 'Casey',
                lastName: 'Customer',
              },
            },
            vehicle: {
              make: 'Toyota',
              model: 'Vios',
              plateNumber: 'INS110C',
            },
            documents: [],
          }),
        },
      },
    };

    const repository = new InsuranceRepository(insuranceDb as never);
    jest.spyOn(repository, 'listActivitiesByInquiryId').mockResolvedValue([]);

    const inquiry = await repository.findById('insurance-inquiry-1');

    expect(insuranceDb.query.insuranceInquiries.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        with: expect.objectContaining({
          user: expect.any(Object),
          vehicle: true,
        }),
      }),
    );
    expect(inquiry).toEqual(
      expect.objectContaining({
        id: 'insurance-inquiry-1',
        customerDisplayName: 'Casey Customer',
        vehicleLabel: 'Toyota Vios (INS110C)',
        activities: [],
      }),
    );
  });
});

describe('InsuranceService', () => {
  it('creates an insurance inquiry when customer ownership and vehicle lineage are valid', async () => {
    const insuranceRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'submitted',
        purpose: 'quotation',
        documentStatus: 'incomplete',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'vehicle-1',
              userId: 'customer-1',
            }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    const result = await service.create(
      {
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        subject: 'Accident repair inquiry',
        description: 'Customer reported front-bumper damage after a collision.',
      },
      {
        userId: 'customer-1',
        role: 'customer',
      },
    );

    expect(insuranceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        createdByUserId: 'customer-1',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'insurance-inquiry-1',
        purpose: 'quotation',
        status: 'submitted',
        documentStatus: 'incomplete',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      }),
    );
  });

  it('accepts adviser workflow updates for payment and renewal tags', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'approved',
      }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'upcoming',
      }),
      appendActivity: jest.fn().mockResolvedValue({
        id: 'activity-1',
        inquiryId: 'insurance-inquiry-1',
        action: 'payment_due_date_updated',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateWorkflow(
      'insurance-inquiry-1',
      {
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'upcoming',
        paymentDueAt: '2026-05-30T00:00:00.000Z',
        policyExpiryAt: '2026-08-15T00:00:00.000Z',
        renewalDueAt: '2026-07-15T00:00:00.000Z',
        assignedStaffId: 'adviser-1',
        reviewNotes: 'Waiting for proof of payment validation.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(insuranceRepository.updateWorkflow).toHaveBeenCalledWith(
      'insurance-inquiry-1',
      expect.objectContaining({
        status: 'payment_pending',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'upcoming',
        assignedStaffId: 'adviser-1',
        reviewedByUserId: 'adviser-1',
        reviewedAt: expect.any(Date),
      }),
      [
        {
          action: 'payment_due_date_updated',
          actorUserId: 'adviser-1',
          notes: 'Waiting for proof of payment validation.',
        },
      ],
      undefined,
    );
  });

  it('appends renewal_quote_preparing activity when workflow moves a renewal case to quote_preparing', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'for_renewal',
        renewalStatus: 'upcoming',
      }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'for_renewal',
        renewalStatus: 'quote_preparing',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateWorkflow(
      'insurance-inquiry-1',
      {
        status: 'for_renewal',
        renewalStatus: 'quote_preparing',
        reviewNotes: 'Preparing the updated renewal quote now.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(insuranceRepository.updateWorkflow).toHaveBeenCalledWith(
      'insurance-inquiry-1',
      expect.objectContaining({
        status: 'for_renewal',
        renewalStatus: 'quote_preparing',
      }),
      [
        {
          action: 'renewal_quote_preparing',
          actorUserId: 'adviser-1',
          notes: 'Preparing the updated renewal quote now.',
        },
      ],
      undefined,
    );
  });

  it('appends payment_marked_paid activity when workflow marks a case as paid', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'payment_pending',
        paymentStatus: 'verifying',
      }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'active',
        paymentStatus: 'paid',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateWorkflow(
      'insurance-inquiry-1',
      {
        status: 'active',
        paymentStatus: 'paid',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(insuranceRepository.updateWorkflow).toHaveBeenCalledWith(
      'insurance-inquiry-1',
      expect.objectContaining({
        status: 'active',
        paymentStatus: 'paid',
      }),
      [
        {
          action: 'payment_marked_paid',
          actorUserId: 'adviser-1',
          notes: null,
        },
      ],
      undefined,
    );
  });

  it('sends workflow partial updates without overwriting omitted fields', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'payment_pending',
      }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'active',
        paymentStatus: 'paid',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateWorkflow(
      'insurance-inquiry-1',
      {
        status: 'active',
        paymentStatus: 'paid',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    const workflowPatch = insuranceRepository.updateWorkflow.mock.calls[0]?.[1];
    const workflowActivities = insuranceRepository.updateWorkflow.mock.calls[0]?.[2];

    expect(workflowPatch).toEqual(
      expect.objectContaining({
        status: 'active',
        paymentStatus: 'paid',
        reviewedByUserId: 'adviser-1',
        reviewedAt: expect.any(Date),
      }),
    );
    expect(workflowPatch).not.toHaveProperty('documentStatus');
    expect(workflowPatch).not.toHaveProperty('renewalStatus');
    expect(workflowPatch).not.toHaveProperty('assignedStaffId');
    expect(workflowPatch).not.toHaveProperty('paymentDueAt');
    expect(workflowPatch).not.toHaveProperty('policyExpiryAt');
    expect(workflowPatch).not.toHaveProperty('renewalDueAt');
    expect(workflowPatch).not.toHaveProperty('reviewNotes');
    expect(workflowActivities).toEqual([
      {
        action: 'payment_marked_paid',
        actorUserId: 'adviser-1',
        notes: null,
      },
    ]);
  });

  it('does not append payment_due_date_updated when the workflow receives the same due date', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'payment_pending',
        paymentDueAt: new Date('2026-05-30T00:00:00.000Z'),
      }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'active',
        paymentDueAt: new Date('2026-05-30T00:00:00.000Z'),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateWorkflow(
      'insurance-inquiry-1',
      {
        status: 'active',
        paymentDueAt: '2026-05-30T00:00:00.000Z',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(insuranceRepository.updateWorkflow).toHaveBeenCalledWith(
      'insurance-inquiry-1',
      expect.objectContaining({
        status: 'active',
        paymentDueAt: new Date('2026-05-30T00:00:00.000Z'),
      }),
      [],
      undefined,
    );
  });

  it('allows same-status workflow updates for payment metadata and review notes', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'payment_pending',
        paymentStatus: 'unpaid',
        paymentDueAt: null,
      }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'payment_pending',
        paymentStatus: 'verifying',
        paymentDueAt: new Date('2026-05-30T00:00:00.000Z'),
        reviewNotes: 'Collections is validating payment submission.',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.updateWorkflow(
        'insurance-inquiry-1',
        {
          status: 'payment_pending',
          paymentStatus: 'verifying',
          paymentDueAt: '2026-05-30T00:00:00.000Z',
          reviewNotes: 'Collections is validating payment submission.',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'insurance-inquiry-1',
        status: 'payment_pending',
        paymentStatus: 'verifying',
      }),
    );

    expect(insuranceRepository.updateWorkflow).toHaveBeenCalledWith(
      'insurance-inquiry-1',
      expect.objectContaining({
        status: 'payment_pending',
        paymentStatus: 'verifying',
        paymentDueAt: new Date('2026-05-30T00:00:00.000Z'),
        reviewNotes: 'Collections is validating payment submission.',
      }),
      [
        {
          action: 'payment_verification_started',
          actorUserId: 'adviser-1',
          notes: 'Collections is validating payment submission.',
        },
        {
          action: 'payment_due_date_updated',
          actorUserId: 'adviser-1',
          notes: 'Collections is validating payment submission.',
        },
      ],
      undefined,
    );
  });

  it('rejects customer inquiry creation for another user or mismatched vehicle', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: { create: jest.fn() } },
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
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'vehicle-1',
              userId: 'customer-2',
            }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.create(
        {
          userId: 'customer-1',
          vehicleId: 'vehicle-1',
          inquiryType: 'ctpl',
          subject: 'Policy renewal question',
          description: 'Customer asked about CTPL renewal requirements.',
        },
        {
          userId: 'customer-2',
          role: 'customer',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.create(
        {
          userId: 'customer-1',
          vehicleId: 'vehicle-1',
          inquiryType: 'ctpl',
          subject: 'Policy renewal question',
          description: 'Customer asked about CTPL renewal requirements.',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates or updates an insurance record when inquiry review is closed', async () => {
    const notificationsService = {
      applyTrigger: jest.fn().mockResolvedValue({ triggerName: 'insurance.inquiry_status_changed' }),
    };

    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'active',
        subject: 'Accident repair inquiry',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'closed',
        subject: 'Accident repair inquiry',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateStatus(
      'insurance-inquiry-1',
      {
        status: 'closed',
        reviewNotes: 'Internal review is complete and the case is now closed.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(insuranceRepository.updateStatus).toHaveBeenCalledWith(
      'insurance-inquiry-1',
      expect.objectContaining({
        status: 'closed',
        reviewedByUserId: 'adviser-1',
        reviewedAt: expect.any(Date),
      }),
      expect.objectContaining({
        inquiryId: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        status: 'closed',
      }),
    );
    expect(notificationsService.applyTrigger).not.toHaveBeenCalled();
  });

  it('creates a record and does not emit a customer reminder when workflow closes an inquiry', async () => {
    const notificationsService = {
      applyTrigger: jest.fn().mockResolvedValue({ triggerName: 'insurance.inquiry_status_changed' }),
    };

    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'active',
        subject: 'Accident repair inquiry',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'closed',
        subject: 'Accident repair inquiry',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateWorkflow(
      'insurance-inquiry-1',
      {
        status: 'closed',
        reviewNotes: 'Collections workflow completed and the case is closed.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(insuranceRepository.updateWorkflow).toHaveBeenCalledWith(
      'insurance-inquiry-1',
      expect.objectContaining({
        status: 'closed',
        reviewedByUserId: 'adviser-1',
        reviewedAt: expect.any(Date),
      }),
      [],
      expect.objectContaining({
        inquiryId: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        status: 'closed',
      }),
    );
    expect(notificationsService.applyTrigger).not.toHaveBeenCalled();
  });

  it('emits a missing-documents customer reminder when status enters needs_documents', async () => {
    const notificationsService = {
      applyTrigger: jest.fn().mockResolvedValue({ triggerName: 'insurance.inquiry_status_changed' }),
    };

    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'under_review',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        subject: 'Accident repair inquiry',
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'needs_documents',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        subject: 'Accident repair inquiry',
        reviewedAt: new Date('2026-05-15T04:00:00.000Z'),
        updatedAt: new Date('2026-05-15T04:00:00.000Z'),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateStatus(
      'insurance-inquiry-1',
      {
        status: 'needs_documents',
        reviewNotes: 'Please upload the required documents.',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(notificationsService.applyTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'insurance.inquiry_status_changed',
        sourceDomain: 'main-service.insurance',
        payload: expect.objectContaining({
          inquiryId: 'insurance-inquiry-1',
          userId: 'customer-1',
          status: 'needs_documents',
          paymentStatus: 'not_required',
          renewalStatus: 'not_applicable',
          customerReminderState: 'needs_documents',
          transitionedAt: '2026-05-15T04:00:00.000Z',
          subject: 'Accident repair inquiry',
        }),
      }),
    );
  });

  it('bubbles workflow persistence failures before any close side effects run', async () => {
    const notificationsService = {
      applyTrigger: jest.fn(),
    };

    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'active',
        subject: 'Accident repair inquiry',
      }),
      updateWorkflow: jest.fn().mockRejectedValue(new Error('Simulated workflow persistence failure')),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.updateWorkflow(
        'insurance-inquiry-1',
        {
          status: 'closed',
          reviewNotes: 'Collections workflow completed and the case is closed.',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toThrow('Simulated workflow persistence failure');

    expect(notificationsService.applyTrigger).not.toHaveBeenCalled();
  });

  it('returns a closed status response when status notifications fail after commit', async () => {
    const notificationsService = {
      applyTrigger: jest.fn().mockRejectedValue(new Error('Simulated notification failure')),
    };

    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'active',
        subject: 'Accident repair inquiry',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'closed',
        subject: 'Accident repair inquiry',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.updateStatus(
        'insurance-inquiry-1',
        {
          status: 'closed',
          reviewNotes: 'Internal review is complete and the case is now closed.',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'insurance-inquiry-1',
        status: 'closed',
      }),
    );
  });

  it('returns a closed workflow response when status notifications fail after commit', async () => {
    const notificationsService = {
      applyTrigger: jest.fn().mockRejectedValue(new Error('Simulated notification failure')),
    };

    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'active',
        subject: 'Accident repair inquiry',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'closed',
        subject: 'Accident repair inquiry',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
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
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.updateWorkflow(
        'insurance-inquiry-1',
        {
          status: 'closed',
          reviewNotes: 'Collections workflow completed and the case is closed.',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'insurance-inquiry-1',
        status: 'closed',
      }),
    );
  });

  it('blocks document uploads once an inquiry is rejected or closed', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        status: 'rejected',
      }),
      addDocument: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.addDocument(
        'insurance-inquiry-1',
        {
          fileName: 'or-cr-scan.pdf',
          fileUrl: 'https://files.autocare.local/insurance/or-cr-scan.pdf',
          documentType: 'or_cr',
        },
        {
          userId: 'customer-1',
          role: 'customer',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(insuranceRepository.addDocument).not.toHaveBeenCalled();
  });

  it('emits a renewal reminder when a manual renewal follow-up is created', async () => {
    const createdRenewalInquiry = {
      id: 'renewal-inquiry-1',
      userId: 'customer-1',
      vehicleId: 'vehicle-1',
      inquiryType: 'comprehensive',
      purpose: 'renewal',
      subject: 'Renewal due next month',
      description: 'Customer should receive a renewal quote before the current policy expires.',
      providerName: null,
      policyNumber: null,
      notes: null,
      status: 'for_renewal',
      documentStatus: 'incomplete',
      paymentStatus: 'not_required',
      renewalStatus: 'upcoming',
      assignedStaffId: 'adviser-1',
      paymentDueAt: null,
      policyExpiryAt: null,
      renewalDueAt: new Date('2026-06-15T00:00:00.000Z'),
      reviewNotes: null,
      createdByUserId: 'adviser-1',
      reviewedByUserId: null,
      reviewedAt: new Date('2026-05-15T06:00:00.000Z'),
      createdAt: new Date('2026-05-15T06:00:00.000Z'),
      updatedAt: new Date('2026-05-15T06:00:00.000Z'),
    };

    const insuranceRepository = {
      createRenewalFollowUp: jest.fn().mockResolvedValue(createdRenewalInquiry),
    };
    const notificationsService = {
      applyTrigger: jest.fn().mockResolvedValue({ triggerName: 'insurance.inquiry_status_changed' }),
    };
    const findUserById = jest.fn(async (userId: string) => {
      if (userId === 'adviser-1') {
        return {
          id: 'adviser-1',
          role: 'service_adviser',
          isActive: true,
        };
      }

      if (userId === 'customer-1') {
        return {
          id: 'customer-1',
          role: 'customer',
          isActive: true,
        };
      }

      return null;
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        {
          provide: UsersService,
          useValue: {
            findById: findUserById,
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
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.createRenewalFollowUp(
      {
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        subject: 'Renewal due next month',
        description: 'Customer should receive a renewal quote before the current policy expires.',
        renewalDueAt: '2026-06-15T00:00:00.000Z',
        assignedStaffId: 'adviser-1',
      },
      {
        userId: 'adviser-1',
        role: 'service_adviser',
      },
    );

    expect(notificationsService.applyTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'insurance.inquiry_status_changed',
        sourceDomain: 'main-service.insurance',
        payload: expect.objectContaining({
          inquiryId: 'renewal-inquiry-1',
          userId: 'customer-1',
          status: 'for_renewal',
          paymentStatus: 'not_required',
          renewalStatus: 'upcoming',
          customerReminderState: 'for_renewal',
          transitionedAt: '2026-05-15T06:00:00.000Z',
          subject: 'Renewal due next month',
        }),
      }),
    );
  });

  it('rejects manual renewal follow-up creation when assignedStaffId does not resolve to an active staff reviewer', async () => {
    const insuranceRepository = {
      createRenewalFollowUp: jest.fn(),
    };
    const findUserById = jest.fn(async (userId: string) => {
      if (userId === 'adviser-1') {
        return {
          id: 'adviser-1',
          role: 'service_adviser',
          isActive: true,
        };
      }

      if (userId === 'customer-1') {
        return {
          id: 'customer-1',
          role: 'customer',
          isActive: true,
        };
      }

      return null;
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        {
          provide: UsersService,
          useValue: {
            findById: findUserById,
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
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.createRenewalFollowUp(
        {
          userId: 'customer-1',
          vehicleId: 'vehicle-1',
          inquiryType: 'comprehensive',
          subject: 'Renewal due next month',
          description: 'Customer should receive a renewal quote before the current policy expires.',
          renewalDueAt: '2026-06-15T00:00:00.000Z',
          assignedStaffId: 'missing-adviser-id',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(insuranceRepository.createRenewalFollowUp).not.toHaveBeenCalled();
  });

  it('rejects workflow updates when assignedStaffId belongs to a non-staff account', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'approved',
      }),
      updateWorkflow: jest.fn(),
    };
    const findUserById = jest.fn(async (userId: string) => {
      if (userId === 'adviser-1') {
        return {
          id: 'adviser-1',
          role: 'service_adviser',
          isActive: true,
        };
      }

      if (userId === 'customer-2') {
        return {
          id: 'customer-2',
          role: 'customer',
          isActive: true,
        };
      }

      return null;
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        {
          provide: UsersService,
          useValue: {
            findById: findUserById,
          },
        },
        {
          provide: VehiclesService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.updateWorkflow(
        'insurance-inquiry-1',
        {
          status: 'payment_pending',
          assignedStaffId: 'customer-2',
          reviewNotes: 'Trying to assign the case to a customer account.',
        },
        {
          userId: 'adviser-1',
          role: 'service_adviser',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(insuranceRepository.updateWorkflow).not.toHaveBeenCalled();
  });

  it('allows explicit repeated single-case reminders for the same insurance inquiry', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'case-repeat',
        userId: 'customer-1',
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'unpaid',
        renewalStatus: 'not_applicable',
        subject: 'Payment reminder repeat case',
      }),
    };

    const notificationsService = {
      enqueueNotification: jest.fn().mockResolvedValue({ id: 'notification-repeat', status: 'sent' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        { provide: NotificationsService, useValue: notificationsService },
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
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.sendManualReminders(
      {
        reminderType: 'payment_pending',
        targetMode: 'single_case',
        selectedIds: ['case-repeat'],
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    );

    await service.sendManualReminders(
      {
        reminderType: 'payment_pending',
        targetMode: 'single_case',
        selectedIds: ['case-repeat'],
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    );

    expect(notificationsService.enqueueNotification).toHaveBeenCalledTimes(2);
  });

  it('deduplicates selected ids before sending reminders so duplicate selections do not send twice', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'case-duplicate',
        userId: 'customer-1',
        status: 'needs_documents',
        documentStatus: 'incomplete',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        subject: 'Duplicate selection case',
      }),
    };

    const notificationsService = {
      enqueueNotification: jest.fn().mockResolvedValue({ id: 'notification-duplicate', status: 'sent' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        { provide: NotificationsService, useValue: notificationsService },
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
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    const result = await service.sendManualReminders(
      {
        reminderType: 'missing_documents',
        targetMode: 'selected_cases',
        selectedIds: ['case-duplicate', 'case-duplicate'],
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    );

    expect(insuranceRepository.findById).toHaveBeenCalledTimes(1);
    expect(notificationsService.enqueueNotification).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        targetedCount: 1,
        eligibleCount: 1,
        sentCount: 1,
        skippedCount: 0,
        failedCount: 0,
      }),
    );
  });

  it('resolves filtered-results reminder targets from the staff queue filters', async () => {
    const insuranceRepository = {
      listForStaff: jest.fn().mockResolvedValue([
        {
          id: 'case-renewal',
          userId: 'customer-1',
          status: 'for_renewal',
          documentStatus: 'complete',
          paymentStatus: 'paid',
          renewalStatus: 'upcoming',
          subject: 'Renewal target',
        },
      ]),
    };

    const notificationsService = {
      enqueueNotification: jest.fn().mockResolvedValue({ id: 'notification-renewal', status: 'sent' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        { provide: NotificationsService, useValue: notificationsService },
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
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    const result = await service.sendManualReminders(
      {
        reminderType: 'renewal_follow_up',
        targetMode: 'filtered_results',
        filters: {
          status: 'for_renewal',
          renewalStatus: 'upcoming',
        },
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    );

    expect(insuranceRepository.listForStaff).toHaveBeenCalledWith({
      status: 'for_renewal',
      renewalStatus: 'upcoming',
    });
    expect(result).toEqual(
      expect.objectContaining({
        targetedCount: 1,
        eligibleCount: 1,
        sentCount: 1,
        skippedCount: 0,
        failedCount: 0,
      }),
    );
  });

  it('records a case activity entry when a manual reminder is successfully sent', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'case-activity',
        userId: 'customer-1',
        status: 'needs_documents',
        documentStatus: 'incomplete',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        subject: 'Reminder activity case',
      }),
      appendActivity: jest.fn().mockResolvedValue({
        id: 'activity-1',
        inquiryId: 'case-activity',
        action: 'manual_reminder_sent',
      }),
    };

    const notificationsService = {
      enqueueNotification: jest.fn().mockResolvedValue({ id: 'notification-activity', status: 'sent' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        { provide: NotificationsService, useValue: notificationsService },
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
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.sendManualReminders(
      {
        reminderType: 'missing_documents',
        targetMode: 'single_case',
        selectedIds: ['case-activity'],
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    );

    expect(insuranceRepository.appendActivity).toHaveBeenCalledWith('case-activity', {
      action: 'manual_reminder_sent',
      actorUserId: 'adviser-1',
      notes: 'missing_documents',
    });
  });

  it('sends manual broadcasts with customer deduplication and partial success summaries', async () => {
    const insuranceRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'case-customer-1-a',
          userId: 'customer-1',
          status: 'submitted',
          documentStatus: 'incomplete',
          paymentStatus: 'not_required',
          renewalStatus: 'not_applicable',
          subject: 'Customer one first case',
        })
        .mockResolvedValueOnce({
          id: 'case-customer-1-b',
          userId: 'customer-1',
          status: 'active',
          documentStatus: 'complete',
          paymentStatus: 'paid',
          renewalStatus: 'not_applicable',
          subject: 'Customer one second case',
        })
        .mockResolvedValueOnce({
          id: 'case-skipped',
          userId: 'customer-2',
          status: 'closed',
          documentStatus: 'complete',
          paymentStatus: 'paid',
          renewalStatus: 'renewed',
          subject: 'Closed case',
        })
        .mockResolvedValueOnce({
          id: 'case-failed',
          userId: 'customer-3',
          status: 'approved',
          documentStatus: 'complete',
          paymentStatus: 'not_required',
          renewalStatus: 'not_applicable',
          subject: 'Notification fails',
        }),
      appendActivity: jest.fn().mockResolvedValue({ id: 'activity-1' }),
    };

    const notificationsService = {
      enqueueNotification: jest
        .fn()
        .mockResolvedValueOnce({ id: 'notification-1', status: 'sent' })
        .mockRejectedValueOnce(new Error('Simulated broadcast notification failure')),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        { provide: NotificationsService, useValue: notificationsService },
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
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    const result = await service.sendManualBroadcasts(
      {
        targetMode: 'selected_cases',
        selectedIds: ['case-customer-1-a', 'case-customer-1-b', 'case-skipped', 'case-failed'],
        title: 'Insurance processing update',
        message: 'Please review your insurance request in the app for the latest update.',
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    );

    expect(notificationsService.enqueueNotification).toHaveBeenCalledTimes(2);
    expect(notificationsService.enqueueNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'customer-1',
        channel: 'in_app',
        title: 'Insurance processing update',
        message: 'Please review your insurance request in the app for the latest update.',
      }),
    );
    expect(notificationsService.enqueueNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 'customer-3',
        channel: 'in_app',
        title: 'Insurance processing update',
      }),
    );
    expect(insuranceRepository.appendActivity).toHaveBeenCalledTimes(2);
    expect(insuranceRepository.appendActivity).toHaveBeenNthCalledWith(1, 'case-customer-1-a', {
      action: 'manual_broadcast_sent',
      actorUserId: 'adviser-1',
      notes: 'Insurance processing update',
    });
    expect(insuranceRepository.appendActivity).toHaveBeenNthCalledWith(2, 'case-customer-1-b', {
      action: 'manual_broadcast_sent',
      actorUserId: 'adviser-1',
      notes: 'Insurance processing update',
    });
    expect(result).toEqual({
      targetedCaseCount: 4,
      eligibleCaseCount: 3,
      deduplicatedCustomerCount: 2,
      sentCount: 1,
      skippedCount: 1,
      failedCount: 1,
      results: [
        {
          inquiryId: 'case-customer-1-a',
          customerId: 'customer-1',
          status: 'sent',
          reason: null,
        },
        {
          inquiryId: 'case-customer-1-b',
          customerId: 'customer-1',
          status: 'sent',
          reason: null,
        },
        {
          inquiryId: 'case-skipped',
          customerId: 'customer-2',
          status: 'skipped',
          reason: 'case_not_broadcast_eligible',
        },
        {
          inquiryId: 'case-failed',
          customerId: 'customer-3',
          status: 'failed',
          reason: 'notification_send_failed',
        },
      ],
    });
  });

  it('treats appendActivity failures separately after a successful customer broadcast notification', async () => {
    const insuranceRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'case-activity-sent',
          userId: 'customer-1',
          status: 'submitted',
          documentStatus: 'incomplete',
          paymentStatus: 'not_required',
          renewalStatus: 'not_applicable',
          subject: 'First activity case',
        })
        .mockResolvedValueOnce({
          id: 'case-activity-failed',
          userId: 'customer-1',
          status: 'active',
          documentStatus: 'complete',
          paymentStatus: 'paid',
          renewalStatus: 'not_applicable',
          subject: 'Second activity case',
        }),
      appendActivity: jest
        .fn()
        .mockResolvedValueOnce({ id: 'activity-1' })
        .mockRejectedValueOnce(new Error('Simulated activity persistence failure')),
    };

    const notificationsService = {
      enqueueNotification: jest.fn().mockResolvedValue({ id: 'notification-1', status: 'sent' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        { provide: NotificationsService, useValue: notificationsService },
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
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    const result = await service.sendManualBroadcasts(
      {
        targetMode: 'selected_cases',
        selectedIds: ['case-activity-sent', 'case-activity-failed'],
        title: 'Insurance processing update',
        message: 'Please review your insurance request in the app for the latest update.',
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    );

    expect(notificationsService.enqueueNotification).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      targetedCaseCount: 2,
      eligibleCaseCount: 2,
      deduplicatedCustomerCount: 1,
      sentCount: 1,
      skippedCount: 0,
      failedCount: 1,
      results: [
        {
          inquiryId: 'case-activity-sent',
          customerId: 'customer-1',
          status: 'sent',
          reason: null,
        },
        {
          inquiryId: 'case-activity-failed',
          customerId: 'customer-1',
          status: 'failed',
          reason: 'activity_log_failed',
        },
      ],
    });
  });

  it('rejects manual broadcasts when filtered_results has no meaningful filters', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: { listForStaff: jest.fn() } },
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
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await expect(
      service.sendManualBroadcasts(
        {
          targetMode: 'filtered_results',
          filters: {},
          title: 'Insurance processing update',
          message: 'Please review your insurance request in the app for the latest update.',
        },
        { userId: 'adviser-1', role: 'service_adviser' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves filtered-results manual broadcast targets from the staff queue filters', async () => {
    const insuranceRepository = {
      listForStaff: jest.fn().mockResolvedValue([
        {
          id: 'case-filtered',
          userId: 'customer-1',
          status: 'payment_pending',
          documentStatus: 'complete',
          paymentStatus: 'proof_submitted',
          renewalStatus: 'not_applicable',
          subject: 'Filtered broadcast target',
        },
      ]),
      appendActivity: jest.fn().mockResolvedValue({ id: 'activity-filtered' }),
    };

    const notificationsService = {
      enqueueNotification: jest.fn().mockResolvedValue({ id: 'notification-filtered', status: 'sent' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: InsuranceRepository, useValue: insuranceRepository },
        { provide: NotificationsService, useValue: notificationsService },
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
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    const result = await service.sendManualBroadcasts(
      {
        targetMode: 'filtered_results',
        filters: {
          status: 'payment_pending',
          paymentStatus: 'proof_submitted',
        },
        title: 'Payment follow-up',
        message: 'Please upload any remaining payment support if requested.',
      },
      { userId: 'adviser-1', role: 'service_adviser' },
    );

    expect(insuranceRepository.listForStaff).toHaveBeenCalledWith({
      status: 'payment_pending',
      paymentStatus: 'proof_submitted',
    });
    expect(result).toEqual({
      targetedCaseCount: 1,
      eligibleCaseCount: 1,
      deduplicatedCustomerCount: 1,
      sentCount: 1,
      skippedCount: 0,
      failedCount: 0,
      results: [
        {
          inquiryId: 'case-filtered',
          customerId: 'customer-1',
          status: 'sent',
          reason: null,
        },
      ],
    });
  });
});
