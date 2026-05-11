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
  afterEach(async () => {
    await rm(join(process.cwd(), '.runtime', 'uploads', 'inspection-evidence'), {
      recursive: true,
      force: true,
    });
  });

  it('uploads an inspection photo and returns an attachment reference', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-photo-owner@example.com',
        firstName: 'Jordan',
        lastName: 'Uploader',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'INSP321',
        make: 'Nissan',
        model: 'Almera',
        year: 2023,
      });

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
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
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-photo-avif@example.com',
        firstName: 'Avery',
        lastName: 'Subtype',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'INSP654',
        make: 'Mazda',
        model: '2',
        year: 2024,
      });

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
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
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-photo-safe-extension@example.com',
        firstName: 'Taylor',
        lastName: 'Mismatch',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'INSP741',
        make: 'Hyundai',
        model: 'Accent',
        year: 2021,
      });

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
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
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-upload-mime-mismatch@example.com',
        firstName: 'Riley',
        lastName: 'Signature',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'INSP852',
        make: 'Suzuki',
        model: 'Dzire',
        year: 2020,
      });

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
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
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-upload-svg@example.com',
        firstName: 'Skyler',
        lastName: 'Vector',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'INSP159',
        make: 'Chevrolet',
        model: 'Spark',
        year: 2018,
      });

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
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
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-upload-too-large@example.com',
        firstName: 'Jamie',
        lastName: 'Limit',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'INSP963',
        make: 'Ford',
        model: 'Fiesta',
        year: 2019,
      });

      const oversizedImageBuffer = Buffer.alloc(MAX_INSPECTION_UPLOAD_BYTES + 1, 0);
      JPEG_IMAGE_BYTES.copy(oversizedImageBuffer);

      const uploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
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
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-upload-errors@example.com',
        firstName: 'Morgan',
        lastName: 'Verifier',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'INSP987',
        make: 'Kia',
        model: 'Soluto',
        year: 2022,
      });

      const missingVehicleUploadResponse = await request(app.getHttpServer())
        .post('/api/vehicles/missing-vehicle-id/inspections/photos/upload')
        .field('slot', 'front')
        .attach('file', JPEG_IMAGE_BYTES, {
          filename: 'front.jpg',
          contentType: 'image/jpeg',
        });
      expect(missingVehicleUploadResponse.status).toBe(404);

      const nonImageUploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .field('slot', 'front')
        .attach('file', Buffer.from('not-an-image'), {
          filename: 'front.txt',
          contentType: 'text/plain',
        });
      expect(nonImageUploadResponse.status).toBe(400);

      const missingFileUploadResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections/photos/upload`)
        .field('slot', 'front');
      expect(missingFileUploadResponse.status).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('creates and lists inspections for a valid vehicle context', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'inspection-owner@example.com',
        firstName: 'Alex',
        lastName: 'Driver',
      });

      const vehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'INSP123',
        make: 'Toyota',
        model: 'Vios',
        year: 2021,
      });

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: userResponse.body.id,
        vehicleId: vehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-04-25',
        serviceIds: [servicesResponse.body[0].id],
      });

      const createInspectionResponse = await request(app.getHttpServer())
        .post(`/api/vehicles/${vehicleResponse.body.id}/inspections`)
        .send({
          bookingId: bookingResponse.body.id,
          inspectionType: 'intake',
          status: 'completed',
          inspectorUserId: userResponse.body.id,
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

      const listInspectionsResponse = await request(app.getHttpServer()).get(
        `/api/vehicles/${vehicleResponse.body.id}/inspections`,
      );
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
    const { app } = await createMainServiceTestApp();

    try {
      const servicesResponse = await request(app.getHttpServer()).get('/api/services');
      const timeSlotsResponse = await request(app.getHttpServer()).get('/api/time-slots');

      const ownerResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'owner-inspection@example.com',
        firstName: 'Casey',
        lastName: 'Owner',
      });
      const otherUserResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'other-inspection@example.com',
        firstName: 'Robin',
        lastName: 'Other',
      });

      const ownerVehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: ownerResponse.body.id,
        plateNumber: 'INSP456',
        make: 'Honda',
        model: 'City',
        year: 2020,
      });
      const otherVehicleResponse = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: otherUserResponse.body.id,
        plateNumber: 'INSP789',
        make: 'Mitsubishi',
        model: 'Mirage',
        year: 2022,
      });

      const bookingResponse = await request(app.getHttpServer()).post('/api/bookings').send({
        userId: ownerResponse.body.id,
        vehicleId: ownerVehicleResponse.body.id,
        timeSlotId: timeSlotsResponse.body[0].id,
        scheduledDate: '2026-04-26',
        serviceIds: [servicesResponse.body[0].id],
      });

      const missingVehicleInspection = await request(app.getHttpServer())
        .post('/api/vehicles/missing-vehicle-id/inspections')
        .send({
          inspectionType: 'intake',
        });
      expect(missingVehicleInspection.status).toBe(404);

      const mismatchedBookingInspection = await request(app.getHttpServer())
        .post(`/api/vehicles/${otherVehicleResponse.body.id}/inspections`)
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
