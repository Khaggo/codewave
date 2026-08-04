import test from 'node:test'
import assert from 'node:assert/strict'

import {
  STAFF_PORTAL_NAVIGATION_ORDER,
  orderStaffPortalNavigationEntries,
} from '../../../../components/layout/staffPortalNavigationModel.mjs'

test('staff portal navigation rules follow the real service flow order', () => {
  const shuffledEntries = [...STAFF_PORTAL_NAVIGATION_ORDER]
    .reverse()
    .map((key) => ({ key }))

  assert.deepEqual(
    orderStaffPortalNavigationEntries(shuffledEntries).map((entry) => entry.key),
    STAFF_PORTAL_NAVIGATION_ORDER,
  )
})

test('unknown navigation entries stay stable after the known workflow', () => {
  const entries = [
    { key: 'future-one' },
    { key: 'settings' },
    { key: 'dashboard' },
    { key: 'future-two' },
  ]

  assert.deepEqual(
    orderStaffPortalNavigationEntries(entries).map((entry) => entry.key),
    ['dashboard', 'settings', 'future-one', 'future-two'],
  )
  assert.deepEqual(entries.map((entry) => entry.key), [
    'future-one',
    'settings',
    'dashboard',
    'future-two',
  ])
})
