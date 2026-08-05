import request from 'supertest';

import { createServiceEvent } from '@shared/events/contracts/service-events';

import { LoyaltyService } from '../src/modules/loyalty/services/loyalty.service';
import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('LoyaltyController integration', () => {
  it('returns an authenticated customer-safe earning policy for customers and staff only', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'earning-policy.customer@example.com',
        password: 'password123',
        firstName: 'Policy',
        lastName: 'Customer',
      });
      await seedAuthUser({
        email: 'earning-policy.adviser@example.com',
        password: 'password123',
        firstName: 'Policy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-9010',
      });
      await seedAuthUser({
        email: 'earning-policy.technician@example.com',
        password: 'password123',
        firstName: 'Policy',
        lastName: 'Technician',
        role: 'technician',
        staffCode: 'TECH-9010',
      });
      const admin = await seedAuthUser({
        email: 'earning-policy.admin@example.com',
        password: 'password123',
        firstName: 'Policy',
        lastName: 'Admin',
        role: 'super_admin',
        staffCode: 'SA-9011',
      });

      const [customerLogin, adviserLogin, technicianLogin, adminLogin] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'earning-policy.customer@example.com',
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'earning-policy.adviser@example.com',
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'earning-policy.technician@example.com',
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'earning-policy.admin@example.com',
          password: 'password123',
        }),
      ]);

      expect(customerLogin.status).toBe(200);
      expect(adviserLogin.status).toBe(200);
      expect(technicianLogin.status).toBe(401);
      expect(adminLogin.status).toBe(200);

      const createActiveRuleResponse = await request(app.getHttpServer())
        .post('/api/admin/loyalty/earning-rules')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          name: 'Internal policy rule',
          description: 'This must never be returned to customers.',
          accrualSource: 'service',
          formulaType: 'amount_ratio',
          amountStepCents: 10_000,
          pointsPerStep: 1,
          minimumAmountCents: 50_000,
          eligibleServiceTypes: ['collision_repair'],
          eligibleServiceCategories: ['body_work'],
          promoLabel: 'Internal label',
          manualBenefitNote: 'Staff-only note',
          status: 'active',
          reason: 'Test active rule',
        });
      expect(createActiveRuleResponse.status).toBe(201);

      const createInactiveRuleResponse = await request(app.getHttpServer())
        .post('/api/admin/loyalty/earning-rules')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          name: 'Inactive policy rule',
          accrualSource: 'service',
          formulaType: 'flat_points',
          flatPoints: 999,
          status: 'inactive',
        });
      expect(createInactiveRuleResponse.status).toBe(201);

      const policyResponses = await Promise.all(
        [customerLogin, adviserLogin, adminLogin].map((login) =>
          request(app.getHttpServer())
            .get('/api/loyalty/earning-policy')
            .set('Authorization', `Bearer ${login.body.accessToken}`),
        ),
      );

      for (const policyResponse of policyResponses) {
        expect(policyResponse.status).toBe(200);
        expect(policyResponse.body).toEqual({
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
        expect(JSON.stringify(policyResponse.body)).not.toContain(createActiveRuleResponse.body.id);
        expect(JSON.stringify(policyResponse.body)).not.toContain(createInactiveRuleResponse.body.id);
        expect(JSON.stringify(policyResponse.body)).not.toContain(admin.id);
        expect(JSON.stringify(policyResponse.body)).not.toContain('Internal');
      }

      const missingTokenResponse = await request(app.getHttpServer()).get(
        '/api/loyalty/earning-policy',
      );
      expect(missingTokenResponse.status).toBe(401);

      expect(technicianLogin.body.accessToken).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it('manages reward catalog and earning rules, then accrues loyalty from settled service invoices', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'loyalty.customer@example.com',
        password: 'password123',
        firstName: 'Lara',
        lastName: 'Loyal',
      });

      await seedAuthUser({
        email: 'loyalty.admin@example.com',
        password: 'password123',
        firstName: 'Sam',
        lastName: 'Admin',
        role: 'super_admin',
        staffCode: 'SA-9001',
      });

      const [customerLogin, adminLogin] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'loyalty.customer@example.com',
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'loyalty.admin@example.com',
          password: 'password123',
        }),
      ]);

      expect(customerLogin.status).toBe(200);
      expect(adminLogin.status).toBe(200);

      const createRewardResponse = await request(app.getHttpServer())
        .post('/api/admin/loyalty/rewards')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          name: 'Free wheel alignment',
          description: 'Redeem for one complimentary wheel alignment service.',
          fulfillmentNote: 'Issue one windshield sticker at cashier on redemption.',
          rewardType: 'service_voucher',
          pointsCost: 30,
          status: 'active',
          reason: 'Initial catalog launch.',
        });

      expect(createRewardResponse.status).toBe(201);
      expect(createRewardResponse.body).toEqual(
        expect.objectContaining({
          name: 'Free wheel alignment',
          status: 'active',
          audits: [
            expect.objectContaining({
              action: 'created',
            }),
          ],
        }),
      );

      const rewardId = createRewardResponse.body.id as string;

      const createRuleResponse = await request(app.getHttpServer())
        .post('/api/admin/loyalty/earning-rules')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          name: 'Collision repair points',
          description: 'Award points only after paid collision repair jobs.',
          accrualSource: 'service',
          formulaType: 'amount_ratio',
          amountStepCents: 5000,
          pointsPerStep: 1,
          minimumAmountCents: 100000,
          eligibleServiceTypes: ['collision_repair'],
          eligibleServiceCategories: ['repair'],
          promoLabel: 'Collision Week Bonus',
          manualBenefitNote: 'Issue one loyalty sticker manually after payment.',
          status: 'active',
          reason: 'Launch paid-service-only loyalty.',
        });
      expect(createRuleResponse.status).toBe(201);
      expect(createRuleResponse.body).toEqual(
        expect.objectContaining({
          name: 'Collision repair points',
          status: 'active',
          audits: [
            expect.objectContaining({
              action: 'created',
            }),
          ],
        }),
      );

      const loyaltyService = app.get(LoyaltyService);

      const serviceAccrual = await loyaltyService.applyLoyaltyAccrual(
        createServiceEvent('service.payment_recorded', {
          jobOrderId: 'job-order-1',
          invoiceRecordId: 'service-invoice-record-1',
          invoiceReference: 'SRV-INV-2026-0001',
          customerUserId: customer.id,
          vehicleId: 'vehicle-1',
          serviceAdviserUserId: 'adviser-1',
          serviceAdviserCode: 'SA-1001',
          recordedByUserId: 'cashier-1',
          sourceType: 'booking',
          sourceId: 'booking-1',
          amountPaidCents: 159900,
          currencyCode: 'PHP',
          paidAt: '2026-05-14T09:00:00.000Z',
          settlementStatus: 'paid',
          paymentMethod: 'cash',
          serviceTypeCode: 'collision_repair',
          serviceCategoryCode: 'repair',
        }),
      );
      expect(serviceAccrual.wasDuplicate).toBe(false);

      const duplicateServiceAccrual = await loyaltyService.applyLoyaltyAccrual(
        createServiceEvent('service.payment_recorded', {
          jobOrderId: 'job-order-1',
          invoiceRecordId: 'service-invoice-record-1',
          invoiceReference: 'SRV-INV-2026-0001',
          customerUserId: customer.id,
          vehicleId: 'vehicle-1',
          serviceAdviserUserId: 'adviser-1',
          serviceAdviserCode: 'SA-1001',
          recordedByUserId: 'cashier-1',
          sourceType: 'booking',
          sourceId: 'booking-1',
          amountPaidCents: 159900,
          currencyCode: 'PHP',
          paidAt: '2026-05-14T09:00:00.000Z',
          settlementStatus: 'paid',
          paymentMethod: 'cash',
          serviceTypeCode: 'collision_repair',
          serviceCategoryCode: 'repair',
        }),
      );
      expect(duplicateServiceAccrual.wasDuplicate).toBe(true);

      const accountResponse = await request(app.getHttpServer())
        .get(`/api/loyalty/accounts/${customer.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(accountResponse.status).toBe(200);
      expect(accountResponse.body).toEqual(
        expect.objectContaining({
          userId: customer.id,
          pointsBalance: 31,
          lifetimePointsEarned: 31,
        }),
      );

      const transactionsResponse = await request(app.getHttpServer())
        .get(`/api/loyalty/accounts/${customer.id}/transactions`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(transactionsResponse.status).toBe(200);
      expect(transactionsResponse.body).toHaveLength(1);
      expect(transactionsResponse.body[0]).toEqual(
        expect.objectContaining({
          sourceType: 'service_payment',
          pointsDelta: 31,
        }),
      );

      const customerRewardsResponse = await request(app.getHttpServer())
        .get('/api/loyalty/rewards')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(customerRewardsResponse.status).toBe(200);
      expect(customerRewardsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rewardId,
            status: 'active',
          }),
        ]),
      );

      const redemptionResponse = await request(app.getHttpServer())
        .post('/api/loyalty/redemptions')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          rewardId,
          note: 'Redeemed during pickup.',
        });
      expect(redemptionResponse.status).toBe(201);
      expect(redemptionResponse.body).toEqual(
        expect.objectContaining({
          userId: customer.id,
          rewardId,
          pointsCostSnapshot: 30,
          pointsBalanceAfter: 1,
          transaction: expect.objectContaining({
            pointsDelta: -30,
            sourceType: 'reward_redemption',
          }),
        }),
      );

      const deactivateRewardResponse = await request(app.getHttpServer())
        .patch(`/api/admin/loyalty/rewards/${rewardId}/status`)
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          status: 'inactive',
          reason: 'Catalog paused for audit.',
        });
      expect(deactivateRewardResponse.status).toBe(200);
      expect(deactivateRewardResponse.body).toEqual(
        expect.objectContaining({
          status: 'inactive',
          audits: expect.arrayContaining([
            expect.objectContaining({
              action: 'deactivated',
            }),
          ]),
        }),
      );

      const customerRewardsAfterDeactivate = await request(app.getHttpServer())
        .get('/api/loyalty/rewards')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(customerRewardsAfterDeactivate.status).toBe(200);
      expect(customerRewardsAfterDeactivate.body).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: rewardId })]),
      );

      const adminRewardsAfterDeactivate = await request(app.getHttpServer())
        .get('/api/loyalty/rewards')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`);
      expect(adminRewardsAfterDeactivate.status).toBe(200);
      expect(adminRewardsAfterDeactivate.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rewardId,
            status: 'inactive',
          }),
        ]),
      );

      const listRulesResponse = await request(app.getHttpServer())
        .get('/api/admin/loyalty/earning-rules')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`);
      expect(listRulesResponse.status).toBe(200);
      expect(listRulesResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Collision repair points',
            promoLabel: 'Collision Week Bonus',
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it('blocks foreign customer access and foreign customer redemption attempts', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'loyalty.owner@example.com',
        password: 'password123',
        firstName: 'Olive',
        lastName: 'Owner',
      });

      await seedAuthUser({
        email: 'loyalty.other@example.com',
        password: 'password123',
        firstName: 'Felix',
        lastName: 'Foreign',
      });

      await seedAuthUser({
        email: 'loyalty.superadmin@example.com',
        password: 'password123',
        firstName: 'Nora',
        lastName: 'Root',
        role: 'super_admin',
        staffCode: 'SA-9002',
      });

      const [foreignCustomerLogin, adminLogin] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'loyalty.other@example.com',
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'loyalty.superadmin@example.com',
          password: 'password123',
        }),
      ]);

      const createRewardResponse = await request(app.getHttpServer())
        .post('/api/admin/loyalty/rewards')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          name: '10% parts coupon',
          rewardType: 'discount_coupon',
          pointsCost: 50,
          discountPercent: 10,
          status: 'active',
        });
      expect(createRewardResponse.status).toBe(201);

      const foreignAccountResponse = await request(app.getHttpServer())
        .get(`/api/loyalty/accounts/${customer.id}`)
        .set('Authorization', `Bearer ${foreignCustomerLogin.body.accessToken}`);
      expect(foreignAccountResponse.status).toBe(403);

      const foreignRedemptionResponse = await request(app.getHttpServer())
        .post('/api/loyalty/redemptions')
        .set('Authorization', `Bearer ${foreignCustomerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          rewardId: createRewardResponse.body.id,
        });
      expect(foreignRedemptionResponse.status).toBe(403);
    } finally {
      await app.close();
    }
  });
});
