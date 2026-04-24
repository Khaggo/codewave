import { notificationRoutes, type NotificationStatus } from './requests';
import type {
  NotificationPreferencesResponse,
  NotificationResponse,
} from './responses';

export type CustomerNotificationFeedState =
  | 'feed_loading'
  | 'feed_ready'
  | 'feed_empty'
  | 'feed_forbidden'
  | 'feed_not_found'
  | 'feed_load_failed';

export type CustomerNotificationPreferenceState =
  | 'preferences_loading'
  | 'preferences_enabled'
  | 'preferences_disabled'
  | 'preferences_saving'
  | 'preferences_saved'
  | 'preferences_forbidden'
  | 'preferences_not_found'
  | 'preferences_save_failed';

export type CustomerNotificationDisplayState =
  | 'pending_delivery'
  | 'delivered_unread'
  | 'delivered_local_read'
  | 'failed_retry_pending'
  | 'skipped_by_preference'
  | 'cancelled_hidden';

export interface CustomerNotificationFeedStateRule {
  state: CustomerNotificationFeedState;
  surface: 'customer-mobile';
  truth: 'notification-history-route' | 'client-guard';
  routeKey: 'listNotifications';
  description: string;
}

export interface CustomerNotificationPreferenceStateRule {
  state: CustomerNotificationPreferenceState;
  surface: 'customer-mobile';
  truth: 'notification-preferences-route' | 'client-guard';
  routeKey: 'getNotificationPreferences' | 'updateNotificationPreferences';
  description: string;
}

export interface CustomerNotificationDisplayStateRule {
  state: CustomerNotificationDisplayState;
  surface: 'customer-mobile';
  truth: 'notification-delivery-status' | 'local-session-only-read-state';
  backendStatus: NotificationStatus | 'sent+local-read';
  description: string;
}

export interface CustomerNotificationPresentation {
  id: string;
  title: string;
  message: string;
  status: NotificationStatus;
  displayState: CustomerNotificationDisplayState;
  readStateSource: 'local-session-only';
  canPersistReadState: false;
  sourceType: NotificationResponse['sourceType'];
  sourceId: string;
  createdAt: string;
  scheduledFor: string | null;
  deliveredAt: string | null;
}

export const customerNotificationFeedStateRules: CustomerNotificationFeedStateRule[] = [
  {
    state: 'feed_loading',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listNotifications',
    description: 'The customer mobile app is loading the live notification history route for the active user.',
  },
  {
    state: 'feed_ready',
    surface: 'customer-mobile',
    truth: 'notification-history-route',
    routeKey: 'listNotifications',
    description: 'One or more customer-visible operational notifications were returned by the backend.',
  },
  {
    state: 'feed_empty',
    surface: 'customer-mobile',
    truth: 'notification-history-route',
    routeKey: 'listNotifications',
    description: 'The backend returned an empty customer notification history.',
  },
  {
    state: 'feed_forbidden',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listNotifications',
    description: 'The route cannot be used for another customer or without an active customer session.',
  },
  {
    state: 'feed_not_found',
    surface: 'customer-mobile',
    truth: 'notification-history-route',
    routeKey: 'listNotifications',
    description: 'The requested customer user record does not exist.',
  },
  {
    state: 'feed_load_failed',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'listNotifications',
    description: 'A non-classified network or API failure prevented notification history from loading.',
  },
];

export const customerNotificationPreferenceStateRules: CustomerNotificationPreferenceStateRule[] = [
  {
    state: 'preferences_loading',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'getNotificationPreferences',
    description: 'The customer mobile app is loading the live preference record for the active user.',
  },
  {
    state: 'preferences_enabled',
    surface: 'customer-mobile',
    truth: 'notification-preferences-route',
    routeKey: 'getNotificationPreferences',
    description: 'At least one operational notification preference is enabled for email delivery.',
  },
  {
    state: 'preferences_disabled',
    surface: 'customer-mobile',
    truth: 'notification-preferences-route',
    routeKey: 'getNotificationPreferences',
    description: 'Operational email notifications or all reminder categories are disabled for the customer.',
  },
  {
    state: 'preferences_saving',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'updateNotificationPreferences',
    description: 'The preference update request is in flight.',
  },
  {
    state: 'preferences_saved',
    surface: 'customer-mobile',
    truth: 'notification-preferences-route',
    routeKey: 'updateNotificationPreferences',
    description: 'The backend accepted the preference update and returned the fresh preference record.',
  },
  {
    state: 'preferences_forbidden',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'updateNotificationPreferences',
    description: 'The customer attempted to read or update preferences outside the active account boundary.',
  },
  {
    state: 'preferences_not_found',
    surface: 'customer-mobile',
    truth: 'notification-preferences-route',
    routeKey: 'getNotificationPreferences',
    description: 'The requested customer user record does not exist.',
  },
  {
    state: 'preferences_save_failed',
    surface: 'customer-mobile',
    truth: 'client-guard',
    routeKey: 'updateNotificationPreferences',
    description: 'A non-classified validation, network, or API failure prevented preference persistence.',
  },
];

export const customerNotificationDisplayStateRules: CustomerNotificationDisplayStateRule[] = [
  {
    state: 'pending_delivery',
    surface: 'customer-mobile',
    truth: 'notification-delivery-status',
    backendStatus: 'queued',
    description: 'The notification exists and delivery is pending or scheduled by the notification service.',
  },
  {
    state: 'delivered_unread',
    surface: 'customer-mobile',
    truth: 'notification-delivery-status',
    backendStatus: 'sent',
    description: 'The notification was delivered; unread display is local-only until read endpoints exist.',
  },
  {
    state: 'delivered_local_read',
    surface: 'customer-mobile',
    truth: 'local-session-only-read-state',
    backendStatus: 'sent+local-read',
    description: 'The customer opened or marked the notification in this app session; the state is not persisted by the backend.',
  },
  {
    state: 'failed_retry_pending',
    surface: 'customer-mobile',
    truth: 'notification-delivery-status',
    backendStatus: 'failed',
    description: 'Delivery failed and may be retried by the notification service according to backend policy.',
  },
  {
    state: 'skipped_by_preference',
    surface: 'customer-mobile',
    truth: 'notification-delivery-status',
    backendStatus: 'skipped',
    description: 'Delivery was skipped because channel or category preferences disabled the reminder.',
  },
  {
    state: 'cancelled_hidden',
    surface: 'customer-mobile',
    truth: 'notification-delivery-status',
    backendStatus: 'cancelled',
    description: 'The notification/reminder was cancelled because the source workflow no longer needs customer delivery.',
  },
];

export const customerNotificationReadStateApiGap = {
  status: 'planned',
  swaggerEvidence:
    'Swagger exposes listNotifications, getNotificationPreferences, and updateNotificationPreferences, but no read/unread mutation route.',
  clientPolicy:
    'Use local-session read and dismiss state for display only. Do not persist or sync read/unread until backend endpoints are added.',
} as const;

export const customerNotificationReminderMapping = {
  booking_reminder: {
    sourceDomain: 'main-service.bookings',
    sourceTrigger: 'booking.reminder_requested',
    customerAction: 'open-booking-history-or-detail',
    stateOwner: 'main-service.bookings',
  },
  insurance_update: {
    sourceDomain: 'main-service.insurance',
    sourceTrigger: 'insurance.inquiry_status_changed',
    customerAction: 'open-insurance-tracking',
    stateOwner: 'main-service.insurance',
  },
  back_job_update: {
    sourceDomain: 'main-service.back-jobs',
    sourceTrigger: 'back_job.status_changed',
    customerAction: 'open-vehicle-timeline',
    stateOwner: 'main-service.back-jobs',
  },
  invoice_aging: {
    sourceDomain: 'ecommerce.invoice-payments',
    sourceTrigger: 'order.invoice_issued',
    customerAction: 'open-invoice-or-order-history',
    stateOwner: 'ecommerce.invoice-payments',
  },
  service_follow_up: {
    sourceDomain: 'main-service.job-orders',
    sourceTrigger: 'job_order.service_follow_up_requested',
    customerAction: 'open-vehicle-timeline',
    stateOwner: 'main-service.job-orders',
  },
} as const satisfies Record<NotificationResponse['category'], {
  sourceDomain: string;
  sourceTrigger: string;
  customerAction: string;
  stateOwner: string;
}>;

export const getCustomerNotificationFeedState = (
  notifications: NotificationResponse[],
): Extract<CustomerNotificationFeedState, 'feed_ready' | 'feed_empty'> =>
  notifications.length ? 'feed_ready' : 'feed_empty';

export const getCustomerNotificationPreferenceState = (
  preferences: NotificationPreferencesResponse,
): Extract<CustomerNotificationPreferenceState, 'preferences_enabled' | 'preferences_disabled'> =>
  preferences.emailEnabled &&
  (
    preferences.bookingRemindersEnabled ||
    preferences.insuranceUpdatesEnabled ||
    preferences.invoiceRemindersEnabled ||
    preferences.serviceFollowUpEnabled
  )
    ? 'preferences_enabled'
    : 'preferences_disabled';

export const getCustomerNotificationDisplayState = ({
  notification,
  locallyRead = false,
}: {
  notification: NotificationResponse;
  locallyRead?: boolean;
}): CustomerNotificationDisplayState => {
  if (notification.status === 'sent') {
    return locallyRead ? 'delivered_local_read' : 'delivered_unread';
  }

  if (notification.status === 'queued') {
    return 'pending_delivery';
  }

  if (notification.status === 'failed') {
    return 'failed_retry_pending';
  }

  if (notification.status === 'skipped') {
    return 'skipped_by_preference';
  }

  return 'cancelled_hidden';
};

export const buildCustomerNotificationPresentation = ({
  notification,
  locallyRead = false,
}: {
  notification: NotificationResponse;
  locallyRead?: boolean;
}): CustomerNotificationPresentation => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  status: notification.status,
  displayState: getCustomerNotificationDisplayState({ notification, locallyRead }),
  readStateSource: 'local-session-only',
  canPersistReadState: false,
  sourceType: notification.sourceType,
  sourceId: notification.sourceId,
  createdAt: notification.createdAt,
  scheduledFor: notification.scheduledFor ?? null,
  deliveredAt: notification.deliveredAt ?? null,
});

export const customerNotificationContractSources = {
  getPreferences: notificationRoutes.getNotificationPreferences,
  updatePreferences: notificationRoutes.updateNotificationPreferences,
  listNotifications: notificationRoutes.listNotifications,
} as const;
