import test from 'node:test'
import assert from 'node:assert/strict'

import { getSettingsTab, settingsTabs } from './settingsView.mjs'

test('settingsTabs preserves the available settings sections', () => {
  assert.deepEqual(
    settingsTabs.map((tab) => tab.key),
    ['profile', 'security'],
  )
})

test('getSettingsTab returns the requested tab and falls back to profile', () => {
  assert.equal(getSettingsTab('security').key, 'security')
  assert.equal(getSettingsTab('missing').key, 'profile')
})
