import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('InsuranceController integration', () => {
  it('creates an inquiry, links documents, updates review state, and exposes vehicle insurance records', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.insurance@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5101',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance@example.com',
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

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customer.id,
        plateNumber: 'INS110A',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const createInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          subject: 'Accident repair inquiry',
          description: 'Customer reported front-bumper and headlight damage.',
          providerName: 'Safe Road Insurance',
          policyNumber: 'POL-2026-0042',
          notes: 'Customer will upload the OR/CR and policy copy later today.',
        });
      expect(createInquiryResponse.status).toBe(201);
      expect(createInquiryResponse.body).toEqual(
        expect.objectContaining({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          status: 'submitted',
          documents: [],
        }),
      );

      const addDocumentResponse = await request(app.getHttpServer())
        .post(`/api/insurance/inquiries/${createInquiryResponse.body.id}/documents`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          fileName: 'damage-photo-front.jpg',
          fileUrl: 'https://files.autocare.local/insurance/damage-photo-front.jpg',
          documentType: 'photo',
          notes: 'Front bumper damage before estimate review.',
        });
      expect(addDocumentResponse.status).toBe(200);
      expect(addDocumentResponse.body.documents).toHaveLength(1);

      const underReviewResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'under_review',
          reviewNotes: 'Initial document review started.',
        });
      expect(underReviewResponse.status).toBe(200);
      expect(underReviewResponse.body.status).toBe('under_review');

      const approvedResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'approved_for_record',
          reviewNotes: 'Internal tracking record approved.',
        });
      expect(approvedResponse.status).toBe(200);
      expect(approvedResponse.body.status).toBe('approved_for_record');

      const customerReadResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${createInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(customerReadResponse.status).toBe(200);
      expect(customerReadResponse.body).toEqual(
        expect.objectContaining({
          id: createInquiryResponse.body.id,
          status: 'approved_for_record',
        }),
      );

      const vehicleRecordsResponse = await request(app.getHttpServer())
        .get(`/api/vehicles/${vehicleResponse.body.id}/insurance-records`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(vehicleRecordsResponse.status).toBe(200);
      expect(vehicleRecordsResponse.body[0]).toEqual(
        expect.objectContaining({
          inquiryId: createInquiryResponse.body.id,
          vehicleId: vehicleResponse.body.id,
          status: 'approved_for_record',
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('rejects mismatched customer lineage and blocks foreign customer access', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.insurance.guard@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5102',
      });

      const customerOne = await seedAuthUser({
        email: 'customer.one.insurance@example.com',
        password: 'password123',
        firstName: 'Robin',
        lastName: 'Owner',
      });

      const customerTwo = await seedAuthUser({
        email: 'customer.two.insurance@example.com',
        password: 'password123',
        firstName: 'Jordan',
        lastName: 'Viewer',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });
      const customerOneLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customerOne.email,
        password: 'password123',
      });
      const customerTwoLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customerTwo.email,
        password: 'password123',
      });

      const vehicleOneResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customerOne.id,
        plateNumber: 'INS110B',
        make: 'Honda',
        model: 'City',
        year: 2023,
      });
      expect(vehicleOneResponse.status).toBe(201);

      const invalidCreateResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          userId: customerTwo.id,
          vehicleId: vehicleOneResponse.body.id,
          inquiryType: 'ctpl',
          subject: 'Vehicle ownership mismatch',
          description: 'Attempt to create an inquiry for the wrong vehicle owner.',
        });
      expect(invalidCreateResponse.status).toBe(409);

      const createInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerOneLogin.body.accessToken}`)
        .send({
          userId: customerOne.id,
          vehicleId: vehicleOneResponse.body.id,
          inquiryType: 'ctpl',
          subject: 'Renewal requirements',
          description: 'Customer asked for CTPL renewal requirements.',
        });
      expect(createInquiryResponse.status).toBe(201);

      const foreignReadResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${createInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerTwoLogin.body.accessToken}`);
      expect(foreignReadResponse.status).toBe(403);

      const foreignVehicleRecordsResponse = await request(app.getHttpServer())
        .get(`/api/vehicles/${vehicleOneResponse.body.id}/insurance-records`)
        .set('Authorization', `Bearer ${customerTwoLogin.body.accessToken}`);
      expect(foreignVehicleRecordsResponse.status).toBe(403);
    } finally {
      await app.close();
    }
  });
});
