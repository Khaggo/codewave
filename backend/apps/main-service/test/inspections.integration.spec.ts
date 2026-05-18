import { rm } from 'fs/promises';
import { join } from 'path';
import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

const MAX_INSPECTION_UPLOAD_BYTES = 5 * 1024 * 1024;
const JPEG_IMAGE_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
  0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d,
  0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0xff, 0xd9,
]);
const AVIF_IMAGE_BYTES = Buffer.from([
  0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
  0x00, 0x00, 0x00, 0x00, 0x61, 0x76, 0x69, 0x66, 0x6d, 0x69, 0x66, 0x31,
  0x6d, 0x69, 0x61, 0x66, 0x00, 0x00, 0x00, 0x00,
]);
const SVG_IMAGE_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>');

describe('InspectionsController integration', () => {
  async function createAuthenticatedVehicleContext() {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const customer = await seedAuthUser({
      email: `inspection.customer.${unique}@example.com`,
      password: 'password123',
      firstName: 'Jordan',
      lastName: 'Uploader',
    });
    const adviser = await seedAuthUser({
      email: `inspection.adviser.${unique}@example.com`,
      password: 'password123',
      firstName: 'Avery',
      lastName: 'Adviser',
      role: 'service_adviser',
      staffCode: `SA-${unique}`,
    });

    const [customerLogin, adviserLogin] = await Promise.all([
      request(app.getHttpServer()).post('/api/auth/login').send({
        email: customer.email,
        password: 'password123',
      }),
      request(app.getHttpServer()).post('/api/auth/login').send({
        email: adviser.email,
        password: 'password123',
      }),
    ]);

    expect(customerLogin.status).toBe(200);
    expect(adviserLogin.status).toBe(200);

    return { app, customer, adviser, customerLogin, adviserLogin, seedAuthUser };
  }

  afterEach(async () => {
    await rm(join(process.cwd(), '.runtime', 'uploads', 'inspection-evidence'), {
      recursive: true,
      force: true,
    });
  });

  it('uploads an inspection photo and returns an attachment reference', async () => {
    const { app, customer, customerLogin, adviserLogin } = await createAuthenticatedVehicleContext();

    try {
      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP321',
          make: 'Nissan',
          model: 'Almera',
          year: 2023,
        });
      expect(vehicleResponse.status).toBe(201);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front')
        .attach('file', JPEG_IMAGE_BYTES, {
          filename: 'front.jpg',
          contentType: 'image/jpeg',
        });

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body).toEqual({
        slot: 'front',
        attachmentRef: expect.stringMatching(/^upload:\/\/vehicle\//),
        storageKey: expect.any(String),
      });
    } finally {
      await app.close();
    }
  });

  it('uploads a valid image subtype even when the filename has no extension', async () => {
    const { app, customer, customerLogin, adviserLogin } = await createAuthenticatedVehicleContext();

    try {
      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP654',
          make: 'Mazda',
          model: '2',
          year: 2024,
        });
      expect(vehicleResponse.status).toBe(201);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front')
        .attach('file', AVIF_IMAGE_BYTES, {
          filename: 'front',
          contentType: 'image/avif',
        });

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body).toEqual({
        slot: 'front',
        attachmentRef: expect.stringMatching(/^upload:\/\/vehicle\//),
        storageKey: expect.stringMatching(/\.avif$/),
      });
    } finally {
      await app.close();
    }
  });

  it('persists a safe image extension instead of trusting a misleading filename extension', async () => {
    const { app, customer, customerLogin, adviserLogin } = await createAuthenticatedVehicleContext();

    try {
      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP741',
          make: 'Hyundai',
          model: 'Accent',
          year: 2021,
        });
      expect(vehicleResponse.status).toBe(201);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front')
        .attach('file', JPEG_IMAGE_BYTES, {
          filename: 'front.exe',
          contentType: 'image/jpeg',
        });

      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body.attachmentRef).toMatch(/^upload:\/\/vehicle\/.+\.(jpg|jpeg)$/);
      expect(uploadResponse.body.storageKey).toMatch(/\.(jpg|jpeg)$/);
      expect(uploadResponse.body.attachmentRef).not.toMatch(/\.exe$/);
      expect(uploadResponse.body.storageKey).not.toMatch(/\.exe$/);
    } finally {
      await app.close();
    }
  });

  it('rejects uploads whose declared image MIME type does not match the file content', async () => {
    const { app, customer, customerLogin, adviserLogin } = await createAuthenticatedVehicleContext();

    try {
      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP852',
          make: 'Suzuki',
          model: 'Dzire',
          year: 2020,
        });
      expect(vehicleResponse.status).toBe(201);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front')
        .attach('file', Buffer.from('definitely-not-an-image'), {
          filename: 'front.jpg',
          contentType: 'image/jpeg',
        });

      expect(uploadResponse.status).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('rejects svg uploads for inspection photos', async () => {
    const { app, customer, customerLogin, adviserLogin } = await createAuthenticatedVehicleContext();

    try {
      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP159',
          make: 'Chevrolet',
          model: 'Spark',
          year: 2018,
        });
      expect(vehicleResponse.status).toBe(201);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front')
        .attach('file', SVG_IMAGE_BYTES, {
          filename: 'front.svg',
          contentType: 'image/svg+xml',
        });

      expect(uploadResponse.status).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('rejects uploads that exceed the inspection image size limit', async () => {
    const { app, customer, customerLogin, adviserLogin } = await createAuthenticatedVehicleContext();

    try {
      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP963',
          make: 'Ford',
          model: 'Fiesta',
          year: 2019,
        });
      expect(vehicleResponse.status).toBe(201);

      const oversizedImageBuffer = Buffer.alloc(MAX_INSPECTION_UPLOAD_BYTES + 1, 0);
      JPEG_IMAGE_BYTES.copy(oversizedImageBuffer);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front')
        .attach('file', oversizedImageBuffer, {
          filename: 'front.jpg',
          contentType: 'image/jpeg',
        });

      expect(uploadResponse.status).toBe(413);
    } finally {
      await app.close();
    }
  });

  it('rejects upload requests for a missing vehicle, non-image files, and missing files', async () => {
    const { app, customer, customerLogin, adviserLogin } = await createAuthenticatedVehicleContext();

    try {
      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP987',
          make: 'Kia',
          model: 'Soluto',
          year: 2022,
        });
      expect(vehicleResponse.status).toBe(201);

      const missingVehicleUploadResponse = await request(app.getHttpServer())
        .post('/api/vehicles/missing-vehicle-id/inspections/photos/upload')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front')
        .attach('file', JPEG_IMAGE_BYTES, {
          filename: 'front.jpg',
          contentType: 'image/jpeg',
        });
      expect(missingVehicleUploadResponse.status).toBe(404);

      const nonImageUploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front')
        .attach('file', Buffer.from('not-an-image'), {
          filename: 'front.txt',
          contentType: 'text/plain',
        });
      expect(nonImageUploadResponse.status).toBe(400);

      const missingFileUploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .field('slot', 'front');
      expect(missingFileUploadResponse.status).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('creates and lists inspections for a valid vehicle context', async () => {
    const { app, customer, customerLogin, adviser, adviserLogin } = await createAuthenticatedVehicleContext();

    try {
      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const vehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP123',
          make: 'Toyota',
          model: 'Vios',
          year: 2021,
        });
      expect(vehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: vehicleResponse.body.id,
          timeSlotId: timeSlotsResponse.body[0].id,
          scheduledDate: '2026-04-25',
          serviceIds: [servicesResponse.body[0].id],
        });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/reservation-payment/confirm`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          provider: 'manual_counter',
          referenceNumber: 'COUNTER-INSP-001',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const createInspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          bookingId: bookingResponse.body.id,
          inspectionType: 'intake',
          status: 'completed',
          inspectorUserId: adviser.id,
          notes: 'Vehicle received in stable condition.',
          findings: [
            {
              category: 'body',
              label: 'Minor scratch on front bumper',
              severity: 'low',
              isVerified: true,
            },
          ],
        });

      expect(createInspectionResponse.status).toBe(201);
      expect(createInspectionResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          vehicleId: vehicleResponse.body.id,
          bookingId: bookingResponse.body.id,
          inspectionType: 'intake',
          status: 'completed',
        }),
      );
      expect(createInspectionResponse.body.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'body',
            label: 'Minor scratch on front bumper',
          }),
        ]),
      );

      const listInspectionsResponse = await request(app.getHttpServer())
        .get(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`);
      expect(listInspectionsResponse.status).toBe(200);
      expect(listInspectionsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createInspectionResponse.body.id,
            inspectionType: 'intake',
          }),
        ]),
      );
    } finally {
      await app.close();
    }
  });

  it('rejects invalid vehicle context and invalid booking references', async () => {
    const { app, customer, customerLogin, adviserLogin, seedAuthUser } = await createAuthenticatedVehicleContext();

    try {
      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const otherCustomer = await seedAuthUser({
        email: `other-inspection-${Date.now()}@example.com`,
        password: 'password123',
        firstName: 'Robin',
        lastName: 'Other',
      });
      const otherCustomerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: otherCustomer.email,
        password: 'password123',
      });
      expect(otherCustomerLogin.status).toBe(200);

      const ownerVehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          plateNumber: 'INSP456',
          make: 'Honda',
          model: 'City',
          year: 2020,
        });
      expect(ownerVehicleResponse.status).toBe(201);

      const otherVehicleResponse = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${otherCustomerLogin.body.accessToken}`)
        .send({
          userId: otherCustomer.id,
          plateNumber: 'INSP789',
          make: 'Mitsubishi',
          model: 'Mirage',
          year: 2022,
        });
      expect(otherVehicleResponse.status).toBe(201);

      const bookingResponse = await request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
        .send({
          userId: customer.id,
          vehicleId: ownerVehicleResponse.body.id,
          timeSlotId: timeSlotsResponse.body[0].id,
          scheduledDate: '2026-04-26',
          serviceIds: [servicesResponse.body[0].id],
        });
      expect(bookingResponse.status).toBe(201);

      const confirmBookingResponse = await request(app.getHttpServer())
        .patch(`/api/bookings/${bookingResponse.body.id}/reservation-payment/confirm`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          provider: 'manual_counter',
          referenceNumber: 'COUNTER-INSP-002',
        });
      expect(confirmBookingResponse.status).toBe(200);

      const missingVehicleInspection = await request(app.getHttpServer())
        .post('/api/vehicles/missing-vehicle-id/inspections')
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          inspectionType: 'intake',
        });
      expect(missingVehicleInspection.status).toBe(404);

      const mismatchedBookingInspection = await request(app.getHttpServer())
        .post(`/api/vehicles/${otherVehicleResponse.body.id}/inspections`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          bookingId: bookingResponse.body.id,
          inspectionType: 'intake',
          status: 'completed',
          findings: [
            {
              category: 'body',
              label: 'Mismatch check',
            },
          ],
        });
      expect(mismatchedBookingInspection.status).toBe(409);

      const invalidCompletionInspection = await request(app.getHttpServer())
        .post(`/api/vehicles/${ownerVehicleResponse.body.id}/inspections`)
        .set('Authorization', `Bearer ${adviserLogin.body.accessToken}`)
        .send({
          inspectionType: 'completion',
          status: 'completed',
        });
      expect(invalidCompletionInspection.status).toBe(400);
    } finally {
      await app.close();
    }
  });
});
