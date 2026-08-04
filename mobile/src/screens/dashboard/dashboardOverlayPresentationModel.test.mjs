import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getNotificationPanelView,
} from './dashboardOverlayPresentationModel.mjs'

test('notification panel normalizes missing feeds and counts unread items', () => {
  assert.deepEqual(getNotificationPanelView(), {
    items: [],
    unreadCount: 0,
    isEmpty: true,
  })
  assert.deepEqual(
    getNotificationPanelView([{ key: 'a', unread: true }, { key: 'b', unread: false }]),
    {
      items: [{ key: 'a', unread: true }, { key: 'b', unread: false }],
      unreadCount: 1,
      isEmpty: false,
    },
  )
})
