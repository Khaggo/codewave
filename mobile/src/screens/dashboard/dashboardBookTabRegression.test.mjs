import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { getDashboardContentKey, tabs } from './dashboardNavigationModel.mjs'

const tabContentSource = readFileSync(
  new URL('./DashboardTabContent.js', import.meta.url),
  'utf8',
)
const bookingWorkspaceSource = readFileSync(
  new URL('./DashboardBookingWorkspacePanel.js', import.meta.url),
  'utf8',
)

test('authenticated Book tab resolves to a non-blank booking workspace', () => {
  const authenticatedAccount = {
    userId: 'qa-customer-id',
    accessToken: 'local-test-token',
  }
  const bookTab = tabs.find((tab) => tab.label === 'Book')
  const bookingBranch = tabContentSource.slice(
    tabContentSource.indexOf("if (contentKey === 'booking')"),
    tabContentSource.indexOf("if (contentKey === 'rewards')"),
  )

  assert.ok(authenticatedAccount.userId && authenticatedAccount.accessToken)
  assert.equal(bookTab?.key, 'notifications')
  assert.equal(getDashboardContentKey(bookTab.key), 'booking')
  assert.match(bookingBranch, /return\s*\([\s\S]*<DashboardBookingWorkspacePanel/)
  assert.doesNotMatch(bookingBranch, /return\s+null|throw\s+/)
  assert.match(bookingWorkspaceSource, /label="New Booking"/)
  assert.match(bookingWorkspaceSource, /label="My Bookings"/)
})
