import request from 'supertest';

import { createMainServiceTestApp } from './helpers/main-service-test-app';
import { validateMainServiceOpenApiDocument } from '../../../scripts/swagger.contract';

describe('Main service OpenAPI integration', () => {
  it('publishes the expanded bookings, job-orders, insurance, and QA contract in /docs-json', async () => {
    const { app } = await createMainServiceTestApp();

    try {
      const response = await request(app.getHttpServer()).get('/docs-json');

      expect(response.status).toBe(200);
      expect(response.body.info).toEqual(
        expect.objectContaining({
          title: 'AUTOCARE Main Service API',
        }),
      );

      validateMainServiceOpenApiDocument(response.body);
    } finally {
      await app.close();
    }
  });
});
