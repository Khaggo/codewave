import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { NotificationsModule } from '@main-modules/notifications/notifications.module';

import { AccessoriesCommonModule } from './common/accessories-common.module';
import {
  AccessoriesWebhookController,
  CustomerAccessoriesController,
  StaffAccessoriesController,
} from './controllers/accessories.controller';
import { AccessoriesRepository } from './repositories/accessories.repository';
import { AccessoriesMediaService } from './services/accessories-media.service';
import { AccessoriesPaymentService } from './services/accessories-payment.service';
import { AccessoriesOperationsService } from './services/accessories-operations.service';
import { AccessoriesService } from './services/accessories.service';

@Module({
  imports: [AuthModule, NotificationsModule, AccessoriesCommonModule],
  controllers: [
    CustomerAccessoriesController,
    StaffAccessoriesController,
    AccessoriesWebhookController,
  ],
  providers: [
    AccessoriesRepository,
    AccessoriesService,
    AccessoriesPaymentService,
    AccessoriesMediaService,
    AccessoriesOperationsService,
  ],
  exports: [AccessoriesService, AccessoriesRepository],
})
export class AccessoriesModule {}
