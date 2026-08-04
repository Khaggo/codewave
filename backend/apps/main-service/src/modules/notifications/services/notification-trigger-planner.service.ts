import { Injectable } from '@nestjs/common';

import {
  AnyNotificationTriggerEnvelope,
  NotificationTriggerEnvelope,
  NotificationTriggerName,
} from '@shared/events/contracts/notification-triggers';

import {
  notificationCategoryEnum,
  notificationChannelEnum,
  notificationSourceTypeEnum,
} from '../schemas/notifications.schema';

type NotificationCategory = (typeof notificationCategoryEnum.enumValues)[number];
type NotificationChannel = (typeof notificationChannelEnum.enumValues)[number];
type NotificationSourceType = (typeof notificationSourceTypeEnum.enumValues)[number];
type InsuranceReminderState =
  NotificationTriggerEnvelope<'insurance.inquiry_status_changed'>['payload']['customerReminderState'];

const insuranceReminderCopy: Record<
  InsuranceReminderState,
  {
    title: string;
    message: string;
  }
> = {
  needs_documents: {
    title: 'Missing documents',
    message: 'Please upload the required insurance documents so we can continue your request.',
  },
  payment_pending: {
    title: 'Payment pending',
    message: 'Your insurance request now needs payment action.',
  },
  payment_overdue: {
    title: 'Payment overdue',
    message:
      'Your insurance request is overdue for payment. Upload proof after payment or contact staff for help.',
  },
  for_renewal: {
    title: 'Renewal follow-up',
    message: 'Your insurance renewal is coming up. Open your insurance request for the next step.',
  },
  renewal_awaiting_customer: {
    title: 'Renewal waiting for you',
    message: 'Your insurance renewal needs your response to continue.',
  },
};

export type NotificationTriggerPlanAction =
  | {
      kind: 'enqueue_notification';
      userId: string;
      category: NotificationCategory;
      channel: NotificationChannel;
      sourceType: NotificationSourceType;
      sourceId: string;
      title: string;
      message: string;
      dedupeKey: string;
      customerVisible: true;
    }
  | {
      kind: 'schedule_reminder';
      userId: string;
      category: NotificationCategory;
      channel: NotificationChannel;
      sourceType: NotificationSourceType;
      sourceId: string;
      title: string;
      message: string;
      dedupeKey: string;
      scheduledFor: Date;
      customerVisible: true;
    }
  | {
      kind: 'cancel_notifications';
      sourceType: NotificationSourceType;
      sourceId: string;
      category: NotificationCategory;
      customerVisible: false;
      reason: string;
    }
  | {
      kind: 'cancel_reminder_rules';
      sourceType: NotificationSourceType;
      sourceId: string;
      reminderType: NotificationCategory;
      customerVisible: false;
      reason: string;
    };

export interface NotificationTriggerPlan {
  triggerName: NotificationTriggerName;
  sourceDomain: AnyNotificationTriggerEnvelope['sourceDomain'];
  dedupePolicy: 'stable-source-dedupe-v1';
  retryPolicy: 'bullmq-deliver-notification-v1';
  actions: NotificationTriggerPlanAction[];
}

@Injectable()
export class NotificationTriggerPlannerService {
  plan(trigger: AnyNotificationTriggerEnvelope): NotificationTriggerPlan {
    if (trigger.name === 'booking.reminder_requested') {
      return {
        triggerName: trigger.name,
        sourceDomain: trigger.sourceDomain,
        dedupePolicy: 'stable-source-dedupe-v1',
        retryPolicy: 'bullmq-deliver-notification-v1',
        actions: [
          {
            kind: 'schedule_reminder',
            userId: trigger.payload.userId,
            category: 'booking_reminder',
            channel: 'email',
            sourceType: 'booking',
            sourceId: trigger.payload.bookingId,
            title: 'Upcoming booking reminder',
            message: `Your appointment starts at ${trigger.payload.appointmentStartsAt}.`,
            dedupeKey: `notification:booking.reminder_requested:${trigger.payload.bookingId}:${trigger.payload.scheduledFor}`,
            scheduledFor: new Date(trigger.payload.scheduledFor),
            customerVisible: true,
          },
        ],
      };
    }

    if (trigger.name === 'insurance.inquiry_status_changed') {
      const reminderState = trigger.payload.customerReminderState;
      const reminderCopy = reminderState ? insuranceReminderCopy[reminderState] : null;

      return {
        triggerName: trigger.name,
        sourceDomain: trigger.sourceDomain,
        dedupePolicy: 'stable-source-dedupe-v1',
        retryPolicy: 'bullmq-deliver-notification-v1',
        actions: reminderCopy
          ? [
              {
                kind: 'enqueue_notification',
                userId: trigger.payload.userId,
                category: 'insurance_update',
                channel: 'in_app',
                sourceType: 'insurance_inquiry',
                sourceId: trigger.payload.inquiryId,
                title: reminderCopy.title,
                message: reminderCopy.message,
                dedupeKey: `notification:insurance.reminder:${trigger.payload.inquiryId}:${reminderState}:${trigger.payload.transitionedAt}`,
                customerVisible: true,
              },
            ]
          : [],
      };
    }

    if (trigger.name === 'back_job.status_changed') {
      return {
        triggerName: trigger.name,
        sourceDomain: trigger.sourceDomain,
        dedupePolicy: 'stable-source-dedupe-v1',
        retryPolicy: 'bullmq-deliver-notification-v1',
        actions: [
          {
            kind: 'enqueue_notification',
            userId: trigger.payload.customerUserId,
            category: 'back_job_update',
            channel: 'email',
            sourceType: 'back_job',
            sourceId: trigger.payload.backJobId,
            title: 'Back-job status update',
            message: `Your return or rework case is now ${trigger.payload.status.replace(/_/g, ' ')}.`,
            dedupeKey: `notification:back_job.status_changed:${trigger.payload.backJobId}:${trigger.payload.status}`,
            customerVisible: true,
          },
        ],
      };
    }

    if (trigger.name === 'job_order.service_follow_up_requested') {
      return {
        triggerName: trigger.name,
        sourceDomain: trigger.sourceDomain,
        dedupePolicy: 'stable-source-dedupe-v1',
        retryPolicy: 'bullmq-deliver-notification-v1',
        actions: [
          {
            kind: 'schedule_reminder',
            userId: trigger.payload.userId,
            category: 'service_follow_up',
            channel: 'email',
            sourceType: 'service_follow_up',
            sourceId: trigger.payload.jobOrderId,
            title: 'Service follow-up reminder',
            message: trigger.payload.serviceLabel
              ? `Your follow-up for ${trigger.payload.serviceLabel} is scheduled on ${trigger.payload.scheduledFor}.`
              : `Your AUTOCARE service follow-up is scheduled on ${trigger.payload.scheduledFor}.`,
            dedupeKey: `notification:job_order.service_follow_up_requested:${trigger.payload.jobOrderId}:${trigger.payload.scheduledFor}`,
            scheduledFor: new Date(trigger.payload.scheduledFor),
            customerVisible: true,
          },
        ],
      };
    }

    throw new Error('Unsupported notification trigger');
  }

}
