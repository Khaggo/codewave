import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('AUTOCARE Main Service API')
    .setDescription(
      'Live OpenAPI contract for the AUTOCARE main service. This surface is intended for Swagger UI and external Swagger/OpenAPI tooling.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide the JWT access token returned by the auth endpoints.',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'AUTOCARE Main Service Docs',
  });
};
