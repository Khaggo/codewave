import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

import { AutocareEventBusService } from './autocare-event-bus.service';
import { AUTOCARE_EVENTS_CLIENT } from './events.constants';

@Global()
@Module({
  providers: [
    AutocareEventBusService,
    {
      provide: AUTOCARE_EVENTS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('rabbitmq.url');

        if (!url) {
          return null;
        }

        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [url],
            queue: configService.get<string>('rabbitmq.queue', 'autocare_events'),
            queueOptions: {
              durable: true,
            },
          },
        });
      },
    },
  ],
  exports: [AUTOCARE_EVENTS_CLIENT, AutocareEventBusService],
})
export class EventsModule {}
