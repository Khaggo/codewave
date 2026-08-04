import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('VehiclesController integration', () => {
  it('creates, reads, lists, and updates vehicles for a valid owner', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'adviser@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1001',
      });
      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'adviser@example.com',
        password: 'password123',
      });
      const adviserAuthHeader = { Authorization: `Bearer ${adviserLogin.body.accessToken}` };

      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const createVehicle = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set(adviserAuthHeader)
        .send({
          userId: userResponse.body.id,
          plateNumber: 'ABC1234',
          make: 'Toyota',
          model: 'Vios',
          year: 2020,
        });

      expect(createVehicle.status).toBe(201);
      expect(createVehicle.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          userId: userResponse.body.id,
          plateNumber: 'ABC1234',
        }),
      );

      const readVehicle = await request(app.getHttpServer())
        .get(`/api/vehicles/${createVehicle.body.id}`)
        .set(adviserAuthHeader);
      expect(readVehicle.status).toBe(200);
      expect(readVehicle.body.id).toBe(createVehicle.body.id);

      const listVehicles = await request(app.getHttpServer())
        .get(`/api/users/${userResponse.body.id}/vehicles`)
        .set(adviserAuthHeader);
      expect(listVehicles.status).toBe(200);
      expect(listVehicles.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createVehicle.body.id,
            plateNumber: 'ABC1234',
          }),
        ]),
      );

      const updateVehicle = await request(app.getHttpServer())
        .patch(`/api/vehicles/${createVehicle.body.id}`)
        .set(adviserAuthHeader)
        .send({
          color: 'Blue',
        });

      expect(updateVehicle.status).toBe(200);
      expect(updateVehicle.body.color).toBe('Blue');
    } finally {
      await app.close();
    }
  });

  it('rejects missing owners, duplicate plates, and invalid update targets', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'adviser@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1001',
      });
      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'adviser@example.com',
        password: 'password123',
      });
      const adviserAuthHeader = { Authorization: `Bearer ${adviserLogin.body.accessToken}` };

      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      await request(app.getHttpServer())
        .post('/api/vehicles')
        .set(adviserAuthHeader)
        .send({
          userId: userResponse.body.id,
          plateNumber: 'ABC1234',
          make: 'Toyota',
          model: 'Vios',
          year: 2020,
        });

      const missingOwner = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set(adviserAuthHeader)
        .send({
          userId: 'missing-user-id',
          plateNumber: 'XYZ9876',
          make: 'Honda',
          model: 'City',
          year: 2021,
        });
      expect(missingOwner.status).toBe(404);

      const duplicatePlate = await request(app.getHttpServer())
        .post('/api/vehicles')
        .set(adviserAuthHeader)
        .send({
          userId: userResponse.body.id,
          plateNumber: 'ABC1234',
          make: 'Mitsubishi',
          model: 'Mirage',
          year: 2022,
        });
      expect(duplicatePlate.status).toBe(409);

      const invalidUpdate = await request(app.getHttpServer())
        .patch('/api/vehicles/missing-vehicle-id')
        .set(adviserAuthHeader)
        .send({
          color: 'Red',
        });
      expect(invalidUpdate.status).toBe(404);
    } finally {
      await app.close();
    }
  });

  it('pages customer-safe Garage vehicles without changing the legacy list contract', async () => {
    const { app, seedAuthUser } = await createMainServiceTestApp();

    try {
      await seedAuthUser({
        email: 'adviser@example.com',
        password: 'password123',
        firstName: 'Ava',
        lastName: 'Adviser',
        role: 'service_adviser',
        staffCode: 'SA-1001',
      });
      const customer = await seedAuthUser({
        email: 'garage.customer@example.com',
        password: 'password123',
        firstName: 'Garage',
        lastName: 'Customer',
      });
      const otherCustomer = await seedAuthUser({
        email: 'other.customer@example.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'Customer',
      });
      const adviserLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'adviser@example.com',
        password: 'password123',
      });
      const customerLogin = await request(app.getHttpServer()).post('/api/auth/login').send({
        email: 'garage.customer@example.com',
        password: 'password123',
      });
      const adviserAuthHeader = { Authorization: `Bearer ${adviserLogin.body.accessToken}` };
      const customerAuthHeader = { Authorization: `Bearer ${customerLogin.body.accessToken}` };

      for (let index = 0; index < 8; index += 1) {
        const createResponse = await request(app.getHttpServer())
          .post('/api/vehicles')
          .set(adviserAuthHeader)
          .send({
            userId: customer.id,
            plateNumber: `GAR${1000 + index}`,
            make: index % 2 === 0 ? 'Toyota' : 'Honda',
            model: index % 2 === 0 ? 'Vios' : 'City',
            year: 2020 + (index % 4),
            notes: 'Internal staff-only vehicle note',
          });
        expect(createResponse.status).toBe(201);
      }

      const legacyList = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/vehicles`)
        .set(customerAuthHeader);
      expect(legacyList.status).toBe(200);
      expect(Array.isArray(legacyList.body)).toBe(true);
      expect(legacyList.body).toHaveLength(8);

      const firstPage = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/vehicles/garage?limit=3`)
        .set(customerAuthHeader);
      expect(firstPage.status).toBe(200);
      expect(firstPage.body.items).toHaveLength(3);
      expect(firstPage.body.page).toEqual(
        expect.objectContaining({
          limit: 3,
          total: 8,
          hasNext: true,
          nextCursor: expect.any(String),
        }),
      );
      for (const vehicle of firstPage.body.items) {
        expect(vehicle).not.toHaveProperty('userId');
        expect(vehicle).not.toHaveProperty('notes');
        expect(vehicle).not.toHaveProperty('createdAt');
        expect(vehicle).not.toHaveProperty('updatedAt');
      }

      const secondPage = await request(app.getHttpServer())
        .get(
          `/api/users/${customer.id}/vehicles/garage?limit=3&cursor=${encodeURIComponent(
            firstPage.body.page.nextCursor,
          )}`,
        )
        .set(customerAuthHeader);
      expect(secondPage.status).toBe(200);
      expect(secondPage.body.items).toHaveLength(3);
      const firstPageIds = new Set(firstPage.body.items.map((vehicle: { id: string }) => vehicle.id));
      expect(
        secondPage.body.items.some((vehicle: { id: string }) => firstPageIds.has(vehicle.id)),
      ).toBe(false);

      const searchPage = await request(app.getHttpServer())
        .get(`/api/users/${customer.id}/vehicles/garage?limit=2&search=toyota`)
        .set(customerAuthHeader);
      expect(searchPage.status).toBe(200);
      expect(searchPage.body.page.total).toBe(4);
      expect(searchPage.body.items).toHaveLength(2);
      expect(searchPage.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            make: 'Toyota',
          }),
        ]),
      );

      const mismatchedCursor = await request(app.getHttpServer())
        .get(
          `/api/users/${customer.id}/vehicles/garage?limit=2&search=honda&cursor=${encodeURIComponent(
            searchPage.body.page.nextCursor,
          )}`,
        )
        .set(customerAuthHeader);
      expect(mismatchedCursor.status).toBe(400);

      const forbiddenOtherCustomer = await request(app.getHttpServer())
        .get(`/api/users/${otherCustomer.id}/vehicles/garage`)
        .set(customerAuthHeader);
      expect(forbiddenOtherCustomer.status).toBe(403);
    } finally {
      await app.close();
    }
  });
});
