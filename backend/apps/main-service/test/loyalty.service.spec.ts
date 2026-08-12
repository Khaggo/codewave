import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { createServiceEvent } from '@shared/events/contracts/service-events';
import { LoyaltyAccrualPlannerService } from '@shared/events/loyalty-accrual-planner.service';
import { UsersService } from '@main-modules/users/services/users.service';

import { LoyaltyRepository } from '../src/modules/loyalty/repositories/loyalty.repository';
import { LoyaltyService } from '../src/modules/loyalty/services/loyalty.service';

describe('LoyaltyService', () => {
  it('applies service-payment accrual plans using active earning rules only', async () => {
    const loyaltyRepository = {
      listActiveEarningRules: jest.fn().mockResolvedValue([
        {
          id: 'rule-1',
          accrualSource: 'service',
          formulaType: 'flat_points',
          flatPoints: 100,
          amountStepCents: null,
          pointsPerStep: null,
          minimumAmountCents: 100000,
          eligibleServiceTypes: ['collision_repair'],
          eligibleServiceCategories: [],
        },
        {
          id: 'rule-2',
          accrualSource: 'service',
          formulaType: 'amount_ratio',
          flatPoints: null,
          amountStepCents: 5000,
          pointsPerStep: 1,
          minimumAmountCents: null,
          eligibleServiceTypes: [],
          eligibleServiceCategories: ['repair'],
        },
      ]),
      getOrCreateAccount: jest.fn().mockResolvedValue({
        id: 'account-1',
        userId: 'customer-1',
        pointsBalance: 0,
      }),
      findLatestVehicleStickerObservation: jest.fn().mockResolvedValue({
        vehicleId: 'vehicle-1',
        observation: 'verified_present',
      }),
      applyAccrual: jest.fn().mockResolvedValue({
        account: { id: 'account-1', userId: 'customer-1', pointsBalance: 125 },
        transaction: { id: 'transaction-1' },
        wasDuplicate: false,
      }),
    };

    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'customer-1',
        isActive: true,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        LoyaltyAccrualPlannerService,
        { provide: LoyaltyRepository, useValue: loyaltyRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    const service = moduleRef.get(LoyaltyService);

    await service.applyLoyaltyAccrual(
      createServiceEvent('service.payment_recorded', {
        jobOrderId: 'job-order-1',
        invoiceRecordId: 'invoice-record-1',
        invoiceReference: 'SRV-INV-2026-0001',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        recordedByUserId: 'cashier-1',
        sourceType: 'booking',
        sourceId: 'booking-1',
        amountPaidCents: 125000,
        currencyCode: 'PHP',
        paidAt: '2026-05-14T09:00:00.000Z',
        settlementStatus: 'paid',
        paymentMethod: 'cash',
        paymentReference: 'OR-2026-0001',
        serviceTypeCode: 'collision_repair',
        serviceCategoryCode: 'repair',
      }),
    );

    expect(loyaltyRepository.applyAccrual).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        pointsAwarded: 125,
        metadata: expect.objectContaining({
          appliedRuleIds: ['rule-1', 'rule-2'],
        }),
        plan: expect.objectContaining({
          accrualKind: 'service_payment',
          idempotencyKey: 'loyalty:service.payment_recorded:invoice-record-1',
        }),
      }),
    );
  });

  it('does not award points when no active earning rule matches the paid service', async () => {
    const loyaltyRepository = {
      listActiveEarningRules: jest.fn().mockResolvedValue([
        {
          id: 'rule-1',
          accrualSource: 'service',
          formulaType: 'flat_points',
          flatPoints: 100,
          amountStepCents: null,
          pointsPerStep: null,
          minimumAmountCents: 100000,
          eligibleServiceTypes: ['insurance_only'],
          eligibleServiceCategories: [],
        },
      ]),
      getOrCreateAccount: jest.fn().mockResolvedValue({
        id: 'account-1',
        userId: 'customer-1',
        pointsBalance: 0,
      }),
      findLatestVehicleStickerObservation: jest.fn().mockResolvedValue({
        vehicleId: 'vehicle-1',
        observation: 'verified_present',
      }),
      applyAccrual: jest.fn(),
    };

    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'customer-1',
        isActive: true,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        LoyaltyAccrualPlannerService,
        { provide: LoyaltyRepository, useValue: loyaltyRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    const service = moduleRef.get(LoyaltyService);

    const result = await service.applyLoyaltyAccrual(
      createServiceEvent('service.payment_recorded', {
        jobOrderId: 'job-order-1',
        invoiceRecordId: 'invoice-record-1',
        invoiceReference: 'SRV-INV-2026-0001',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        recordedByUserId: 'cashier-1',
        sourceType: 'booking',
        sourceId: 'booking-1',
        amountPaidCents: 125000,
        currencyCode: 'PHP',
        paidAt: '2026-05-14T09:00:00.000Z',
        settlementStatus: 'paid',
        paymentMethod: 'cash',
        serviceTypeCode: 'collision_repair',
        serviceCategoryCode: 'repair',
      }),
    );

    expect(loyaltyRepository.applyAccrual).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        wasAwarded: false,
        awardedPoints: 0,
        appliedRuleIds: [],
      }),
    );
  });

  it('rejects inactive rewards, insufficient balances, and foreign customer redemptions', async () => {
    const loyaltyRepository = {
      findRewardById: jest
        .fn()
        .mockResolvedValueOnce({ id: 'reward-1', status: 'inactive', pointsCost: 100 })
        .mockResolvedValueOnce({ id: 'reward-2', status: 'active', pointsCost: 200 }),
      getOrCreateAccount: jest.fn().mockResolvedValue({
        id: 'account-1',
        userId: 'customer-1',
        pointsBalance: 150,
      }),
      listVehicleStickerObservationsForUser: jest.fn().mockResolvedValue([
        {
          vehicleId: 'vehicle-1',
          vehiclePublicReference: 'VEH-2026-0001',
          vehicleMake: 'Toyota',
          vehicleModel: 'Corolla',
          vehicleYear: 2021,
          observation: 'verified_present',
          observedAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      ]),
      createRedemption: jest.fn(),
    };

    const usersService = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === 'customer-1') {
          return Promise.resolve({
            id,
            isActive: true,
            role: 'customer',
          });
        }

        if (id === 'customer-2') {
          return Promise.resolve({
            id,
            isActive: true,
            role: 'customer',
          });
        }

        return Promise.resolve(null);
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        LoyaltyAccrualPlannerService,
        { provide: LoyaltyRepository, useValue: loyaltyRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    const service = moduleRef.get(LoyaltyService);

    await expect(
      service.redeemReward(
        {
          userId: 'customer-1',
          rewardId: 'reward-1',
        },
        {
          userId: 'customer-1',
          role: 'customer',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.redeemReward(
        {
          userId: 'customer-1',
          rewardId: 'reward-2',
        },
        {
          userId: 'customer-1',
          role: 'customer',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.redeemReward(
        {
          userId: 'customer-1',
          rewardId: 'reward-2',
        },
        {
          userId: 'customer-2',
          role: 'customer',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates the default active service-payment rule when none exists yet', async () => {
    const loyaltyRepository = {
      listEarningRules: jest.fn().mockResolvedValue([]),
      createEarningRule: jest.fn().mockResolvedValue({
        id: 'default-rule-1',
        promoLabel: 'SYSTEM_DEFAULT_SERVICE_PAYMENT_V1',
        status: 'active',
      }),
    };

    const usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'admin-1',
        isActive: true,
        role: 'super_admin',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        LoyaltyAccrualPlannerService,
        { provide: LoyaltyRepository, useValue: loyaltyRepository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    const service = moduleRef.get(LoyaltyService);

    await service.ensureDefaultServicePaymentRule({
      userId: 'admin-1',
      role: 'super_admin',
    });

    expect(loyaltyRepository.createEarningRule).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        name: 'Default service payment points',
        accrualSource: 'service',
        formulaType: 'amount_ratio',
        amountStepCents: 10_000,
        pointsPerStep: 1,
        promoLabel: 'SYSTEM_DEFAULT_SERVICE_PAYMENT_V1',
        status: 'active',
      }),
    );
  });
});
