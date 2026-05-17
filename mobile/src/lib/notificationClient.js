const NOTIFICATION_REQUEST_TIMEOUT_MS = 8000;

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
    sourceDomain: 'ecommerce.invoice-payments',
    crossServiceHint:
      'Invoice reminders are downstream from ecommerce invoice events, so visibility can change after invoice tracking updates.',
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

let authClientModulePromise = null;

const loadAuthClientModule = async () => {
  if (!authClientModulePromise) {
    authClientModulePromise = import('./authClient.js');
  }

  return authClientModulePromise;
};

const createApiError = async (message, status, details) => {
  const { ApiError } = await loadAuthClientModule();
  return new ApiError(message, status, details);
};

const getNotificationApiBaseUrl = async () => {
  const { getApiBaseUrl } = await loadAuthClientModule();
  return getApiBaseUrl();
};

const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = NOTIFICATION_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const { ApiError } = await loadAuthClientModule();
  const API_BASE_URL = await getNotificationApiBaseUrl();
  const buildApiError = (message, status, details) => new ApiError(message, status, details);
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      if (!response.ok) {
        const message =
          data?.message && typeof data.message === 'string'
            ? data.message
            : `Request failed with status ${response.status}`;

        throw buildApiError(message, response.status, data);
      }

      return data;
    };

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                buildApiError(
                  `Timed out reaching ${API_BASE_URL}${path} after ${timeoutMs}ms. Check EXPO_PUBLIC_API_BASE_URL for the current device.`,
                  0,
                  {
                    path,
                    apiBaseUrl: API_BASE_URL,
                    timeoutMs,
                    reason: 'timeout',
                  },
                ),
              );
            }, timeoutMs);
          })
        : null;

    return timeoutPromise
      ? await Promise.race([runRequest(), timeoutPromise])
      : await runRequest();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the API server.';

    throw await createApiError(
      `Unable to reach ${API_BASE_URL}${path}. Check EXPO_PUBLIC_API_BASE_URL for the current device. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: API_BASE_URL,
        timeoutMs,
        reason: 'network',
      },
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
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
    message: trimOrNull(notification.message) ?? 'A customer notification was recorded.',
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
    throw await createApiError(
      'You need an active customer session before notification state can load.',
      401,
      {
        path: '/api/users/:id/notifications',
      },
    );
  }

  const [preferencesResponse, notificationsResponse] = await Promise.all([
    request(`/api/users/${userId}/notification-preferences`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
    request(`/api/users/${userId}/notifications`, {
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
    throw await createApiError(
      'You need an active customer session before notification preferences can update.',
      401,
      {
        path: '/api/users/:id/notification-preferences',
      },
    );
  }

  return normalizeCustomerNotificationPreferences(
    await request(`/api/users/${userId}/notification-preferences`, {
      method: 'PATCH',
      headers: buildAuthHeaders(accessToken),
      body: preferences,
    }),
  );
};
