import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCustomerNotificationPanelSummary,
  markAllCustomerNotificationsReadLocally,
  markCustomerNotificationReadLocally,
  normalizeCustomerNotification,
} from './notificationClient.js';

test('normalizeCustomerNotification keeps in-app insurance reminders visible and unread by default', () => {
  const normalized = normalizeCustomerNotification({
    id: 'notification-1',
    category: 'insurance_update',
    sourceType: 'insurance_inquiry',
    sourceId: 'inq-1',
    title: 'Missing documents',
    message: 'Please upload the required insurance documents so we can continue your request.',
    status: 'sent',
    dedupeKey: 'notification:insurance.reminder:inq-1:needs_documents:2026-05-15T09:00:00.000Z',
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-05-15T09:00:00.000Z',
    attempts: [],
  });

  assert.equal(normalized.channel, 'in_app');
  assert.equal(normalized.action, 'insurance');
  assert.equal(normalized.icon, 'shield-outline');
  assert.equal(normalized.displayState, 'delivered_unread');
  assert.equal(normalized.readStateSource, 'local-session-only');
  assert.equal(normalized.canPersistReadState, false);
  assert.equal(normalized.unread, true);
  assert.equal(normalized.requiresAction, true);
});

test('markCustomerNotificationReadLocally sets sent notifications to delivered_local_read', () => {
  const notification = normalizeCustomerNotification({
    id: 'notification-1',
    category: 'insurance_update',
    sourceType: 'insurance_inquiry',
    sourceId: 'inq-1',
    title: 'Missing documents',
    message: 'Please upload the required insurance documents so we can continue your request.',
    status: 'sent',
  });

  const locallyRead = markCustomerNotificationReadLocally(notification);

  assert.equal(locallyRead.status, 'sent');
  assert.equal(locallyRead.displayState, 'delivered_local_read');
  assert.equal(locallyRead.unread, false);
  assert.equal(locallyRead.requiresAction, true);
  assert.equal(locallyRead.readStateSource, 'local-session-only');
  assert.equal(locallyRead.canPersistReadState, false);
});

test('markCustomerNotificationReadLocally clears unread for queued notifications without changing delivery state', () => {
  const notification = normalizeCustomerNotification({
    id: 'notification-queued',
    category: 'insurance_update',
    sourceType: 'insurance_inquiry',
    sourceId: 'inq-queued',
    title: 'Queued reminder',
    message: 'This reminder has not been delivered yet.',
    status: 'queued',
  });

  const locallyRead = markCustomerNotificationReadLocally(notification);

  assert.equal(locallyRead.status, 'queued');
  assert.equal(locallyRead.displayState, 'pending_delivery');
  assert.equal(locallyRead.unread, false);
});

test('markAllCustomerNotificationsReadLocally clears unread for queued and failed items while sent items become delivered_local_read', () => {
  const notifications = [
    normalizeCustomerNotification({
      id: 'notification-1',
      category: 'insurance_update',
      sourceType: 'insurance_inquiry',
      sourceId: 'inq-1',
      title: 'Missing documents',
      message: 'Please upload the required insurance documents so we can continue your request.',
      status: 'sent',
    }),
    normalizeCustomerNotification({
      id: 'notification-2',
      category: 'insurance_update',
      sourceType: 'insurance_inquiry',
      sourceId: 'inq-2',
      title: 'Queued reminder',
      message: 'This reminder has not been delivered yet.',
      status: 'queued',
    }),
    normalizeCustomerNotification({
      id: 'notification-3',
      category: 'insurance_update',
      sourceType: 'insurance_inquiry',
      sourceId: 'inq-3',
      title: 'Failed reminder',
      message: 'Delivery needs a retry.',
      status: 'failed',
    }),
  ];

  const marked = markAllCustomerNotificationsReadLocally(notifications);

  assert.equal(marked[0].displayState, 'delivered_local_read');
  assert.equal(marked[0].unread, false);
  assert.equal(marked[1].displayState, 'pending_delivery');
  assert.equal(marked[1].unread, false);
  assert.equal(marked[2].displayState, 'failed_retry_pending');
  assert.equal(marked[2].unread, false);
});

test('buildCustomerNotificationPanelSummary separates action-needed reminders from informational updates', () => {
  const notifications = [
    normalizeCustomerNotification({
      id: 'notification-1',
      category: 'insurance_update',
      sourceType: 'insurance_inquiry',
      sourceId: 'inq-1',
      title: 'Missing documents',
      message: 'Please upload the missing insurance documents.',
      status: 'sent',
      unread: true,
    }),
    normalizeCustomerNotification({
      id: 'notification-2',
      category: 'booking_reminder',
      sourceType: 'booking',
      sourceId: 'booking-1',
      title: 'Booking reminder',
      message: 'Your booking is tomorrow.',
      status: 'sent',
    }),
    markCustomerNotificationReadLocally(normalizeCustomerNotification({
      id: 'notification-3',
      category: 'insurance_update',
      sourceType: 'insurance_inquiry',
      sourceId: 'inq-3',
      title: 'Renewal completed',
      message: 'Your renewal is already completed.',
      status: 'sent',
    })),
  ];

  assert.deepEqual(buildCustomerNotificationPanelSummary(notifications), {
    unreadCount: 2,
    actionNeededCount: 2,
    informationalCount: 1,
    primaryTitle: '2 reminders still need follow-up',
    secondaryTitle: '1 update is for visibility only',
  });
});
