import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotificationsRepository } from '@main-modules/notifications/repositories/notifications.repository';

import { AccessoriesRepository } from '../repositories/accessories.repository';

@Injectable()
export class AccessoriesOperationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccessoriesOperationsService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly repository: AccessoriesRepository,
    private readonly notifications: NotificationsRepository,
  ) {}

  onModuleInit() {
    if ((this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'test') return;

    this.timer = setInterval(() => {
      void this.tick();
    }, 60_000);
    this.timer.unref?.();
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    if (this.running) return;
    this.running = true;

    try {
      const released = await this.repository.releaseExpiredReservations();
      if (released > 0) {
        this.logger.log(`Released ${released} expired accessory reservation(s).`);
      }

      const events = await this.repository.claimOutboxBatch(25);
      for (const event of events) {
        try {
          const payload = event.payload as Record<string, unknown>;
          const userId = typeof payload.userId === 'string' ? payload.userId : '';
          if (userId) {
            const copy = this.notificationCopy(event.eventType, payload);
            const dedupeKey = `accessory-outbox:${event.id}`;
            const existing = await this.notifications.findNotificationByDedupeKey(dedupeKey);
            if (!existing) {
              await this.notifications.createNotification({
                userId,
                category: 'accessory_order',
                channel: 'in_app',
                sourceType: 'accessory_order',
                sourceId: event.aggregateId,
                title: copy.title,
                message: copy.message,
                status: 'sent',
                dedupeKey,
                deliveredAt: new Date(),
              });
            }
          }
          await this.repository.markOutboxSent(event.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown outbox failure';
          await this.repository.markOutboxFailed(event.id, message);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown operations failure';
      this.logger.error(`Accessory operations tick failed: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private notificationCopy(eventType: string, payload: Record<string, unknown>) {
    const reference =
      typeof payload.orderReference === 'string' ? ` ${payload.orderReference}` : '';
    if (eventType === 'accessory.order.ready_for_pickup') {
      return {
        title: 'Accessory order ready',
        message: `Your accessory order${reference} is ready for pickup. Bring the reference and your six-digit code.`,
      };
    }
    if (eventType === 'accessory.payment.exception') {
      return {
        title: 'Accessory payment needs attention',
        message: `Payment was received after the reservation changed. A full refund is being arranged.`,
      };
    }
    if (eventType === 'accessory.refund.requested') {
      return {
        title: 'Full refund requested',
        message: `Your accessory order cancellation is awaiting full-refund processing.`,
      };
    }
    if (eventType === 'accessory.order.cancelled') {
      return {
        title: 'Accessory order cancelled',
        message: `Your accessory order${reference} was cancelled and its stock reservation was released.`,
      };
    }
    return {
      title: 'Accessory order updated',
      message: `Your accessory order${reference} has a new status. Open Accessories to review it.`,
    };
  }
}
