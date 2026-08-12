import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LANDING_CTA_MIN_HEIGHT,
  buildLandingBottomLayout,
} from './landingLayout.mjs'

test('native landing dock reserves scroll clearance and the bottom safe area', () => {
  assert.deepEqual(buildLandingBottomLayout({ bottomInset: 34 }), {
    contentPaddingBottom: 24,
    dockPaddingBottom: 46,
  })
  assert.deepEqual(buildLandingBottomLayout({ bottomInset: 0 }), {
    contentPaddingBottom: 24,
    dockPaddingBottom: 12,
  })
})

test('landing CTA keeps the minimum accessible touch height and sanitizes insets', () => {
  assert.equal(LANDING_CTA_MIN_HEIGHT, 44)
  assert.equal(buildLandingBottomLayout({ bottomInset: -20 }).dockPaddingBottom, 12)
  assert.equal(buildLandingBottomLayout({ bottomInset: Number.NaN }).dockPaddingBottom, 12)
})
