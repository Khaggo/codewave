import request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CatalogModule } from '@ecommerce-modules/catalog/catalog.module';

import { HealthController } from '../src/health.controller';
import { setupSwagger } from '../src/swagger';

describe('EcommerceService bootstrap integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatalogModule],
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    setupSwagger(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes health and bootstrap catalog routes', async () => {
    const [healthResponse, productsResponse, categoriesResponse] = await Promise.all([
      request(app.getHttpServer()).get('/api/health'),
      request(app.getHttpServer()).get('/api/products'),
      request(app.getHttpServer()).get('/api/product-categories'),
    ]);

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body).toEqual({
      service: 'ecommerce-service',
      status: 'ok',
    });

    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sku: 'ENG-OIL-5W30',
        }),
      ]),
    );

    expect(categoriesResponse.status).toBe(200);
    expect(categoriesResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'engine-parts',
        }),
      ]),
    );
  });

  it('publishes a swagger document for the ecommerce bootstrap surface', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json');

    expect(response.status).toBe(200);
    expect(response.body.info).toEqual(
      expect.objectContaining({
        title: 'AUTOCARE E-Commerce Service API',
      }),
    );
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining(['/api/health', '/api/products', '/api/products/{id}', '/api/product-categories']),
    );
  });
});
