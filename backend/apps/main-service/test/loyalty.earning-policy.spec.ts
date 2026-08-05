import { ForbiddenException } from '@nestjs/common';

import { LoyaltyAccrualPlannerService } from '@shared/events/loyalty-accrual-planner.service';
import { UsersService } from '@main-modules/users/services/users.service';

import { LoyaltyRepository } from '../src/modules/loyalty/repositories/loyalty.repository';
import { LoyaltyService } from '../src/modules/loyalty/services/loyalty.service';

const activeAmountRule = {
  id: 'internal-rule-1',
  name: 'INTERNAL_AMOUNT_RULE',
  description: 'Staff-only configuration description.',
  accrualSource: 'service' as const,
  formulaType: 'amount_ratio' as const,
  flatPoints: null,
  amountStepCents: 10_000,
  pointsPerStep: 1,
  minimumAmountCents: 50_000,
  eligibleServiceTypes: ['collision_repair'],
  eligibleServiceCategories: ['body_work'],
  promoLabel: 'INTERNAL_PROMO_LABEL',
  manualBenefitNote: 'Staff-only note.',
  activeFrom: null,
  activeUntil: null,
  status: 'active' as const,
  createdByUserId: 'staff-user-1',
  updatedByUserId: 'staff-user-2',
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  audits: [
    {
      id: 'internal-audit-1',
      earningRuleId: 'internal-rule-1',
      actorUserId: 'staff-user-1',
      action: 'created' as const,
      reason: 'Internal reason.',
      snapshot: {},
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    },
  ],
};

function createService(actorRole: string, rules: unknown[] = [activeAmountRule]) {
  const loyaltyRepository = {
    listActiveEarningRules: jest.fn().mockResolvedValue(rules),
    listEarningRules: jest.fn(),
  };
  const usersService = {
    findById: jest.fn().mockResolvedValue({
      id: 'actor-1',
      isActive: true,
      role: actorRole,
    }),
  };

  const service = new LoyaltyService(
    loyaltyRepository as unknown as LoyaltyRepository,
    usersService as unknown as UsersService,
    {} as LoyaltyAccrualPlannerService,
  );

  return { service, loyaltyRepository };
}

describe('LoyaltyService earning policy', () => {
  it('returns only active customer-safe formula and eligibility summaries', async () => {
    const { service, loyaltyRepository } = createService('customer');

    const response = await service.getEarningPolicy({
      userId: 'actor-1',
      role: 'customer',
    });

    expect(loyaltyRepository.listActiveEarningRules).toHaveBeenCalledWith();
    expect(loyaltyRepository.listEarningRules).not.toHaveBeenCalled();
    expect(response).toEqual({
      summary: 'Points are earned after eligible paid service invoices are settled.',
      requirements: [
        {
          formula: 'Earn 1 point for every PHP 100.00 paid on an eligible service.',
          eligibility:
            'Payment must be settled for a service invoice. A minimum payment of PHP 500.00 applies. Eligible service types: Collision repair. Eligible service categories: Body work.',
        },
      ],
      exclusions: ['Accessory purchases are not currently eligible for loyalty points.'],
    });

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('internal-rule-1');
    expect(serialized).not.toContain('internal-audit-1');
    expect(serialized).not.toContain('staff-user-1');
    expect(serialized).not.toContain('INTERNAL_PROMO_LABEL');
    expect(serialized).not.toContain('Staff-only');
  });

  it('does not expose unknown service selectors when they are internal identifiers', async () => {
    const internalServiceId = '2dd2f8e0-c25c-463b-a1d5-33e4e4ae8bb0';
    const { service } = createService('customer', [
      {
        ...activeAmountRule,
        eligibleServiceTypes: [internalServiceId],
        eligibleServiceCategories: ['internal-category-id'],
      },
    ]);

    const response = await service.getEarningPolicy({
      userId: 'actor-1',
      role: 'customer',
    });

    expect(response.requirements[0]?.eligibility).toBe(
      'Payment must be settled for a service invoice. A minimum payment of PHP 500.00 applies. Only qualifying service types selected by the workshop are eligible. Only qualifying service categories selected by the workshop are eligible.',
    );
    expect(JSON.stringify(response)).not.toContain(internalServiceId);
    expect(JSON.stringify(response)).not.toContain('internal-category-id');
  });

  it('renders flat-point rules and an empty active policy without inventing accessory eligibility', async () => {
    const flatRule = {
      ...activeAmountRule,
      formulaType: 'flat_points' as const,
      flatPoints: 5,
      amountStepCents: null,
      pointsPerStep: null,
      minimumAmountCents: null,
      eligibleServiceTypes: [],
      eligibleServiceCategories: [],
    };
    const { service } = createService('service_adviser', [flatRule]);

    await expect(
      service.getEarningPolicy({ userId: 'actor-1', role: 'service_adviser' }),
    ).resolves.toEqual({
      summary: 'Points are earned after eligible paid service invoices are settled.',
      requirements: [
        {
          formula: 'Earn 5 points for each eligible paid service invoice.',
          eligibility: 'Payment must be settled for a service invoice.',
        },
      ],
      exclusions: ['Accessory purchases are not currently eligible for loyalty points.'],
    });

    const empty = createService('super_admin', []);
    await expect(
      empty.service.getEarningPolicy({ userId: 'actor-1', role: 'super_admin' }),
    ).resolves.toEqual({
      summary: 'There are no active loyalty earning rules right now.',
      requirements: [],
      exclusions: ['Accessory purchases are not currently eligible for loyalty points.'],
    });
  });

  it.each(['customer', 'service_adviser', 'super_admin'])(
    'allows the %s role to read the policy',
    async (role) => {
      const { service } = createService(role);

      await expect(service.getEarningPolicy({ userId: 'actor-1', role })).resolves.toEqual(
        expect.objectContaining({ requirements: expect.any(Array) }),
      );
    },
  );

  it('rejects authenticated roles outside the customer and staff policy boundary', async () => {
    const { service } = createService('technician');

    await expect(
      service.getEarningPolicy({ userId: 'actor-1', role: 'technician' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
