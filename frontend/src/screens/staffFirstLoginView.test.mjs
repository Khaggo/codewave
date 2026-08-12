import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import { buildRequiredPasswordChangeErrors } from './staffFirstLoginView.mjs'

test('requires a strong-enough matching replacement password', () => {
  assert.deepEqual(
    buildRequiredPasswordChangeErrors({ newPassword: 'short', confirmPassword: 'different' }),
    {
      newPassword: 'Use at least 8 characters.',
      confirmPassword: 'Passwords do not match.',
    },
  )
  assert.deepEqual(
    buildRequiredPasswordChangeErrors({ newPassword: 'new-password-123', confirmPassword: 'new-password-123' }),
    {},
  )
})

test('login gates portal hydration behind the focused required-password-change form', () => {
  const source = readFileSync(new URL('./Login.js', import.meta.url), 'utf8')
  const restrictedBranch = source.indexOf('if (session.requiresPasswordChange)')
  const hydration = source.indexOf('const result = await onAuthenticated(session)')

  assert.ok(restrictedBranch >= 0 && hydration > restrictedBranch)
  assert.match(source, /Change temporary password/)
  assert.match(source, /Staff tools remain unavailable until this succeeds/)
  assert.match(source, /aria-label="Change temporary password"/)
  assert.match(source, /Changing password\.\.\.|Password changed\. Opening your workspace/)
})
