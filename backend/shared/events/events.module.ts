import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { CommerceEventsModule } from './commerce-events.module';
import { AUTOCARE_EVENTS_CLIENT } from './events.constants';

@Global()
@Module({
  imports: [
    CommerceEventsModule,
    ClientsModule.registerAsync([
      {
        name: AUTOCARE_EVENTS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>('rabbitmq.url')],
            queue: configService.getOrThrow<string>('rabbitmq.queue'),
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule, CommerceEventsModule],
})
export class EventsModule {}
