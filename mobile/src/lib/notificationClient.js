import {
  createNotificationApiError,
  requestNotificationApi,
} from './notificationTransport.js';

const categoryVisualMap = {
  back_job_update: {
    action: 'timeline',
    bgColor: 'rgba(18, 215, 100, 0.14)',
    icon: 'backup-restore',
    tint: '#12D764',
  },
  booking_reminder: {
    action: 'booking',
    bgColor: 'rgba(255, 122, 0, 0.14)',
    icon: 'calendar-clock-outline',
    tint: '#FF7A00',
  },
  insurance_update: {
    action: 'insurance',
    bgColor: 'rgba(52, 127, 255, 0.14)',
    icon: 'shield-outline',
    tint: '#347FFF',
  },
  invoice_aging: {
    action: 'rewards',
    bgColor: 'rgba(255, 197, 0, 0.14)',
    icon: 'cash-clock',
    tint: '#FFC500',
  },
  service_follow_up: {
    action: 'timeline',
    bgColor: 'rgba(36, 227, 122, 0.14)',
    icon: 'wrench-check-outline',
    tint: '#24E37A',
  },
};

const categorySyncMetadataMap = {
  back_job_update: {
    consistencyModel: 'event_driven_read_model',
    ownerDomain: 'main-service.notifications',
    sourceDomain: 'main-service.back-jobs',
    crossServiceHint:
      'Back-job updates appear after the notification service processes the latest workshop event.',
  },
  booking_reminder: {
    consistencyModel: 'event_driven_read_model',
    ownerDomain: 'main-service.notifications',
    sourceDomain: 'main-service.bookings',
    crossServiceHint:
      'Booking reminders appear after the notification service syncs the current booking fact.',
  },
  insurance_update: {
    consistencyModel: 'event_driven_read_model',
    ownerDomain: 'main-service.notifications',
    sourceDomain: 'main-service.insurance',
    crossServiceHint:
      'Insurance updates appear after the notification service syncs the latest inquiry status change.',
  },
  invoice_aging: {
    consistencyModel: 'event_driven_read_model',
    ownerDomain: 'main-service.notifications',
    sourceDomain: 'main-service.job-orders',
    crossServiceHint:
      'Invoice reminders follow finalized service work and may appear after the latest job-order payment update is processed.',
  },
  service_follow_up: {
    consistencyModel: 'event_driven_read_model',
    ownerDomain: 'main-service.notifications',
    sourceDomain: 'main-service.job-orders',
    crossServiceHint:
      'Service follow-up notices appear after job-order events are processed by notifications.',
  },
};

const categoryChannelMap = {
  back_job_update: 'email',
  booking_reminder: 'email',
  insurance_update: 'in_app',
  invoice_aging: 'email',
  service_follow_up: 'email',
};

const sourceTypeChannelMap = {
  back_job: 'email',
  booking: 'email',
  insurance_inquiry: 'in_app',
};

const notificationUnreadStatuses = new Set(['queued', 'sent', 'failed']);
const notificationActionableStatuses = new Set(['queued', 'sent', 'failed']);

const notificationDisplayStateByStatus = {
  cancelled: 'cancelled_hidden',
  failed: 'failed_retry_pending',
  queued: 'pending_delivery',
  sent: 'delivered_unread',
  skipped: 'skipped_by_preference',
};

const getLocalNotificationDisplayState = ({ status, locallyRead = false }) => {
  if (status === 'sent') {
    return locallyRead ? 'delivered_local_read' : 'delivered_unread';
  }

  return notificationDisplayStateByStatus[status] ?? 'pending_delivery';
};

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const asArray = (value) => (Array.isArray(value) ? value : []);

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const formatRelativeTime = (value) => {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'recently';
  }

  const elapsedMs = Date.now() - timestamp;

  if (elapsedMs < 60 * 1000) {
    return 'just now';
  }

  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays}d ago`;
};

const formatCustomerNotificationMessage = (notification) => {
  const message =
    trimOrNull(notification?.message) ?? 'A customer notification was recorded.';

  return message.replace(
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\b/g,
    (value) => {
      const timestamp = new Date(value);
      if (!Number.isFinite(timestamp.getTime())) {
        return value;
      }

      return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(timestamp);
    },
  );
};

const pickNotificationTimestamp = (notification) =>
  notification.deliveredAt ?? notification.scheduledFor ?? notification.createdAt ?? null;

const normalizeNotificationVisual = (notification) => {
  if (notification?.category && categoryVisualMap[notification.category]) {
    return categoryVisualMap[notification.category];
  }

  if (notification?.sourceType === 'insurance_inquiry') {
    return categoryVisualMap.insurance_update;
  }

  if (notification?.sourceType === 'booking') {
    return categoryVisualMap.booking_reminder;
  }

  if (notification?.sourceType === 'back_job') {
    return categoryVisualMap.back_job_update;
  }

  return {
    action: 'timeline',
    bgColor: 'rgba(110, 117, 148, 0.16)',
    icon: 'bell-outline',
    tint: '#BFC6E6',
  };
};

const normalizeNotificationSyncMetadata = (notification) => {
  if (notification?.category && categorySyncMetadataMap[notification.category]) {
    return categorySyncMetadataMap[notification.category];
  }

  if (notification?.sourceType === 'insurance_inquiry') {
    return categorySyncMetadataMap.insurance_update;
  }

  if (notification?.sourceType === 'booking') {
    return categorySyncMetadataMap.booking_reminder;
  }

  if (notification?.sourceType === 'back_job') {
    return categorySyncMetadataMap.back_job_update;
  }

  return {
    consistencyModel: 'event_driven_read_model',
    ownerDomain: 'main-service.notifications',
    sourceDomain: 'main-service.notifications',
    crossServiceHint:
      'Customer notifications are an async read model and may refresh after the source workflow changes.',
  };
};

const normalizeNotificationChannel = (notification) => {
  if (notification?.channel) {
    return notification.channel;
  }

  if (notification?.category && categoryChannelMap[notification.category]) {
    return categoryChannelMap[notification.category];
  }

  if (notification?.sourceType && sourceTypeChannelMap[notification.sourceType]) {
    return sourceTypeChannelMap[notification.sourceType];
  }

  return 'email';
};

const isCustomerNotificationActionable = ({ category, sourceType, channel, status }) => {
  if (!notificationActionableStatuses.has(status)) {
    return false;
  }

  if (channel === 'in_app') {
    return true;
  }

  if (category === 'insurance_update' || sourceType === 'insurance_inquiry') {
    return true;
  }

  return false;
};

export const normalizeCustomerNotificationPreferences = (preferences) => {
  if (!preferences || typeof preferences !== 'object') {
    return null;
  }

  return {
    id: preferences.id ?? null,
    userId: preferences.userId ?? null,
    emailEnabled: Boolean(preferences.emailEnabled),
    bookingRemindersEnabled: Boolean(preferences.bookingRemindersEnabled),
    insuranceUpdatesEnabled: Boolean(preferences.insuranceUpdatesEnabled),
    invoiceRemindersEnabled: Boolean(preferences.invoiceRemindersEnabled),
    serviceFollowUpEnabled: Boolean(preferences.serviceFollowUpEnabled),
    createdAt: preferences.createdAt ?? null,
    updatedAt: preferences.updatedAt ?? null,
  };
};

export const normalizeCustomerNotification = (notification) => {
  if (!notification || typeof notification !== 'object') {
    return null;
  }

  const visual = normalizeNotificationVisual(notification);
  const syncMetadata = normalizeNotificationSyncMetadata(notification);
  const timestamp = pickNotificationTimestamp(notification);
  const status = notification.status ?? 'queued';
  const channel = normalizeNotificationChannel(notification);
  const requiresAction = isCustomerNotificationActionable({
    category: notification.category ?? null,
    sourceType: notification.sourceType ?? null,
    channel,
    status,
  });

  return {
    id: notification.id ?? notification.dedupeKey ?? null,
    key: notification.id ?? notification.dedupeKey ?? `notification-${notification.sourceId ?? 'unknown'}`,
    category: notification.category ?? null,
    channel,
    sourceType: notification.sourceType ?? null,
    sourceId: notification.sourceId ?? null,
    title: trimOrNull(notification.title) ?? 'Customer notification',
    message: formatCustomerNotificationMessage(notification),
    status,
    dedupeKey: trimOrNull(notification.dedupeKey),
    createdAt: notification.createdAt ?? null,
    updatedAt: notification.updatedAt ?? null,
    deliveredAt: notification.deliveredAt ?? null,
    scheduledFor: notification.scheduledFor ?? null,
    attempts: asArray(notification.attempts),
    brand: 'AUTOCARE',
    icon: visual.icon,
    tint: visual.tint,
    bgColor: visual.bgColor,
    action: visual.action,
    timeLabel: formatRelativeTime(timestamp),
    displayState: getLocalNotificationDisplayState({ status }),
    readStateSource: 'local-session-only',
    canPersistReadState: false,
    unread: notificationUnreadStatuses.has(status),
    requiresAction,
    consistencyModel: syncMetadata.consistencyModel,
    ownerDomain: syncMetadata.ownerDomain,
    sourceDomain: syncMetadata.sourceDomain,
    crossServiceHint: syncMetadata.crossServiceHint,
  };
};

export const markCustomerNotificationReadLocally = (notification) => {
  if (!notification || typeof notification !== 'object') {
    return notification;
  }

  const status = notification.status ?? 'queued';

  return {
    ...notification,
    displayState: getLocalNotificationDisplayState({
      status,
      locallyRead: status === 'sent',
    }),
    unread: false,
    readStateSource: 'local-session-only',
    canPersistReadState: false,
  };
};

export const markAllCustomerNotificationsReadLocally = (notifications) =>
  asArray(notifications).map(markCustomerNotificationReadLocally);

export const buildCustomerNotificationPanelSummary = (notifications) => {
  const normalizedNotifications = asArray(notifications).filter(Boolean);
  const unreadCount = normalizedNotifications.filter((notification) => notification.unread).length;
  const actionNeededCount = normalizedNotifications.filter((notification) => notification.requiresAction).length;
  const informationalCount = Math.max(normalizedNotifications.length - actionNeededCount, 0);

  const reminderLabel =
    actionNeededCount === 1
      ? '1 reminder still needs follow-up'
      : `${actionNeededCount} reminders still need follow-up`;
  const updateLabel =
    informationalCount === 1
      ? '1 update is for visibility only'
      : `${informationalCount} updates are for visibility only`;

  return {
    unreadCount,
    actionNeededCount,
    informationalCount,
    primaryTitle:
      actionNeededCount > 0
        ? reminderLabel
        : normalizedNotifications.length > 0
          ? 'No active follow-up reminders in view'
          : 'No reminders in view yet',
    secondaryTitle:
      normalizedNotifications.length > 0
        ? updateLabel
        : 'Fresh booking, insurance, and service updates will appear here after sync.',
  };
};

export const createEmptyCustomerNotificationSnapshot = () => ({
  preferences: null,
  notifications: [],
});

export const loadCustomerNotificationSnapshot = async ({ userId, accessToken }) => {
  if (!userId) {
    throw await createNotificationApiError(
      'You need an active customer session before notification state can load.',
      401,
      {
        path: '/api/users/:id/notifications',
      },
    );
  }

  const [preferencesResponse, notificationsResponse] = await Promise.all([
    requestNotificationApi(`/api/users/${userId}/notification-preferences`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
    requestNotificationApi(`/api/users/${userId}/notifications`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
  ]);

  return {
    preferences: normalizeCustomerNotificationPreferences(preferencesResponse),
    notifications: asArray(notificationsResponse)
      .map(normalizeCustomerNotification)
      .filter(Boolean),
  };
};

export const updateCustomerNotificationPreferences = async ({
  userId,
  accessToken,
  preferences,
}) => {
  if (!userId) {
    throw await createNotificationApiError(
      'You need an active customer session before notification preferences can update.',
      401,
      {
        path: '/api/users/:id/notification-preferences',
      },
    );
  }

  return normalizeCustomerNotificationPreferences(
    await requestNotificationApi(`/api/users/${userId}/notification-preferences`, {
      method: 'PATCH',
      headers: buildAuthHeaders(accessToken),
      body: preferences,
    }),
  );
};
