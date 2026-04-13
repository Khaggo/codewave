import type { NotificationCategory, NotificationChannel, NotificationStatus } from './requests';

export interface NotificationPreferencesResponse {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  bookingRemindersEnabled: boolean;
  insuranceUpdatesEnabled: boolean;
  invoiceRemindersEnabled: boolean;
  serviceFollowUpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryAttemptResponse {
  id: string;
  notificationId: string;
  attemptNumber: number;
  status: 'sent' | 'failed' | 'skipped';
  providerMessageId?: string | null;
  errorMessage?: string | null;
  attemptedAt: string;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  sourceType: 'booking' | 'insurance_inquiry' | 'back_job' | 'invoice_payment' | 'service_follow_up';
  sourceId: string;
  title: string;
  message: string;
  status: NotificationStatus;
  dedupeKey: string;
  scheduledFor?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  attempts: NotificationDeliveryAttemptResponse[];
}
