import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';

describe('UsersController integration', () => {
  it('creates, reads, and updates a user', async () => {
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

      const createResponse = await request(app.getHttpServer()).post('/api/users').send({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          email: 'customer@example.com',
          role: 'customer',
          isActive: true,
        }),
      );

      const readResponse = await request(app.getHttpServer())
        .get(`/api/users/${createResponse.body.id}`)
        .set(adviserAuthHeader);
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.email).toBe('customer@example.com');

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/users/${createResponse.body.id}`)
        .set(adviserAuthHeader)
        .send({
          firstName: 'Janet',
          birthday: '1998-04-12',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.profile.firstName).toBe('Janet');
      expect(updateResponse.body.profile.birthday).toBe('1998-04-12');
      expect(updateResponse.body.isActive).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('rejects duplicate users, blocks public role escalation, returns not found for missing reads and wrong-address ownership, and switches default addresses', async () => {
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

      const firstUser = await request(app.getHttpServer()).post('/api/users').send({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      const secondUser = await request(app.getHttpServer()).post('/api/users').send({
        email: 'other@example.com',
        firstName: 'John',
        lastName: 'Smith',
      });

      const duplicateUser = await request(app.getHttpServer()).post('/api/users').send({
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      expect(duplicateUser.status).toBe(409);

      const roleEscalationAttempt = await request(app.getHttpServer()).post('/api/users').send({
        email: 'staff@example.com',
        firstName: 'Maria',
        lastName: 'Santos',
        role: 'super_admin',
      });
      expect(roleEscalationAttempt.status).toBe(400);

      const missingUser = await request(app.getHttpServer())
        .get('/api/users/missing-user-id')
        .set(adviserAuthHeader);
      expect(missingUser.status).toBe(404);

      const firstAddress = await request(app.getHttpServer())
        .post(`/api/users/${firstUser.body.id}/addresses`)
        .set(adviserAuthHeader)
        .send({
          label: 'Home',
          addressLine1: '123 AutoCare Street',
          city: 'Quezon City',
          province: 'Metro Manila',
          isDefault: true,
        });
      expect(firstAddress.status).toBe(201);
      expect(firstAddress.body.isDefault).toBe(true);

      const secondAddress = await request(app.getHttpServer())
        .post(`/api/users/${firstUser.body.id}/addresses`)
        .set(adviserAuthHeader)
        .send({
          label: 'Office',
          addressLine1: '456 Service Road',
          city: 'Makati',
          province: 'Metro Manila',
          isDefault: true,
        });
      expect(secondAddress.status).toBe(201);
      expect(secondAddress.body.isDefault).toBe(true);

      const addressList = await request(app.getHttpServer())
        .get(`/api/users/${firstUser.body.id}/addresses`)
        .set(adviserAuthHeader);
      expect(addressList.status).toBe(200);
      expect(addressList.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: firstAddress.body.id,
            isDefault: false,
          }),
          expect.objectContaining({
            id: secondAddress.body.id,
            isDefault: true,
          }),
        ]),
      );

      const wrongOwnerUpdate = await request(app.getHttpServer())
        .patch(`/api/users/${secondUser.body.id}/addresses/${firstAddress.body.id}`)
        .set(adviserAuthHeader)
        .send({
          city: 'Pasig',
        });
      expect(wrongOwnerUpdate.status).toBe(404);

      const forbiddenActivePatch = await request(app.getHttpServer())
        .patch(`/api/users/${firstUser.body.id}`)
        .set(adviserAuthHeader)
        .send({
          isActive: false,
        });
      expect(forbiddenActivePatch.status).toBe(400);
    } finally {
      await app.close();
    }
  });
});
