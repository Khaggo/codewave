import type { RouteContract } from '../shared';

export type NotificationChannel = 'email';
export type NotificationCategory =
  | 'booking_reminder'
  | 'insurance_update'
  | 'back_job_update'
  | 'invoice_aging'
  | 'service_follow_up';
export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'skipped' | 'cancelled';

export interface UpdateNotificationPreferencesRequest {
  emailEnabled?: boolean;
  bookingRemindersEnabled?: boolean;
  insuranceUpdatesEnabled?: boolean;
  invoiceRemindersEnabled?: boolean;
  serviceFollowUpEnabled?: boolean;
}

export const notificationRoutes: Record<string, RouteContract> = {
  getNotificationPreferences: {
    method: 'GET',
    path: '/api/users/:id/notification-preferences',
    status: 'live',
    source: 'swagger',
  },
  updateNotificationPreferences: {
    method: 'PATCH',
    path: '/api/users/:id/notification-preferences',
    status: 'live',
    source: 'swagger',
  },
  listNotifications: {
    method: 'GET',
    path: '/api/users/:id/notifications',
    status: 'live',
    source: 'swagger',
  },
};
