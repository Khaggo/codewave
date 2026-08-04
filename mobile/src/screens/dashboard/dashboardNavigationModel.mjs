export const BOTTOM_NAV_HEIGHT = 82;
export const DASHBOARD_WEB_SCROLL_HEIGHT = `calc(100vh - ${BOTTOM_NAV_HEIGHT}px)`;

const MOBILE_DEEP_LINK_SCHEME = 'autocarecc';

export const tabs = Object.freeze([
  Object.freeze({ key: 'explore', label: 'Home', icon: 'home-outline' }),
  Object.freeze({ key: 'messages', label: 'Garage', icon: 'garage-variant' }),
  Object.freeze({
    key: 'notifications',
    label: 'Book',
    icon: 'calendar-check-outline',
  }),
  Object.freeze({
    key: 'insurance',
    label: 'Insurance',
    icon: 'shield-outline',
  }),
  Object.freeze({ key: 'more', label: 'More', icon: 'dots-grid' }),
]);

const DASHBOARD_CONTENT_BY_TAB = Object.freeze({
  explore: 'home',
  messages: 'garage',
  notifications: 'booking',
  insurance: 'insurance',
  rewards: 'rewards',
});

export function getDashboardContentKey(activeTab) {
  return DASHBOARD_CONTENT_BY_TAB[activeTab] ?? 'menu';
}

export const genderOptions = Object.freeze([
  'Male',
  'Female',
  'Prefer not to say',
]);

export const notificationPreferenceOptions = Object.freeze([
  Object.freeze({
    key: 'emailEnabled',
    label: 'Email Delivery',
    description:
      'Turn customer email notifications on or off for booking, invoice, back-job, and follow-up updates.',
  }),
  Object.freeze({
    key: 'bookingRemindersEnabled',
    label: 'Booking Reminders',
    description:
      'Receive reminders when appointments are approaching or change schedule.',
  }),
  Object.freeze({
    key: 'insuranceUpdatesEnabled',
    label: 'Insurance Updates',
    description:
      'Get in-app insurance reminders when documents, payment, or renewal follow-up need your action.',
  }),
  Object.freeze({
    key: 'invoiceRemindersEnabled',
    label: 'Invoice Reminders',
    description:
      'Keep invoice-aging and payment follow-up notices enabled for your account.',
  }),
  Object.freeze({
    key: 'serviceFollowUpEnabled',
    label: 'Service Follow-ups',
    description:
      'Receive service follow-up reminders tied to back-jobs and post-service outreach.',
  }),
]);

export function normalizeNavigationId(value) {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  return normalizedValue.length ? normalizedValue : null;
}

export function buildMobileDeepLinkUrl(path, queryParams = null) {
  const normalizedPath = String(path ?? '').trim().replace(/^\/+/, '');
  const searchParams = new URLSearchParams();

  Object.entries(queryParams ?? {}).forEach(([key, value]) => {
    const normalizedValue = String(value ?? '').trim();
    if (normalizedValue) searchParams.set(key, normalizedValue);
  });

  const queryString = searchParams.toString();
  return `${MOBILE_DEEP_LINK_SCHEME}://${normalizedPath}${
    queryString ? `?${queryString}` : ''
  }`;
}
