import test from 'node:test'
import assert from 'node:assert/strict'

import { requireConfiguredQaPassword } from './qaCredentialConfig.mjs'

test('QA password resolution prefers the first configured candidate', () => {
  assert.equal(
    requireConfiguredQaPassword('staff', ['', 'role-secret', 'shared-secret']),
    'role-secret',
  )
})

test('QA password resolution fails before a blank credential reaches a login form', () => {
  assert.throws(
    () => requireConfiguredQaPassword('customer', [undefined, '']),
    /Missing customer QA password/,
  )
})
