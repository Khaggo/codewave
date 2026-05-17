import test from 'node:test'
import assert from 'node:assert/strict'

import {
  THEME_OPTIONS,
  getThemeTriggerLabel,
  normalizeThemeValue,
} from './themeSwitcherView.mjs'

test('normalizeThemeValue falls back to dark for unsupported values', () => {
  assert.equal(normalizeThemeValue('unknown-theme'), 'dark')
  assert.equal(normalizeThemeValue(''), 'dark')
  assert.equal(normalizeThemeValue(null), 'dark')
})

test('normalizeThemeValue keeps supported theme values', () => {
  assert.equal(normalizeThemeValue('professional-blue'), 'professional-blue')
  assert.equal(normalizeThemeValue('premium-black'), 'premium-black')
})

test('getThemeTriggerLabel returns the active theme label', () => {
  assert.equal(getThemeTriggerLabel('dark'), 'Dark')
  assert.equal(getThemeTriggerLabel('minimal-gray'), 'Minimal Gray')
})

test('theme options expose the expected order for the dropdown menu', () => {
  assert.deepEqual(
    THEME_OPTIONS.map((option) => option.value),
    ['dark', 'light', 'professional-blue', 'automotive-red', 'minimal-gray', 'premium-black'],
  )
})
