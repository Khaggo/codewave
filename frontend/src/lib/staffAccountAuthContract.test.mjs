import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

import {
  credentialRetryTarget,
  normalizeStaffLoginResponse,
  stripCredentialSecrets,
} from './staffAccountAuthContract.mjs'

test('maps restricted login without creating a portal session', () => {
  const result = normalizeStaffLoginResponse(
    {
      requiresPasswordChange: true,
      passwordChangeToken: 'restricted-token',
      destination: '/api/auth/password/change-required',
      expiresInSeconds: 600,
    },
    () => assert.fail('normal session mapper must not run'),
  )

  assert.equal(result.requiresPasswordChange, true)
  assert.equal(result.passwordChangeToken, 'restricted-token')
  assert.equal('accessToken' in result, false)
})

test('removes credential material from managed-account payloads', () => {
  const result = stripCredentialSecrets({
    email: 'staff@example.com',
    password: 'client-secret',
    passwordHash: 'stored-hash',
    temporaryPassword: 'temporary-secret',
  })

  assert.deepEqual(result, { email: 'staff@example.com' })
})

test('extracts retry email only for truthful credential-delivery failures', () => {
  assert.equal(
    credentialRetryTarget({
      status: 503,
      details: {
        code: 'STAFF_CREDENTIAL_DELIVERY_FAILED',
        delivery: { targetEmail: 'staff@example.com' },
      },
    }),
    'staff@example.com',
  )
  assert.equal(credentialRetryTarget({ status: 500, details: {} }), '')
})

test('auth client uses the restricted change and retry endpoints without credential receipts', () => {
  const source = readFileSync(new URL('./authClient.js', import.meta.url), 'utf8')
  assert.match(source, /\/api\/auth\/password\/change-required/)
  assert.match(source, /\/api\/admin\/staff-accounts\/credentials\/retry/)
  assert.doesNotMatch(source, /temporaryPassword\s*:/)
})
