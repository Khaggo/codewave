import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setupSwagger = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('AUTOCARE E-Commerce Service API')
    .setDescription(
      'Live OpenAPI contract for the AUTOCARE ecommerce service. This surface is intended for Swagger UI and external Swagger/OpenAPI tooling.',
    )
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'AUTOCARE E-Commerce Service Docs',
  });
};
