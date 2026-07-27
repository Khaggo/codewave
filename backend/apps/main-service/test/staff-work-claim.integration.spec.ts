import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('Strict staff-work claim enforcement integration', () => {
  it('rejects every protected Job Order and QA mutation without a claim header', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp({
      workClaimEnforcementMode: 'strict',
    });

    try {
      const adviser = await seedAuthUser({
        email: 'strict.claims@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Claims',
        role: 'service_adviser',
        staffCode: 'SA-CLAIMS',
      });
      const login = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      expect(login.status).toBe(200);

      const authorization = `Bearer ${login.body.accessToken}`;
      const jobOrderId = '00000000-0000-4000-8000-000000000001';
      const bookingId = '00000000-0000-4000-8000-000000000002';
      const protectedRequests = [
        request(app.getHttpServer())
          .post('/api/job-orders')
          .set('Authorization', authorization)
          .send({ sourceId: bookingId }),
        request(app.getHttpServer())
          .patch(`/api/job-orders/${jobOrderId}/assignments`)
          .set('Authorization', authorization)
          .send({ technicianIds: [] }),
        request(app.getHttpServer())
          .patch(`/api/job-orders/${jobOrderId}/status`)
          .set('Authorization', authorization)
          .send({ status: 'in_progress' }),
        request(app.getHttpServer())
          .patch(`/api/job-orders/${jobOrderId}/workshop-stage`)
          .set('Authorization', authorization)
          .send({ stage: 'progress' }),
        request(app.getHttpServer())
          .post(`/api/job-orders/${jobOrderId}/progress`)
          .set('Authorization', authorization)
          .send({ note: 'Protected progress update' }),
        request(app.getHttpServer())
          .post(`/api/job-orders/${jobOrderId}/photos`)
          .set('Authorization', authorization)
          .send({ url: 'https://example.test/evidence.jpg' }),
        request(app.getHttpServer())
          .post(`/api/job-orders/${jobOrderId}/photos/upload`)
          .set('Authorization', authorization)
          .attach('file', Buffer.from('test-evidence'), 'evidence.jpg'),
        request(app.getHttpServer())
          .post(`/api/job-orders/${jobOrderId}/finalize`)
          .set('Authorization', authorization)
          .send({ summary: 'Protected finalization' }),
        request(app.getHttpServer())
          .patch(`/api/job-orders/${jobOrderId}/qa/verdict`)
          .set('Authorization', authorization)
          .send({ verdict: 'passed' }),
      ];

      const responses = await Promise.all(protectedRequests);
      for (const response of responses) {
        expect(response.status).toBe(409);
        expect(response.body).toEqual(
          expect.objectContaining({ code: 'WORK_CLAIM_REQUIRED' }),
        );
      }
    } finally {
      await app.close();
    }
  });

  it('accepts a matching claim context and rejects a claim for another queue', async () => {
    const { app, seedAuthUser, seedWorkClaim } = await createMainServiceTestApp({
      workClaimEnforcementMode: 'strict',
    });

    try {
      const adviser = await seedAuthUser({
        email: 'strict.claim.match@example.com',
        password: 'password123',
        firstName: 'Morgan',
        lastName: 'Matcher',
        role: 'service_adviser',
        staffCode: 'SA-MATCH',
      });
      const login = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      expect(login.status).toBe(200);

      const authorization = `Bearer ${login.body.accessToken}`;
      const jobOrderId = '00000000-0000-4000-8000-000000000011';
      const matchingClaim = seedWorkClaim({
        queueType: 'job_order',
        entityType: 'job_order',
        entityId: jobOrderId,
        ownerUserId: adviser.id,
      });
      const wrongQueueClaim = seedWorkClaim({
        queueType: 'qa',
        entityType: 'job_order',
        entityId: jobOrderId,
        ownerUserId: adviser.id,
      });

      const guardedRequest = await request(app.getHttpServer())
        .patch(`/api/job-orders/${jobOrderId}/status`)
        .set('Authorization', authorization)
        .set('X-Work-Claim-Id', matchingClaim.id)
        .send({ status: 'in_progress' });
      expect(guardedRequest.status).toBe(404);

      const conflict = await request(app.getHttpServer())
        .patch(`/api/job-orders/${jobOrderId}/status`)
        .set('Authorization', authorization)
        .set('X-Work-Claim-Id', wrongQueueClaim.id)
        .send({ status: 'in_progress' });
      expect(conflict.status).toBe(409);
      expect(conflict.body).toEqual(
        expect.objectContaining({ code: 'WORK_CLAIM_CONFLICT' }),
      );
    } finally {
      await app.close();
    }
  });
});
