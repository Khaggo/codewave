import request from 'supertest';

import { BookingsService } from '../src/modules/bookings/services/bookings.service';
import { InsuranceService } from '../src/modules/insurance/services/insurance.service';
import { VehiclesService } from '../src/modules/vehicles/services/vehicles.service';
import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('ChatbotController integration', () => {
  it('answers booking and insurance FAQs deterministically through the live API surface', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'chatbot.customer@example.com',
        password: 'password123',
        firstName: 'Chloe',
        lastName: 'Customer',
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'chatbot.customer@example.com',
        password: 'password123',
      });
      expect(loginResponse.status).toBe(200);

      const bookingFaqResponse = await request(app.getHttpServer())
        .post('/api/chatbot/messages')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({
          message: 'How do I book a service appointment?',
        });

      expect(bookingFaqResponse.status).toBe(201);
      expect(bookingFaqResponse.body).toEqual(
        expect.objectContaining({
          matchedIntentKey: 'booking.how_to_book',
          responseType: 'answer',
        }),
      );

      const insuranceFaqResponse = await request(app.getHttpServer())
        .post('/api/chatbot/messages')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({
          message: 'What documents do I need for insurance?',
        });

      expect(insuranceFaqResponse.status).toBe(201);
      expect(insuranceFaqResponse.body).toEqual(
        expect.objectContaining({
          matchedIntentKey: 'insurance.required_documents',
          responseType: 'answer',
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('supports booking lookup, unsupported escalation, and explicit escalation creation', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      const customer = await seedAuthUser({
        email: 'chatbot.lookup@example.com',
        password: 'password123',
        firstName: 'Lia',
        lastName: 'Lookup',
      });

      const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'chatbot.lookup@example.com',
        password: 'password123',
      });
      expect(loginResponse.status).toBe(200);

      const vehiclesService = app.get(VehiclesService);
      const bookingsService = app.get(BookingsService);
      const insuranceService = app.get(InsuranceService);

      const vehicle = await vehiclesService.create({
        userId: customer.id,
        plateNumber: 'CBT-114',
        make: 'Toyota',
        model: 'Vios',
        year: 2024,
      });

      const [serviceDefinition] = await bookingsService.listServices();
      const [timeSlot] = await bookingsService.listTimeSlots();
      await bookingsService.create({
        userId: customer.id,
        vehicleId: vehicle.id,
        timeSlotId: timeSlot.id,
        scheduledDate: '2026-07-14',
        serviceIds: [serviceDefinition.id],
        notes: 'Please check the cold start noise.',
      });

      await insuranceService.create(
        {
          userId: customer.id,
          vehicleId: vehicle.id,
          inquiryType: 'comprehensive',
          subject: 'Accident repair',
          description: 'Customer reported front bumper damage after a collision.',
        },
        {
          userId: customer.id,
          role: 'customer',
        },
      );

      const bookingLookupResponse = await request(app.getHttpServer())
        .post('/api/chatbot/messages')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({
          message: 'What is my booking status?',
        });

      expect(bookingLookupResponse.status).toBe(201);
      expect(bookingLookupResponse.body).toEqual(
        expect.objectContaining({
          matchedIntentKey: 'booking.latest_status',
          responseType: 'lookup',
          lookup: expect.objectContaining({
            lookupType: 'booking_status',
            status: 'pending',
          }),
        }),
      );

      const unsupportedResponse = await request(app.getHttpServer())
        .post('/api/chatbot/messages')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({
          message: 'Can you estimate my repair bill?',
        });

      expect(unsupportedResponse.status).toBe(201);
      expect(unsupportedResponse.body).toEqual(
        expect.objectContaining({
          responseType: 'escalation',
          escalation: expect.objectContaining({
            reason: 'unsupported_prompt',
            status: 'open',
          }),
        }),
      );

      const manualEscalationResponse = await request(app.getHttpServer())
        .post('/api/chatbot/escalations')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({
          prompt: 'Please have a service adviser follow up about billing.',
          reason: 'billing_follow_up',
        });

      expect(manualEscalationResponse.status).toBe(201);
      expect(manualEscalationResponse.body).toEqual(
        expect.objectContaining({
          reason: 'billing_follow_up',
          status: 'open',
        }),
      );
    } finally {
      await app.close();
    }
  });

  it('allows staff to inspect the active chatbot intent catalog and blocks customers from that route', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'chatbot.staff@example.com',
        password: 'password123',
        firstName: 'Sage',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1140',
      });

      await seedAuthUser({
        email: 'chatbot.viewer@example.com',
        password: 'password123',
        firstName: 'Cory',
        lastName: 'Viewer',
      });

      const [staffLogin, customerLogin] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'chatbot.staff@example.com',
          password: 'password123',
        }),
        request(app.getHttpServer()).post('/api/auth/login').send({
          email: 'chatbot.viewer@example.com',
          password: 'password123',
        }),
      ]);

      const staffIntentsResponse = await request(app.getHttpServer())
        .get('/api/chatbot/intents')
        .set('Authorization', `Bearer ${staffLogin.body.accessToken}`);

      expect(staffIntentsResponse.status).toBe(200);
      expect(staffIntentsResponse.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            intentKey: 'booking.how_to_book',
          }),
          expect.objectContaining({
            intentKey: 'insurance.latest_status',
          }),
        ]),
      );

      const customerIntentsResponse = await request(app.getHttpServer())
        .get('/api/chatbot/intents')
        .set('Authorization', `Bearer ${customerLogin.body.accessToken}`);

      expect(customerIntentsResponse.status).toBe(403);
    } finally {
      await app.close();
    }
  });
});
