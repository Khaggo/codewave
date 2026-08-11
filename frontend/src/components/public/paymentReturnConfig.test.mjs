import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  getPaymentReturnConfig,
  PAYMENT_RETURN_CONFIGS,
} from './paymentReturnConfig.mjs'

const CURRENT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))

test('all four payment return routes use customer-safe destinations or instructions', () => {
  assert.deepEqual(Object.keys(PAYMENT_RETURN_CONFIGS), [
    '/payments/success',
    '/payments/cancel',
    '/accessories/payment/success',
    '/accessories/payment/cancel',
  ])

  assert.equal(
    PAYMENT_RETURN_CONFIGS['/payments/success'].appHref,
    'autocarecc://checkout/booking/success',
  )
  assert.equal(
    PAYMENT_RETURN_CONFIGS['/payments/cancel'].appHref,
    'autocarecc://checkout/booking/cancel',
  )

  for (const pathname of [
    '/accessories/payment/success',
    '/accessories/payment/cancel',
  ]) {
    const config = PAYMENT_RETURN_CONFIGS[pathname]
    assert.equal(config.appHref, null)
    assert.equal(config.appLabel, null)
    assert.match(config.returnInstruction, /Close this browser/i)
    assert.match(config.returnInstruction, /My accessory orders/i)
  }
})

test('route lookup stays outcome-specific and never falls back to staff web', () => {
  for (const [pathname, config] of Object.entries(PAYMENT_RETURN_CONFIGS)) {
    assert.equal(getPaymentReturnConfig(config.flow, config.outcome), config, pathname)
    assert.doesNotMatch(JSON.stringify(config), /(?:href|route)\s*[:=]\s*["']?\//i)
    assert.doesNotMatch(JSON.stringify(config), /login|admin/i)
  }

  assert.equal(getPaymentReturnConfig('booking', 'unknown'), null)
})

test('the deep-link action is a native first control with a dedicated focus-visible state', () => {
  const componentSource = fs.readFileSync(
    path.join(CURRENT_DIRECTORY, 'PaymentReturnPage.js'),
    'utf8',
  )
  const componentStyles = fs.readFileSync(
    path.join(CURRENT_DIRECTORY, 'PaymentReturnPage.module.css'),
    'utf8',
  )

  assert.match(
    componentSource,
    /<a[\s\S]*?data-primary-return-action[\s\S]*?href=\{paymentFlow\.appHref\}/,
  )
  assert.doesNotMatch(componentSource, /<button[\s>]/)
  assert.doesNotMatch(componentSource, /autoFocus|tabIndex/)
  assert.doesNotMatch(componentSource, /href=["']\/["']/)
  assert.match(
    componentStyles,
    /\.primaryAction:focus-visible\s*\{[^}]*outline:\s*3px\s+solid[^}]*outline-offset:\s*3px/s,
  )
})
