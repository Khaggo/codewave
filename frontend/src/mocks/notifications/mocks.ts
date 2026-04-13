import type { ApiErrorResponse } from '../../lib/api/generated/shared';
import type {
  NotificationPreferencesResponse,
  NotificationResponse,
} from '../../lib/api/generated/notifications/responses';

export const notificationPreferencesMock: NotificationPreferencesResponse = {
  id: '34f6f152-04b4-4b9c-8340-0b9cbb1e7bc4',
  userId: 'a3cce1f2-a6eb-4fdd-bf11-8b17d3ddfc17',
  emailEnabled: true,
  smsEnabled: false,
  bookingRemindersEnabled: false,
  insuranceUpdatesEnabled: true,
  invoiceRemindersEnabled: true,
  serviceFollowUpEnabled: true,
  createdAt: '2026-04-20T08:00:00.000Z',
  updatedAt: '2026-04-20T08:10:00.000Z',
};

export const notificationsMock: NotificationResponse[] = [
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
    id: '0f50ad36-7cba-4760-ad53-542a1b18bd0f',
    userId: notificationPreferencesMock.userId,
    category: 'booking_reminder',
    channel: 'sms',
    sourceType: 'booking',
    sourceId: 'booking-1',
    title: 'Upcoming booking reminder',
    message: 'Your appointment is tomorrow at 9:00 AM.',
    status: 'skipped',
    dedupeKey: 'booking-1-reminder-sms',
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
        errorMessage: 'SMS notifications are disabled for this user',
        attemptedAt: '2026-04-20T08:15:00.000Z',
      },
    ],
  },
];

export const notificationForbiddenErrorMock: ApiErrorResponse = {
  statusCode: 403,
  code: 'FORBIDDEN',
  message: 'Customers can only access their own notification history.',
  source: 'swagger',
};
