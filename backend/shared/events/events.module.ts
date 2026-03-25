import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const AUTOCARE_EVENTS_CLIENT = 'AUTOCARE_EVENTS_CLIENT';

@Global()
@Module({
  imports: [
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
  exports: [ClientsModule],
})
export class EventsModule {}
