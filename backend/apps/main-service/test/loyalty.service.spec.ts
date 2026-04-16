import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { createCommerceEvent } from '@shared/events/contracts/commerce-events';
import { createServiceEvent } from '@shared/events/contracts/service-events';
import { LoyaltyAccrualPlannerService } from '@shared/events/loyalty-accrual-planner.service';
import { UsersService } from '@main-modules/users/services/users.service';

import { LoyaltyRepository } from '../src/modules/loyalty/repositories/loyalty.repository';
import { LoyaltyService } from '../src/modules/loyalty/services/loyalty.service';

describe('LoyaltyService', () => {
  it('applies service and purchase accrual plans with stable point policies', async () => {
    const loyaltyRepository = {
      applyAccrual: jest.fn().mockResolvedValue({
        account: { id: 'account-1', userId: 'customer-1', pointsBalance: 100 },
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
      createServiceEvent('service.invoice_finalized', {
        jobOrderId: 'job-order-1',
        invoiceRecordId: 'invoice-record-1',
        invoiceReference: 'SRV-INV-2026-0001',
        customerUserId: 'customer-1',
        vehicleId: 'vehicle-1',
        serviceAdviserUserId: 'adviser-1',
        serviceAdviserCode: 'SA-1001',
        finalizedByUserId: 'adviser-1',
        sourceType: 'booking',
        sourceId: 'booking-1',
      }),
    );

    expect(loyaltyRepository.applyAccrual).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        pointsAwarded: 100,
        plan: expect.objectContaining({
          accrualKind: 'service_invoice',
          idempotencyKey: 'loyalty:service.invoice_finalized:invoice-record-1',
        }),
      }),
    );

    await service.applyLoyaltyAccrual(
      createCommerceEvent('invoice.payment_recorded', {
        invoiceId: 'invoice-2',
        orderId: 'order-2',
        customerUserId: 'customer-1',
        invoiceNumber: 'INV-2026-0002',
        paymentEntryId: 'payment-entry-2',
        amountCents: 159900,
        paymentMethod: 'bank_transfer',
        receivedAt: '2026-05-14T09:00:00.000Z',
        invoiceStatus: 'paid',
        amountPaidCents: 159900,
        amountDueCents: 0,
        currencyCode: 'PHP',
      }),
    );

    expect(loyaltyRepository.applyAccrual).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        pointsAwarded: 31,
        plan: expect.objectContaining({
          accrualKind: 'purchase_payment',
          idempotencyKey: 'loyalty:invoice.payment_recorded:payment-entry-2',
        }),
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
});
