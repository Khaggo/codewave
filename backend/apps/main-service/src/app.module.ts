import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from '@shared/config/configuration';
import { validateEnv } from '@shared/config/env.validation';
import { DatabaseModule } from '@shared/db/database.module';
import { EventsModule } from '@shared/events/events.module';
import { QueueModule } from '@shared/queue/queue.module';
import { AuthModule } from '@main-modules/auth/auth.module';
import { UsersModule } from '@main-modules/users/users.module';
import { VehiclesModule } from '@main-modules/vehicles/vehicles.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    QueueModule,
    EventsModule,
    UsersModule,
    AuthModule,
    VehiclesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
