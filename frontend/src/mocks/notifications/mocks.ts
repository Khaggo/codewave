import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type {
  NotificationPreferencesResponse,
  NotificationResponse,
} from '../../lib/api/generated/notifications/responses';
import type {
  BackJobStatusChangedTrigger,
  BookingReminderRequestedTrigger,
  NotificationTriggerPlan,
} from '../../lib/api/generated/notifications/triggers';
import {
  customerNotificationDisplayStateRules,
  customerNotificationFeedStateRules,
  customerNotificationPreferenceStateRules,
  customerNotificationReadStateApiGap,
  getCustomerNotificationDisplayState,
  getCustomerNotificationFeedState,
  getCustomerNotificationPreferenceState,
} from '../../lib/api/generated/notifications/customer-mobile-notifications';

export const notificationPreferencesMock: NotificationPreferencesResponse = {
  id: '34f6f152-04b4-4b9c-8340-0b9cbb1e7bc4',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  emailEnabled: true,
  bookingRemindersEnabled: false,
  insuranceUpdatesEnabled: true,
  invoiceRemindersEnabled: true,
  serviceFollowUpEnabled: true,
  createdAt: '2026-04-20T08:00:00.000Z',
  updatedAt: '2026-04-20T08:10:00.000Z',
};

export const notificationPreferencesEnabledMock: NotificationPreferencesResponse = {
  ...notificationPreferencesMock,
  id: 'd72f9640-4268-442c-a112-e6d3d9d7342e',
  emailEnabled: true,
  bookingRemindersEnabled: true,
  insuranceUpdatesEnabled: true,
  invoiceRemindersEnabled: true,
  serviceFollowUpEnabled: true,
};

export const notificationPreferencesDisabledMock: NotificationPreferencesResponse = {
  ...notificationPreferencesMock,
  id: '8c9ccecf-b2c1-466f-a510-094ba0c410b4',
  emailEnabled: false,
  bookingRemindersEnabled: false,
  insuranceUpdatesEnabled: false,
  invoiceRemindersEnabled: false,
  serviceFollowUpEnabled: false,
};

export const notificationsMock: NotificationResponse[] = [
  {
    id: '8e09a2a2-df28-4627-9f09-4bfe4431c2bc',
    userId: notificationPreferencesMock.userId,
    category: 'booking_reminder',
    channel: 'email',
    sourceType: 'booking',
    sourceId: 'booking-2',
    title: 'Booking confirmed',
    message: 'Staff confirmed your appointment. Open booking history for the latest schedule.',
    status: 'sent',
    dedupeKey: 'notification:booking.status_changed:booking-2:confirmed',
    scheduledFor: null,
    deliveredAt: '2026-04-20T07:58:00.000Z',
    createdAt: '2026-04-20T07:55:00.000Z',
    updatedAt: '2026-04-20T07:58:00.000Z',
    attempts: [
      {
        id: '2d1d95a0-d2ea-4f31-bfb6-381a9e1ca8f1',
        notificationId: '8e09a2a2-df28-4627-9f09-4bfe4431c2bc',
        attemptNumber: 1,
        status: 'sent',
        providerMessageId: 'smtp-booking-confirmed-1',
        errorMessage: null,
        attemptedAt: '2026-04-20T07:58:00.000Z',
      },
    ],
  },
  {
    id: 'ac6e087b-e5cf-4cd3-b0ca-df3826e3aef5',
    userId: notificationPreferencesMock.userId,
    category: 'insurance_update',
    channel: 'email',
    sourceType: 'insurance_inquiry',
    sourceId: 'insurance-1',
    title: 'Insurance inquiry update',
    message: 'Your insurance inquiry is now under review.',
    status: 'queued',
    dedupeKey: 'insurance-1-email',
    scheduledFor: null,
    deliveredAt: null,
    createdAt: '2026-04-20T08:12:00.000Z',
    updatedAt: '2026-04-20T08:12:00.000Z',
    attempts: [],
  },
  {
    id: '2b5f5e11-dc3e-480d-8c27-b688f2d2f0ab',
    userId: notificationPreferencesMock.userId,
    category: 'back_job_update',
    channel: 'email',
    sourceType: 'back_job',
    sourceId: 'back-job-1',
    title: 'Back-job status update',
    message: 'Your return or rework case is now resolved.',
    status: 'queued',
    dedupeKey: 'notification:back_job.status_changed:back-job-1:resolved',
    scheduledFor: null,
    deliveredAt: null,
    createdAt: '2026-04-20T08:18:00.000Z',
    updatedAt: '2026-04-20T08:18:00.000Z',
    attempts: [],
  },
  {
    id: '6cc55c1f-f057-4d58-9286-ad45ed04e95a',
    userId: notificationPreferencesMock.userId,
    category: 'invoice_aging',
    channel: 'email',
    sourceType: 'invoice_payment',
    sourceId: 'invoice-payment-1',
    title: 'Invoice reminder retry',
    message: 'We could not deliver the invoice reminder yet. The notification service may retry.',
    status: 'failed',
    dedupeKey: 'notification:order.invoice_issued:invoice-payment-1:aging',
    scheduledFor: '2026-04-20T08:20:00.000Z',
    deliveredAt: null,
    createdAt: '2026-04-20T08:20:00.000Z',
    updatedAt: '2026-04-20T08:25:00.000Z',
    attempts: [
      {
        id: 'cf3f0a31-af75-41cc-b884-daa0866e9d93',
        notificationId: '6cc55c1f-f057-4d58-9286-ad45ed04e95a',
        attemptNumber: 1,
        status: 'failed',
        providerMessageId: null,
        errorMessage: 'SMTP provider temporarily unavailable.',
        attemptedAt: '2026-04-20T08:25:00.000Z',
      },
    ],
  },
  {
    id: '0f50ad36-7cba-4760-ad53-542a1b18bd0f',
    userId: notificationPreferencesMock.userId,
    category: 'booking_reminder',
    channel: 'email',
    sourceType: 'booking',
    sourceId: 'booking-1',
    title: 'Upcoming booking reminder',
    message: 'Your appointment is tomorrow at 9:00 AM.',
    status: 'skipped',
    dedupeKey: 'booking-1-reminder-email',
    scheduledFor: '2026-04-21T01:00:00.000Z',
    deliveredAt: null,
    createdAt: '2026-04-20T08:15:00.000Z',
    updatedAt: '2026-04-20T08:15:00.000Z',
    attempts: [
      {
        id: 'd09ec9e6-69d5-48ac-bf50-50efbe4ff9af',
        notificationId: '0f50ad36-7cba-4760-ad53-542a1b18bd0f',
        attemptNumber: 1,
        status: 'skipped',
        providerMessageId: null,
        errorMessage: 'Email notifications are disabled for this user',
        attemptedAt: '2026-04-20T08:15:00.000Z',
      },
    ],
  },
];

export const customerNotificationStateRuleMocks = {
  feed: customerNotificationFeedStateRules,
  preferences: customerNotificationPreferenceStateRules,
  display: customerNotificationDisplayStateRules,
};

export const customerNotificationReadStateGapMock = customerNotificationReadStateApiGap;

export const customerNotificationStateSnapshotMock = {
  feedState: getCustomerNotificationFeedState(notificationsMock),
  enabledPreferenceState: getCustomerNotificationPreferenceState(notificationPreferencesEnabledMock),
  disabledPreferenceState: getCustomerNotificationPreferenceState(notificationPreferencesDisabledMock),
  displayStates: notificationsMock.map((notification) => ({
    notificationId: notification.id,
    status: notification.status,
    displayState: getCustomerNotificationDisplayState({ notification }),
    readStateSource: 'local-session-only' as const,
  })),
};

export const bookingReminderTriggerMock: BookingReminderRequestedTrigger = {
  name: 'booking.reminder_requested',
  sourceDomain: 'main-service.bookings',
  payload: {
    bookingId: 'booking-1',
    userId: notificationPreferencesMock.userId,
    scheduledFor: '2026-04-21T01:00:00.000Z',
    appointmentStartsAt: '2026-04-21T09:00:00.000Z',
  },
};

export const backJobStatusTriggerMock: BackJobStatusChangedTrigger = {
  name: 'back_job.status_changed',
  sourceDomain: 'main-service.back-jobs',
  payload: {
    backJobId: 'back-job-1',
    customerUserId: notificationPreferencesMock.userId,
    status: 'resolved',
  },
};

export const invoicePaymentCancellationPlanMock: NotificationTriggerPlan = {
  triggerName: 'invoice.payment_recorded',
  sourceDomain: 'ecommerce.invoice-payments',
  dedupePolicy: 'stable-source-dedupe-v1',
  retryPolicy: 'bullmq-deliver-notification-v1',
  actions: [
    {
      kind: 'cancel_reminder_rules',
      customerVisible: false,
    },
    {
      kind: 'cancel_notifications',
      customerVisible: false,
    },
  ],
};

export const notificationForbiddenErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Customers can only access their own notification history.',
  source: 'swagger',
};
