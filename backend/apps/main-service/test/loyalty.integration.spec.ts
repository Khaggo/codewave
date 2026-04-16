import request from 'supertest';

import { createCommerceEvent } from '@shared/events/contracts/commerce-events';
import { createServiceEvent } from '@shared/events/contracts/service-events';

import { LoyaltyService } from '../src/modules/loyalty/services/loyalty.service';
import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('LoyaltyController integration', () => {
  it('manages reward catalog, applies accruals, and redeems rewards through the live API surface', async () => {
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
          rewardType: 'service_voucher',
          pointsCost: 100,
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
      const loyaltyService = app.get(LoyaltyService);

      const serviceAccrual = await loyaltyService.applyLoyaltyAccrual(
        createServiceEvent('service.invoice_finalized', {
          jobOrderId: 'job-order-1',
          invoiceRecordId: 'service-invoice-record-1',
          invoiceReference: 'SRV-INV-2026-0001',
          customerUserId: customer.id,
          vehicleId: 'vehicle-1',
          serviceAdviserUserId: 'adviser-1',
          serviceAdviserCode: 'SA-1001',
          finalizedByUserId: 'adviser-1',
          sourceType: 'booking',
          sourceId: 'booking-1',
        }),
      );
      expect(serviceAccrual.wasDuplicate).toBe(false);

      const duplicateServiceAccrual = await loyaltyService.applyLoyaltyAccrual(
        createServiceEvent('service.invoice_finalized', {
          jobOrderId: 'job-order-1',
          invoiceRecordId: 'service-invoice-record-1',
          invoiceReference: 'SRV-INV-2026-0001',
          customerUserId: customer.id,
          vehicleId: 'vehicle-1',
          serviceAdviserUserId: 'adviser-1',
          serviceAdviserCode: 'SA-1001',
          finalizedByUserId: 'adviser-1',
          sourceType: 'booking',
          sourceId: 'booking-1',
        }),
      );
      expect(duplicateServiceAccrual.wasDuplicate).toBe(true);

      await loyaltyService.applyLoyaltyAccrual(
        createCommerceEvent('invoice.payment_recorded', {
          invoiceId: 'invoice-2',
          orderId: 'order-2',
          customerUserId: customer.id,
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

      const accountResponse = await request(app.getHttpServer())
        .get(`/api/loyalty/accounts/${customer.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(accountResponse.status).toBe(200);
      expect(accountResponse.body).toEqual(
        expect.objectContaining({
          userId: customer.id,
          pointsBalance: 131,
          lifetimePointsEarned: 131,
        }),
      );

      const transactionsResponse = await request(app.getHttpServer())
        .get(`/api/loyalty/accounts/${customer.id}/transactions`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(transactionsResponse.status).toBe(200);
      expect(transactionsResponse.body).toHaveLength(2);
      expect(transactionsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sourceType: 'service_invoice',
            pointsDelta: 100,
          }),
          expect.objectContaining({
            sourceType: 'purchase_payment',
            pointsDelta: 31,
          }),
        ]),
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
          pointsCostSnapshot: 100,
          pointsBalanceAfter: 31,
          transaction: expect.objectContaining({
            pointsDelta: -100,
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
