import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCssBoxShadow,
  toCssShadowColor,
} from './platformShadowModel.mjs'

test('platform shadow colors preserve RGB values and clamp opacity', () => {
  assert.equal(toCssShadowColor('#F07C00', 0.4), 'rgba(240, 124, 0, 0.4)')
  assert.equal(toCssShadowColor('#000', 2), 'rgba(0, 0, 0, 1)')
})

test('platform shadows produce stable web CSS and disable empty shadows', () => {
  assert.equal(
    buildCssBoxShadow({
      color: '#347FFF',
      width: 0,
      height: 8,
      opacity: 0.22,
      radius: 16,
    }),
    '0px 8px 16px rgba(52, 127, 255, 0.22)',
  )
  assert.equal(buildCssBoxShadow({ opacity: 0 }), 'none')
})
