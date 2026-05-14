import { rm } from 'fs/promises';
import { join } from 'path';

import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';
import { InsuranceRepository } from '../src/modules/insurance/repositories/insurance.repository';

const insuranceUploadRuntimeDirectory = join(
  process.cwd(),
  '.runtime',
  'uploads',
  'insurance-documents',
);

function seedInsuranceInquiryWorkflowState(
  app: Awaited<ReturnType<typeof createMainServiceTestApp>>['app'],
  inquiryId: string,
  patch: Record<string, unknown>,
) {
  const insuranceRepository = app.get(InsuranceRepository) as {
    inquiries?: Map<string, Record<string, unknown>>;
  };
  const inquiry = insuranceRepository.inquiries?.get(inquiryId);

  if (!insuranceRepository.inquiries || !inquiry) {
    throw new Error(`Unable to seed insurance inquiry workflow state for ${inquiryId}`);
  }

  insuranceRepository.inquiries.set(inquiryId, {
    ...inquiry,
    ...patch,
    updatedAt: new Date(),
  });
}

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
          status: 'approved',
          reviewNotes: 'Review completed and approved for the next workflow step.',
        });
      expect(approvedResponse.status).toBe(200);
      expect(approvedResponse.body.status).toBe('approved');

      const closedResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'closed',
          reviewNotes: 'Case closed after review completion.',
        });
      expect(closedResponse.status).toBe(200);
      expect(closedResponse.body.status).toBe('closed');

      const customerReadResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${createInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(customerReadResponse.status).toBe(200);
      expect(customerReadResponse.body).toEqual(
        expect.objectContaining({
          id: createInquiryResponse.body.id,
          status: 'closed',
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
          status: 'closed',
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

      const invalidDocumentTypeResponse = await request(app.getHttpServer())
        .post(`/api/insurance/inquiries/${createInquiryResponse.body.id}/documents`)
        .set('Authorization', `Bearer ${customerOneLogin.body.accessToken}`)
        .send({
          fileName: 'unsupported-document.txt',
          fileUrl: 'https://files.autocare.local/insurance/unsupported-document.txt',
          documentType: 'unsupported',
        });
      expect(invalidDocumentTypeResponse.status).toBe(400);

      const rejectedResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'rejected',
          reviewNotes: 'Rejecting this guard-case inquiry so document upload locks can be verified.',
        });
      expect(rejectedResponse.status).toBe(200);

      const rejectedDocumentResponse = await request(app.getHttpServer())
        .post(`/api/insurance/inquiries/${createInquiryResponse.body.id}/documents`)
        .set('Authorization', `Bearer ${customerOneLogin.body.accessToken}`)
        .send({
          fileName: 'or-cr-scan.pdf',
          fileUrl: 'https://files.autocare.local/insurance/or-cr-scan.pdf',
          documentType: 'or_cr',
        });
      expect(rejectedDocumentResponse.status).toBe(409);

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

  it('lists insurance cases for staff with workflow filters', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.insurance.queue@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5103',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.queue@example.com',
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
        plateNumber: 'INS110C',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const filteredInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          subject: 'Proof of payment follow-up',
          description: 'Customer has submitted payment proof and needs staff review.',
        });
      expect(filteredInquiryResponse.status).toBe(201);

      const nonMatchingInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'ctpl',
          subject: 'Fresh inquiry',
          description: 'This inquiry should not match the workflow filter.',
        });
      expect(nonMatchingInquiryResponse.status).toBe(201);

      seedInsuranceInquiryWorkflowState(app, filteredInquiryResponse.body.id, {
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'upcoming',
      });

      const listResponse = await request(app.getHttpServer())
        .get('/api/insurance/inquiries?status=payment_pending&paymentStatus=proof_submitted')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0]).toEqual(
        expect.objectContaining({
          id: filteredInquiryResponse.body.id,
          status: 'payment_pending',
          paymentStatus: 'proof_submitted',
          customerDisplayName: 'Casey Customer',
          vehicleLabel: 'Toyota Vios (INS110C)',
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('uploads an insurance PDF and exposes the persisted activity event on follow-up read', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'customer.insurance.upload@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
      });

      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: customer.email,
        password: 'password123',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: customer.id,
        plateNumber: 'INS110D',
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
          subject: 'Need to upload payment proof',
          description: 'Customer is ready to upload the proof of payment PDF.',
        });
      expect(createInquiryResponse.status).toBe(201);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/insurance/inquiries/${createInquiryResponse.body.id}/documents/upload`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .field('documentType', 'proof_of_payment')
        .attach('file', Buffer.from('%PDF-1.4 test proof'), 'proof-of-payment.pdf');

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body.documents[0]).toEqual(
        expect.objectContaining({
          documentType: 'proof_of_payment',
          fileName: 'proof-of-payment.pdf',
          fileUrl: expect.stringMatching(/^upload:\/\/insurance\//),
        }),
      );
      expect(uploadResponse.body.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            action: 'document_uploaded',
            documentType: 'proof_of_payment',
          }),
        ]),
      );
      expect(uploadResponse.body.activities.at(-1)?.id).not.toMatch(/^synthetic-/);

      const readBackResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${createInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);

      expect(readBackResponse.status).toBe(200);
      expect(readBackResponse.body.documents[0]).toEqual(
        expect.objectContaining({
          documentType: 'proof_of_payment',
          fileName: 'proof-of-payment.pdf',
          fileUrl: expect.stringMatching(/^upload:\/\/insurance\//),
        }),
      );
      expect(readBackResponse.body.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: uploadResponse.body.activities.at(-1)?.id,
            action: 'document_uploaded',
            documentType: 'proof_of_payment',
          }),
        ]),
      );
    } finally {
      await app.close();
      await rm(insuranceUploadRuntimeDirectory, { recursive: true, force: true });
    }
  });
});
