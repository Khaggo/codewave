import { access, rm } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';

import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';
import { InsuranceRepository } from '../src/modules/insurance/repositories/insurance.repository';
import { NotificationsService } from '../src/modules/notifications/services/notifications.service';

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

function failNextInsuranceUploadPersistence(
  app: Awaited<ReturnType<typeof createMainServiceTestApp>>['app'],
) {
  const insuranceRepository = app.get(InsuranceRepository) as {
    failNextUploadedDocumentPersistence?: boolean;
  };

  insuranceRepository.failNextUploadedDocumentPersistence = true;
}

function failNextInsuranceWorkflowPersistence(
  app: Awaited<ReturnType<typeof createMainServiceTestApp>>['app'],
) {
  const insuranceRepository = app.get(InsuranceRepository) as {
    failNextWorkflowPersistence?: boolean;
  };

  insuranceRepository.failNextWorkflowPersistence = true;
}

function installInsuranceWorkflowRepositoryContract(
  app: Awaited<ReturnType<typeof createMainServiceTestApp>>['app'],
) {
  const insuranceRepository = app.get(InsuranceRepository) as {
    inquiries?: Map<string, Record<string, unknown>>;
    activities?: Array<Record<string, unknown>>;
    records?: Map<string, Record<string, unknown>>;
    failNextWorkflowPersistence?: boolean;
    updateStatus?: (
      id: string,
      patch: Record<string, unknown>,
      recordUpsert?: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
    updateWorkflow?: (
      id: string,
      patch: Record<string, unknown>,
      activities?: Array<Record<string, unknown>>,
      recordUpsert?: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
    findById: (id: string) => Promise<Record<string, unknown>>;
  };

  if (typeof insuranceRepository.updateWorkflow === 'function' && typeof insuranceRepository.updateStatus === 'function') {
    return;
  }

  const applyRecordUpsert = (recordUpsert: Record<string, unknown> | undefined, now: Date) => {
    if (!recordUpsert || !insuranceRepository.records) {
      return;
    }

    const existingRecordEntry = Array.from(insuranceRepository.records.entries()).find(
      ([, record]) => record.inquiryId === recordUpsert.inquiryId,
    );

    if (existingRecordEntry) {
      const [recordId, existingRecord] = existingRecordEntry;
      insuranceRepository.records.set(recordId, {
        ...existingRecord,
        ...recordUpsert,
        updatedAt: now,
      });
      return;
    }

    insuranceRepository.records.set(randomUUID(), {
      id: randomUUID(),
      ...recordUpsert,
      createdAt: now,
      updatedAt: now,
    });
  };

  insuranceRepository.updateStatus = async (id, patch, recordUpsert) => {
    const inquiry = insuranceRepository.inquiries?.get(id);

    if (!insuranceRepository.inquiries || !inquiry) {
      throw new Error(`Unable to update insurance status for ${id}`);
    }

    if (insuranceRepository.failNextWorkflowPersistence) {
      insuranceRepository.failNextWorkflowPersistence = false;
      throw new Error('Simulated workflow persistence failure');
    }

    const now = new Date();
    insuranceRepository.inquiries.set(id, {
      ...inquiry,
      ...patch,
      updatedAt: now,
    });
    applyRecordUpsert(recordUpsert, now);
    return insuranceRepository.findById(id);
  };

  insuranceRepository.updateWorkflow = async (id, patch, activities = [], recordUpsert) => {
    const inquiry = insuranceRepository.inquiries?.get(id);

    if (!insuranceRepository.inquiries || !insuranceRepository.activities || !inquiry) {
      throw new Error(`Unable to update insurance workflow for ${id}`);
    }

    if (insuranceRepository.failNextWorkflowPersistence) {
      insuranceRepository.failNextWorkflowPersistence = false;
      throw new Error('Simulated workflow persistence failure');
    }

    const now = new Date();
    insuranceRepository.inquiries.set(id, {
      ...inquiry,
      ...patch,
      updatedAt: now,
    });
    insuranceRepository.activities.push(
      ...activities.map((activity) => ({
        id: randomUUID(),
        inquiryId: id,
        action: activity.action,
        actorUserId: activity.actorUserId ?? null,
        documentType: activity.documentType ?? null,
        notes: activity.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })),
    );
    applyRecordUpsert(recordUpsert, now);
    return insuranceRepository.findById(id);
  };
}

describe('InsuranceController integration', () => {
  it('creates an inquiry, links documents, updates review state, and exposes vehicle insurance records', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);

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

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
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

      const vehicleOneResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerOneLogin.body.accessToken}`)
        .send({
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

  it('recomputes insurance document status from uploaded required files by purpose', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'customer.insurance.docs-complete@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
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
        plateNumber: 'INS110C',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const claimInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          purpose: 'claim',
          subject: 'Claim completeness',
          description: 'Customer submitted a claim and will upload OR/CR first.',
        });
      expect(claimInquiryResponse.status).toBe(201);
      expect(claimInquiryResponse.body.documentStatus).toBe('incomplete');

      const claimDocumentResponse = await request(app.getHttpServer())
        .post(`/api/insurance/inquiries/${claimInquiryResponse.body.id}/documents`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          fileName: 'or-cr-claim.pdf',
          fileUrl: 'https://files.autocare.local/insurance/or-cr-claim.pdf',
          documentType: 'or_cr',
          notes: 'Readable OR/CR copy for the claim intake.',
        });
      expect(claimDocumentResponse.status).toBe(200);
      expect(claimDocumentResponse.body.documentStatus).toBe('complete');

      const renewalInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          purpose: 'renewal',
          subject: 'Renewal completeness',
          description: 'Customer is uploading renewal requirements.',
        });
      expect(renewalInquiryResponse.status).toBe(201);
      expect(renewalInquiryResponse.body.documentStatus).toBe('incomplete');

      const renewalOrCrResponse = await request(app.getHttpServer())
        .post(`/api/insurance/inquiries/${renewalInquiryResponse.body.id}/documents`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          fileName: 'or-cr-renewal.pdf',
          fileUrl: 'https://files.autocare.local/insurance/or-cr-renewal.pdf',
          documentType: 'or_cr',
        });
      expect(renewalOrCrResponse.status).toBe(200);
      expect(renewalOrCrResponse.body.documentStatus).toBe('incomplete');

      const renewalPolicyResponse = await request(app.getHttpServer())
        .post(`/api/insurance/inquiries/${renewalInquiryResponse.body.id}/documents`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          fileName: 'old-policy.pdf',
          fileUrl: 'https://files.autocare.local/insurance/old-policy.pdf',
          documentType: 'policy',
        });
      expect(renewalPolicyResponse.status).toBe(200);
      expect(renewalPolicyResponse.body.documentStatus).toBe('complete');
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

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
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

  it('creates a manual renewal follow-up through POST /api/insurance/renewals/follow-ups', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.renewals@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5103A',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.renewals@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
        userId: customer.id,
        plateNumber: 'INS110CA',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const createFollowUpResponse = await request(app.getHttpServer())
        .post('/api/insurance/renewals/follow-ups')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          subject: 'Renewal due next month',
          description: 'Customer should receive a renewal quote before the current policy expires.',
          renewalDueAt: '2026-06-15T00:00:00.000Z',
          policyExpiryAt: '2026-06-20T00:00:00.000Z',
        });

      expect(createFollowUpResponse.status).toBe(201);
      expect(createFollowUpResponse.body).toEqual(
        expect.objectContaining({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          purpose: 'renewal',
          status: 'for_renewal',
          renewalStatus: 'upcoming',
          renewalDueAt: '2026-06-15T00:00:00.000Z',
          policyExpiryAt: '2026-06-20T00:00:00.000Z',
          paymentStatus: 'not_required',
        }),
      );
      expect(createFollowUpResponse.body.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'renewal_follow_up_created',
            actorUserId: adviser.id,
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it('rejects manual renewal follow-up payloads when assignedStaffId does not match an existing staff reviewer', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.insurance.renewals.missing-assignee@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5103D',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.renewals.missing-assignee@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
        userId: customer.id,
        plateNumber: 'INS110CD',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const createFollowUpResponse = await request(app.getHttpServer())
        .post('/api/insurance/renewals/follow-ups')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          subject: 'Renewal due next month',
          description: 'Customer should receive a renewal quote before the current policy expires.',
          renewalDueAt: '2026-06-15T00:00:00.000Z',
          assignedStaffId: '11111111-1111-4111-8111-111111111111',
        });

      expect(createFollowUpResponse.status).toBe(404);
      expect(createFollowUpResponse.body.message).toBe('Assigned staff member not found');
    } finally {
      await app.close();
    }
  });

  it('allows an adviser to patch the broader insurance workflow route for collections fields', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.workflow@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5104',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.workflow@example.com',
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
        plateNumber: 'INS110F',
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
          subject: 'Collections follow-up',
          description: 'Customer is ready for a payment workflow update.',
        });
      expect(createInquiryResponse.status).toBe(201);

      seedInsuranceInquiryWorkflowState(app, createInquiryResponse.body.id, {
        status: 'approved',
      });

      const workflowResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/workflow`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'payment_pending',
          paymentStatus: 'verifying',
          paymentDueAt: '2026-05-30T00:00:00.000Z',
          reviewNotes: 'Collections team is validating payment submission.',
        });

      expect(workflowResponse.status).toBe(200);
      expect(workflowResponse.body).toEqual(
        expect.objectContaining({
          id: createInquiryResponse.body.id,
          status: 'payment_pending',
          paymentStatus: 'verifying',
          paymentDueAt: '2026-05-30T00:00:00.000Z',
          reviewNotes: 'Collections team is validating payment submission.',
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('rejects workflow assignee updates when assignedStaffId belongs to a non-staff account', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.workflow.invalid-assignee@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5104B',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.workflow.invalid-assignee@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
      });

      const wrongRoleAssignee = await seedAuthUser({
        email: 'customer.insurance.workflow.assignee@example.com',
        password: 'password123',
        firstName: 'Jordan',
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
        plateNumber: 'INS110F3',
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
          subject: 'Collections follow-up',
          description: 'Customer is ready for a payment workflow update.',
        });
      expect(createInquiryResponse.status).toBe(201);

      seedInsuranceInquiryWorkflowState(app, createInquiryResponse.body.id, {
        status: 'approved',
      });

      const workflowResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/workflow`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'payment_pending',
          assignedStaffId: wrongRoleAssignee.id,
          paymentStatus: 'verifying',
          reviewNotes: 'Trying to assign the case to a customer account.',
        });

      expect(workflowResponse.status).toBe(400);
      expect(workflowResponse.body.message).toBe(
        'Assigned staff member must be a service adviser or super admin',
      );
    } finally {
      await app.close();
    }
  });

  it('allows same-status workflow updates for collections metadata', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.workflow.same-status@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5104A',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.workflow.same-status@example.com',
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
        plateNumber: 'INS110F2',
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
          subject: 'Same-status workflow update',
          description: 'Customer is ready for a metadata-only collections update.',
        });
      expect(createInquiryResponse.status).toBe(201);

      seedInsuranceInquiryWorkflowState(app, createInquiryResponse.body.id, {
        status: 'payment_pending',
        paymentStatus: 'unpaid',
      });

      const workflowResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/workflow`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'payment_pending',
          paymentStatus: 'verifying',
          paymentDueAt: '2026-06-02T00:00:00.000Z',
          reviewNotes: 'Same-status workflow update should still persist collections metadata.',
        });

      expect(workflowResponse.status).toBe(200);
      expect(workflowResponse.body).toEqual(
        expect.objectContaining({
          id: createInquiryResponse.body.id,
          status: 'payment_pending',
          paymentStatus: 'verifying',
          paymentDueAt: '2026-06-02T00:00:00.000Z',
          reviewNotes: 'Same-status workflow update should still persist collections metadata.',
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('allows a service adviser to send a manual single-case missing-documents reminder', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.manual@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5401',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.manual@example.com',
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
        plateNumber: 'INS4B01',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const inquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          subject: 'Manual reminder contract',
          description: 'Needs missing document reminder.',
        });
      expect(inquiryResponse.status).toBe(201);

      const workflowResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${inquiryResponse.body.id}/workflow`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'needs_documents',
          documentStatus: 'incomplete',
          reviewNotes: 'Waiting for OR/CR upload.',
        });
      expect(workflowResponse.status).toBe(200);

      const sendResponse = await request(app.getHttpServer())
        .post('/api/insurance/reminders/send')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          reminderType: 'missing_documents',
          targetMode: 'single_case',
          selectedIds: [inquiryResponse.body.id],
        });

      expect(sendResponse.status).toBe(200);
      expect(sendResponse.body).toEqual(
        expect.objectContaining({
          targetedCount: 1,
          eligibleCount: 1,
          sentCount: 1,
          skippedCount: 0,
          failedCount: 0,
          results: [
            expect.objectContaining({
              inquiryId: inquiryResponse.body.id,
              reminderType: 'missing_documents',
              result: 'sent',
            }),
          ],
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('creates the insurance record when the workflow route closes an inquiry', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.workflow.close@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5105',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.workflow.close@example.com',
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
        plateNumber: 'INS110G',
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
          subject: 'Workflow close-out',
          description: 'Customer workflow is ready to be closed by collections.',
        });
      expect(createInquiryResponse.status).toBe(201);

      seedInsuranceInquiryWorkflowState(app, createInquiryResponse.body.id, {
        status: 'active',
      });

      const workflowResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/workflow`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'closed',
          reviewNotes: 'Collections closed the inquiry after confirming completion.',
        });

      expect(workflowResponse.status).toBe(200);
      expect(workflowResponse.body).toEqual(
        expect.objectContaining({
          id: createInquiryResponse.body.id,
          status: 'closed',
          reviewNotes: 'Collections closed the inquiry after confirming completion.',
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

  it('sends a staff insurance broadcast and returns the real backend summary contract', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.insurance.broadcasts@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5404',
      });
      const customer = await seedAuthUser({
        email: 'customer.insurance.broadcasts@example.com',
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
        plateNumber: 'INS4B02',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });
      expect(vehicleResponse.status).toBe(201);

      const firstInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'comprehensive',
          subject: 'Broadcast case one',
          description: 'First insurance case for the customer broadcast flow.',
        });
      expect(firstInquiryResponse.status).toBe(201);

      const secondInquiryResponse = await request(app.getHttpServer())
        .post('/api/insurance/inquiries')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          inquiryType: 'ctpl',
          subject: 'Broadcast case two',
          description: 'Second insurance case for the customer broadcast flow.',
        });
      expect(secondInquiryResponse.status).toBe(201);

      const sendResponse = await request(app.getHttpServer())
        .post('/api/insurance/broadcasts/send')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          targetMode: 'selected_cases',
          selectedIds: [firstInquiryResponse.body.id, secondInquiryResponse.body.id],
          title: 'Insurance processing update',
          message: 'Please review your insurance request in the app for the latest update.',
        });

      expect(sendResponse.status).toBe(200);
      expect(sendResponse.body).toEqual({
        targetedCaseCount: 2,
        eligibleCaseCount: 2,
        deduplicatedCustomerCount: 1,
        sentCount: 1,
        skippedCount: 0,
        failedCount: 0,
        results: [
          {
            inquiryId: firstInquiryResponse.body.id,
            customerId: customer.id,
            status: 'sent',
            reason: null,
          },
          {
            inquiryId: secondInquiryResponse.body.id,
            customerId: customer.id,
            status: 'sent',
            reason: null,
          },
        ],
      });

      const firstReadBackResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${firstInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(firstReadBackResponse.status).toBe(200);
      expect(firstReadBackResponse.body.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'manual_broadcast_sent',
            notes: 'Insurance processing update',
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it('rejects insurance broadcast sends with blank title or message content', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.insurance.broadcasts.validation.content@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5405',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });

      const blankTitleResponse = await request(app.getHttpServer())
        .post('/api/insurance/broadcasts/send')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          targetMode: 'selected_cases',
          selectedIds: ['4c559c0b-4d1b-492f-a11f-e61271f4a32d'],
          title: '   ',
          message: 'Please review your insurance request in the app for the latest update.',
        });

      expect(blankTitleResponse.status).toBe(400);

      const blankMessageResponse = await request(app.getHttpServer())
        .post('/api/insurance/broadcasts/send')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          targetMode: 'selected_cases',
          selectedIds: ['4c559c0b-4d1b-492f-a11f-e61271f4a32d'],
          title: 'Insurance processing update',
          message: '   ',
        });

      expect(blankMessageResponse.status).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('rejects insurance broadcast sends without the mode-specific target payload', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const adviser = await seedAuthUser({
        email: 'adviser.insurance.broadcasts.validation.targets@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5406',
      });

      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      });

      const selectedCasesResponse = await request(app.getHttpServer())
        .post('/api/insurance/broadcasts/send')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          targetMode: 'selected_cases',
          title: 'Insurance processing update',
          message: 'Please review your insurance request in the app for the latest update.',
        });

      expect(selectedCasesResponse.status).toBe(400);

      const filteredResultsResponse = await request(app.getHttpServer())
        .post('/api/insurance/broadcasts/send')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          targetMode: 'filtered_results',
          title: 'Insurance processing update',
          message: 'Please review your insurance request in the app for the latest update.',
        });

      expect(filteredResultsResponse.status).toBe(400);

      const emptyFiltersResponse = await request(app.getHttpServer())
        .post('/api/insurance/broadcasts/send')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          targetMode: 'filtered_results',
          filters: {},
          title: 'Insurance processing update',
          message: 'Please review your insurance request in the app for the latest update.',
        });

      expect(emptyFiltersResponse.status).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('keeps a close status transition successful when notification emission fails', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);
      jest
        .spyOn(app.get(NotificationsService), 'applyTrigger')
        .mockRejectedValue(new Error('Simulated notification failure'));

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.status.notification@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5107',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.status.notification@example.com',
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
        plateNumber: 'INS110I',
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
          subject: 'Status close notification guard',
          description: 'This request verifies notification failures stay non-blocking.',
        });
      expect(createInquiryResponse.status).toBe(201);

      seedInsuranceInquiryWorkflowState(app, createInquiryResponse.body.id, {
        status: 'active',
      });

      const closeResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/status`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'closed',
          reviewNotes: 'Closed even if the notification send fails.',
        });

      expect(closeResponse.status).toBe(200);
      expect(closeResponse.body).toEqual(
        expect.objectContaining({
          id: createInquiryResponse.body.id,
          status: 'closed',
        }),
      );

      const readBackResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${createInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(readBackResponse.status).toBe(200);
      expect(readBackResponse.body.status).toBe('closed');

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

  it('keeps a close workflow transition successful when notification emission fails', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);
      jest
        .spyOn(app.get(NotificationsService), 'applyTrigger')
        .mockRejectedValue(new Error('Simulated notification failure'));

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.workflow.notification@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5108',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.workflow.notification@example.com',
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
        plateNumber: 'INS110J',
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
          subject: 'Workflow close notification guard',
          description: 'This request verifies workflow close stays successful when notification sending fails.',
        });
      expect(createInquiryResponse.status).toBe(201);

      seedInsuranceInquiryWorkflowState(app, createInquiryResponse.body.id, {
        status: 'active',
      });

      const closeResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/workflow`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'closed',
          reviewNotes: 'Workflow close should still succeed if notification sending fails.',
        });

      expect(closeResponse.status).toBe(200);
      expect(closeResponse.body).toEqual(
        expect.objectContaining({
          id: createInquiryResponse.body.id,
          status: 'closed',
        }),
      );

      const readBackResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${createInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);
      expect(readBackResponse.status).toBe(200);
      expect(readBackResponse.body.status).toBe('closed');

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

  it('rolls back workflow changes when transactional workflow persistence fails', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      installInsuranceWorkflowRepositoryContract(app);

      const adviser = await seedAuthUser({
        email: 'adviser.insurance.workflow.rollback@example.com',
        password: 'password123',
        firstName: 'Ivy',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-5106',
      });

      const customer = await seedAuthUser({
        email: 'customer.insurance.workflow.rollback@example.com',
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
        plateNumber: 'INS110H',
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
          subject: 'Workflow rollback guard',
          description: 'This request verifies workflow transaction rollback behavior.',
        });
      expect(createInquiryResponse.status).toBe(201);

      seedInsuranceInquiryWorkflowState(app, createInquiryResponse.body.id, {
        status: 'approved',
      });
      failNextInsuranceWorkflowPersistence(app);

      const workflowResponse = await request(app.getHttpServer())
        .patch(`/api/insurance/inquiries/${createInquiryResponse.body.id}/workflow`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          status: 'payment_pending',
          paymentStatus: 'verifying',
          paymentDueAt: '2026-05-30T00:00:00.000Z',
          reviewNotes: 'Collections is validating payment submission.',
        });

      expect(workflowResponse.status).toBe(500);

      const readBackResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${createInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);

      expect(readBackResponse.status).toBe(200);
      expect(readBackResponse.body).toEqual(
        expect.objectContaining({
          id: createInquiryResponse.body.id,
          status: 'approved',
          reviewNotes: null,
          activities: [],
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

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
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

  it('rolls back the saved upload artifact when insurance upload persistence fails', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'customer.insurance.rollback@example.com',
        password: 'password123',
        firstName: 'Casey',
        lastName: 'Customer',
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
        plateNumber: 'INS110E',
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
          subject: 'Persistence failure guard',
          description: 'This request verifies upload rollback behavior.',
        });
      expect(createInquiryResponse.status).toBe(201);

      failNextInsuranceUploadPersistence(app);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/insurance/inquiries/${createInquiryResponse.body.id}/documents/upload`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .field('documentType', 'proof_of_payment')
        .attach('file', Buffer.from('%PDF-1.4 test rollback proof'), 'rollback-proof.pdf');

      expect(uploadResponse.status).toBe(500);

      const readBackResponse = await request(app.getHttpServer())
        .get(`/api/insurance/inquiries/${createInquiryResponse.body.id}`)
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);

      expect(readBackResponse.status).toBe(200);
      expect(readBackResponse.body.documents).toEqual([]);
      expect(readBackResponse.body.activities).toEqual([]);

      const inquiryDirectory = join(
        insuranceUploadRuntimeDirectory,
        createInquiryResponse.body.id,
      );
      await expect(access(inquiryDirectory)).rejects.toThrow();
    } finally {
      await app.close();
      await rm(insuranceUploadRuntimeDirectory, { recursive: true, force: true });
    }
  });
});
