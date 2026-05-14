import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';

import { InsuranceRepository } from '@main-modules/insurance/repositories/insurance.repository';
import { InsuranceService } from '@main-modules/insurance/services/insurance.service';
import { NotificationsService } from '@main-modules/notifications/services/notifications.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

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
    expect(notificationsService.applyTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'insurance.inquiry_status_changed',
        sourceDomain: 'main-service.insurance',
        payload: expect.objectContaining({
          inquiryId: 'insurance-inquiry-1',
          userId: 'customer-1',
          status: 'closed',
          subject: 'Accident repair inquiry',
        }),
      }),
    );
  });

  it('creates a record and emits the status notification when workflow closes an inquiry', async () => {
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
    expect(notificationsService.applyTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'insurance.inquiry_status_changed',
        sourceDomain: 'main-service.insurance',
        payload: expect.objectContaining({
          inquiryId: 'insurance-inquiry-1',
          userId: 'customer-1',
          status: 'closed',
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
});
