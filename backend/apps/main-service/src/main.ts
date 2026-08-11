import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import {
  createCorsOriginCallback,
  STAFF_API_CORS_ALLOWED_HEADERS,
} from '@shared/config/cors';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);
  const env = configService.get<string>('env', 'development');
  const allowedOrigins = configService.get<string[]>('cors.origins', [
    'http://localhost:3002',
    'http://127.0.0.1:3002',
  ]);
  const publicOpenApiEnabled = configService.get<boolean>(
    'openApi.publicEnabled',
    env.toLowerCase() !== 'production',
  );

  if (env.toLowerCase() === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: createCorsOriginCallback({ allowedOrigins, env }),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: STAFF_API_CORS_ALLOWED_HEADERS,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (publicOpenApiEnabled) {
    setupSwagger(app);
  }

  const rabbitmqUrl = configService.get<string>('rabbitmq.url');
  if (rabbitmqUrl) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: configService.get<string>('rabbitmq.queue', 'autocare_events'),
        queueOptions: {
          durable: true,
        },
        noAck: false,
      },
    });

    await app.startAllMicroservices();
  }

  await app.listen(configService.get<number>('ports.mainService', 3000));
}

bootstrap();
