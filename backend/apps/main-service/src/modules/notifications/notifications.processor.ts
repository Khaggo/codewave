import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { NOTIFICATIONS_QUEUE_NAME } from './notifications.constants';
import { NotificationsService } from './services/notifications.service';

@Processor(NOTIFICATIONS_QUEUE_NAME)
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<{ notificationId?: string }>) {
    if (job.name !== 'deliver-notification' || !job.data.notificationId) {
      return null;
    }

    return this.notificationsService.deliverNotification(job.data.notificationId);
  }
}
