import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

import { CommerceEventsModule } from './commerce-events.module';
import { AUTOCARE_EVENTS_CLIENT } from './events.constants';

@Global()
@Module({
  imports: [
    CommerceEventsModule,
  ],
  providers: [
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
  exports: [AUTOCARE_EVENTS_CLIENT, CommerceEventsModule],
})
export class EventsModule {}
