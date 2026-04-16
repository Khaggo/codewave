import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { AuthModule } from '@main-modules/auth/auth.module';
import { UsersModule } from '@main-modules/users/users.module';

import { NotificationsController } from './controllers/notifications.controller';
import { NOTIFICATIONS_QUEUE_NAME } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationTriggerPlannerService } from './services/notification-trigger-planner.service';
import { NotificationsService } from './services/notifications.service';
import { SmtpMailService } from './services/smtp-mail.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    UsersModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE_NAME }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationTriggerPlannerService,
    NotificationsService,
    NotificationsProcessor,
    SmtpMailService,
  ],
  exports: [NotificationsRepository, NotificationsService],
})
export class NotificationsModule {}
