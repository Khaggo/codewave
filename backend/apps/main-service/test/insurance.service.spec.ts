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
      upsertRecordFromInquiry: jest.fn(),
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

    expect(insuranceRepository.upsertRecordFromInquiry).toHaveBeenCalledWith(
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
