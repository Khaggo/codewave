import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('VehiclesController integration', () => {
  it('creates, reads, lists, and updates vehicles for a valid owner', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const createVehicle = await request(app.getHttpServer()).post('/api/vehicles').send({
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

      const readVehicle = await request(app.getHttpServer()).get(`/api/vehicles/${createVehicle.body.id}`);
      expect(readVehicle.status).toBe(200);
      expect(readVehicle.body.id).toBe(createVehicle.body.id);

      const listVehicles = await request(app.getHttpServer()).get(`/api/users/${userResponse.body.id}/vehicles`);
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
    const { app } = await createMainServiceTestApp();

    try {
      const userResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'ABC1234',
        make: 'Toyota',
        model: 'Vios',
        year: 2020,
      });

      const missingOwner = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: 'missing-user-id',
        plateNumber: 'XYZ9876',
        make: 'Honda',
        model: 'City',
        year: 2021,
      });
      expect(missingOwner.status).toBe(404);

      const duplicatePlate = await request(app.getHttpServer()).post('/api/vehicles').send({
        userId: userResponse.body.id,
        plateNumber: 'ABC1234',
        make: 'Mitsubishi',
        model: 'Mirage',
        year: 2022,
      });
      expect(duplicatePlate.status).toBe(409);

      const invalidUpdate = await request(app.getHttpServer()).patch('/api/vehicles/missing-vehicle-id').send({
        color: 'Red',
      });
      expect(invalidUpdate.status).toBe(404);
    } finally {
      await app.close();
    }
  });
});
