import request from 'supertest';
import { Test } from '@nestjs/testing';

import { InspectionEvidenceStorageService } from '../src/modules/inspections/services/inspection-evidence-storage.service';
import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('InspectionsController integration', () => {
  const originalCreateTestingModule = Test.createTestingModule.bind(Test);

  beforeAll(() => {
    jest.spyOn(Test, 'createTestingModule').mockImplementation((metadata) =>
      originalCreateTestingModule({
        ...metadata,
        providers: [...(metadata.providers ?? []), InspectionEvidenceStorageService],
      }),
    );
  });

  afterAll(() => {
    jest.restoreAllMocks();
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
        .attach('file', Buffer.from('inspection-photo-binary'), {
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
