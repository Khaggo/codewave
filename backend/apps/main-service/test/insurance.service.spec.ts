import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';

import { InsuranceRepository } from '@main-modules/insurance/repositories/insurance.repository';
import { InsuranceService } from '@main-modules/insurance/services/insurance.service';
import { UsersService } from '@main-modules/users/services/users.service';
import { VehiclesService } from '@main-modules/vehicles/services/vehicles.service';

describe('InsuranceService', () => {
  it('creates an insurance inquiry when customer ownership and vehicle lineage are valid', async () => {
    const insuranceRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        status: 'submitted',
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
        status: 'submitted',
      }),
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

  it('creates or updates an insurance record when inquiry review is approved for record', async () => {
    const insuranceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'under_review',
        providerName: 'Safe Road Insurance',
        policyNumber: 'POL-2026-0042',
      }),
      updateStatus: jest.fn().mockResolvedValue({
        id: 'insurance-inquiry-1',
        userId: 'customer-1',
        vehicleId: 'vehicle-1',
        inquiryType: 'comprehensive',
        status: 'approved_for_record',
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
      ],
    }).compile();

    const service = moduleRef.get(InsuranceService);

    await service.updateStatus(
      'insurance-inquiry-1',
      {
        status: 'approved_for_record',
        reviewNotes: 'Internal review is complete and ready for tracking.',
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
        status: 'approved_for_record',
      }),
    );
  });
});
