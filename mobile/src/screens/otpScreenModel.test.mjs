import assert from 'node:assert/strict'
import test from 'node:test'

import {
  executeOtpVerification,
  getOtpScreenCopy,
  OTP_RESEND_SECONDS,
} from './otpScreenModel.mjs'

test('OTP screen copy stays purpose-specific with a login fallback', () => {
  assert.equal(getOtpScreenCopy('register').buttonLabel, 'Verify & Create Account')
  assert.equal(getOtpScreenCopy('passwordChange').buttonLabel, 'Verify & Change Password')
  assert.equal(getOtpScreenCopy('deleteAccount').buttonLabel, 'Verify & Delete Account')
  assert.equal(getOtpScreenCopy('unknown').buttonLabel, 'Verify & Sign In')
  assert.equal(OTP_RESEND_SECONDS, 17)
})

test('registration OTP execution sends only the enrollment payload', async () => {
  const calls = []
  const execution = await executeOtpVerification({
    otp: '123456',
    otpPurpose: 'register',
    routeParams: {
      enrollmentId: 'enroll-1',
      accountDraft: { email: 'customer@example.com' },
      ignored: 'internal-route-state',
    },
    verifyRegistrationOtp: async (payload) => {
      calls.push(payload)
      return { status: 'success', nextRoute: 'Menu' }
    },
  })

  assert.equal(execution.ok, true)
  assert.deepEqual(calls, [
    {
      enrollmentId: 'enroll-1',
      otp: '123456',
      accountDraft: { email: 'customer@example.com' },
    },
  ])
})

test('non-registration OTP execution preserves the current route payload', async () => {
  const execution = await executeOtpVerification({
    otp: '654321',
    otpPurpose: 'passwordChange',
    routeParams: { resetToken: 'reset-1' },
    verifyOtp: async (payload) => ({ status: 'success', payload }),
  })

  assert.equal(execution.ok, true)
  assert.deepEqual(execution.result.payload, {
    resetToken: 'reset-1',
    otp: '654321',
  })
})

test('verification callback failures become recoverable result messages', async () => {
  const execution = await executeOtpVerification({
    otp: '111111',
    otpPurpose: 'login',
    verifyOtp: async () => {
      throw new Error('The verification code has expired.')
    },
  })

  assert.deepEqual(execution, {
    ok: false,
    message: 'The verification code has expired.',
  })
})

test('unknown thrown values use purpose-safe verification copy', async () => {
  const execution = await executeOtpVerification({
    otp: '111111',
    otpPurpose: 'deleteAccount',
    verifyOtp: async () => {
      throw null
    },
  })

  assert.deepEqual(execution, {
    ok: false,
    message: 'Unable to complete OTP verification right now.',
  })
})
