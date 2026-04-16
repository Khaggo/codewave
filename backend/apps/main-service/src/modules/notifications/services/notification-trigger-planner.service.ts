import { Injectable } from '@nestjs/common';

import {
  AnyCommerceEventEnvelope,
  CommerceEventEnvelope,
} from '@shared/events/contracts/commerce-events';
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
  triggerName:
    | NotificationTriggerName
    | CommerceEventEnvelope['name'];
  sourceDomain:
    | AnyNotificationTriggerEnvelope['sourceDomain']
    | AnyCommerceEventEnvelope['sourceDomain'];
  dedupePolicy: 'stable-source-dedupe-v1';
  retryPolicy: 'bullmq-deliver-notification-v1';
  actions: NotificationTriggerPlanAction[];
}

type NotificationTriggerCandidate = AnyNotificationTriggerEnvelope | AnyCommerceEventEnvelope;

@Injectable()
export class NotificationTriggerPlannerService {
  plan(trigger: NotificationTriggerCandidate): NotificationTriggerPlan {
    if (this.isCommerceInvoiceIssued(trigger)) {
      return {
        triggerName: trigger.name,
        sourceDomain: trigger.sourceDomain,
        dedupePolicy: 'stable-source-dedupe-v1',
        retryPolicy: 'bullmq-deliver-notification-v1',
        actions: [
          {
            kind: 'schedule_reminder',
            userId: trigger.payload.customerUserId,
            category: 'invoice_aging',
            channel: 'email',
            sourceType: 'invoice_payment',
            sourceId: trigger.payload.invoiceId,
            title: `Invoice ${trigger.payload.invoiceNumber} is ready`,
            message: `Your AUTOCARE invoice ${trigger.payload.invoiceNumber} is ready. Payment is due on ${trigger.payload.dueAt}.`,
            dedupeKey: `notification:order.invoice_issued:${trigger.payload.invoiceId}`,
            scheduledFor: new Date(trigger.payload.dueAt),
            customerVisible: true,
          },
        ],
      };
    }

    if (this.isCommerceInvoicePaymentRecorded(trigger)) {
      const shouldCancelAgingPolicy =
        trigger.payload.amountDueCents <= 0 ||
        trigger.payload.invoiceStatus === 'paid' ||
        trigger.payload.invoiceStatus === 'cancelled';

      return {
        triggerName: trigger.name,
        sourceDomain: trigger.sourceDomain,
        dedupePolicy: 'stable-source-dedupe-v1',
        retryPolicy: 'bullmq-deliver-notification-v1',
        actions: shouldCancelAgingPolicy
          ? [
              {
                kind: 'cancel_reminder_rules',
                sourceType: 'invoice_payment',
                sourceId: trigger.payload.invoiceId,
                reminderType: 'invoice_aging',
                customerVisible: false,
                reason: 'Invoice payment facts stop the aging reminder policy once nothing is due.',
              },
              {
                kind: 'cancel_notifications',
                sourceType: 'invoice_payment',
                sourceId: trigger.payload.invoiceId,
                category: 'invoice_aging',
                customerVisible: false,
                reason: 'Queued invoice-aging notices must not continue after the invoice is settled.',
              },
            ]
          : [],
      };
    }

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
      return {
        triggerName: trigger.name,
        sourceDomain: trigger.sourceDomain,
        dedupePolicy: 'stable-source-dedupe-v1',
        retryPolicy: 'bullmq-deliver-notification-v1',
        actions: [
          {
            kind: 'enqueue_notification',
            userId: trigger.payload.userId,
            category: 'insurance_update',
            channel: 'email',
            sourceType: 'insurance_inquiry',
            sourceId: trigger.payload.inquiryId,
            title: 'Insurance inquiry update',
            message: `Your insurance inquiry "${trigger.payload.subject}" is now ${trigger.payload.status.replace(/_/g, ' ')}.`,
            dedupeKey: `notification:insurance.inquiry_status_changed:${trigger.payload.inquiryId}:${trigger.payload.status}`,
            customerVisible: true,
          },
        ],
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

    throw new Error(`Unsupported notification trigger: ${trigger.name}`);
  }

  private isCommerceInvoiceIssued(
    trigger: NotificationTriggerCandidate,
  ): trigger is CommerceEventEnvelope<'order.invoice_issued'> {
    return trigger.name === 'order.invoice_issued';
  }

  private isCommerceInvoicePaymentRecorded(
    trigger: NotificationTriggerCandidate,
  ): trigger is CommerceEventEnvelope<'invoice.payment_recorded'> {
    return trigger.name === 'invoice.payment_recorded';
  }
}
