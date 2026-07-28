import { randomUUID } from 'crypto';
import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('Customer insurance recovery integration', () => {
  it('recovers customer inquiries across sessions and keeps retries idempotent and customer-safe', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.insurance.recovery@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5102',
      });
      const customer = await seedAuthUser({
        email: 'customer.insurance.recovery@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
      });
      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customer.email,
        password: 'password123',
      });
      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INS110R',
          make: 'Toyota',
          model: 'Vios',
          year: 2024,
        });
      const clientRequestId = randomUUID();
      const payload = {
        userId: customer.id,
        vehicleId: vehicleResponse.body.id,
        clientRequestId,
        inquiryType: 'comprehensive',
        purpose: 'claim',
        subject: 'Retry-safe claim assistance',
        description: 'Customer needs guided assistance after a minor collision.',
        incidentOccurredAt: '2026-07-28T08:30:00.000Z',
        incidentLocation: 'EDSA, Quezon City',
      };

      const firstCreateResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send(payload);
      const retryCreateResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send(payload);

      expect(firstCreateResponse.status).toBe(201);
      expect(retryCreateResponse.status).toBe(201);
      expect(retryCreateResponse.body.id).toBe(firstCreateResponse.body.id);

      const staffUpdateResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${firstCreateResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'under_review',
          reviewNotes: 'Internal routing note for the adviser queue.',
          customerMessage: 'We are reviewing your request. No action is needed right now.',
        });
      expect(staffUpdateResponse.status).toBe(200);

      const mineResponse = await request(app.getHttpServer())
        .get('/api/insurance/inquiries/mine')
        .query({ vehicleId: vehicleResponse.body.id, limit: 20 })
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);

      expect(mineResponse.status).toBe(200);
      expect(mineResponse.body.page).toEqual({
        limit: 20,
        hasNext: false,
        nextCursor: null,
      });
      expect(mineResponse.body.items).toHaveLength(1);
      expect(mineResponse.body.items[0]).toEqual(
        expect.objectContaining({
          id: firstCreateResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          incidentLocation: 'EDSA, Quezon City',
          activities: [
            expect.objectContaining({
              action: 'status_under_review',
              customerMessage: 'We are reviewing your request. No action is needed right now.',
            }),
          ],
        }),
      );
      expect(mineResponse.body.items[0]).not.toHaveProperty('reviewNotes');
      expect(mineResponse.body.items[0]).not.toHaveProperty('createdByUserId');
      expect(mineResponse.body.items[0].activities[0]).not.toHaveProperty('actorUserId');
      expect(mineResponse.body.items[0].activities[0]).not.toHaveProperty('notes');

      const requirementsResponse = await request(app.getHttpServer())
        .get('/api/insurance/requirements')
        .query({ purpose: 'renewal', inquiryType: 'comprehensive' })
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(requirementsResponse.status).toBe(200);
      expect(requirementsResponse.body.requiredDocumentTypes).toEqual(['or_cr', 'policy']);
      expect(requirementsResponse.body.optionalDocumentTypes).toContain('photo');
    } finally {
      await app.close();
    }
  });
});
