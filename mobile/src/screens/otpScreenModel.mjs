export const OTP_RESEND_SECONDS = 17

const SCREEN_COPY = Object.freeze({
  passwordChange: Object.freeze({
    title: 'Verify Your Email',
    icon: 'shield-check-outline',
    codeLabel: 'Enter 6-digit code',
    buttonLabel: 'Verify & Change Password',
    buttonIcon: 'shield-check-outline',
    successToast: 'Password updated successfully.',
    successTitle: 'Password Updated',
    successMessage: 'Your new password has been verified and saved.',
  }),
  register: Object.freeze({
    title: 'Verify Your Email',
    icon: 'email-outline',
    codeLabel: 'Enter 6-digit code',
    buttonLabel: 'Verify & Create Account',
    buttonIcon: 'account-check-outline',
    successToast: 'Registration verified successfully.',
    successTitle: 'Registration Verified',
    successMessage: 'Your verification code was accepted.',
  }),
  deleteAccount: Object.freeze({
    title: 'Confirm Account Deletion',
    icon: 'shield-alert-outline',
    codeLabel: 'Enter 6-digit code',
    buttonLabel: 'Verify & Delete Account',
    buttonIcon: 'delete-outline',
    successToast: 'Account deletion verified.',
    successTitle: 'Account Deleted',
    successMessage:
      'Your account has been archived and the same email can be used again later.',
  }),
  login: Object.freeze({
    title: 'Verify Your Email',
    icon: 'email-outline',
    codeLabel: 'Enter 6-digit code',
    buttonLabel: 'Verify & Sign In',
    buttonIcon: 'login',
    successToast: 'Login verified successfully.',
    successTitle: 'Login Successful',
    successMessage: 'OTP verified. Welcome back to your AutoCare account.',
  }),
})

export const getOtpScreenCopy = (otpPurpose) =>
  SCREEN_COPY[otpPurpose] ?? SCREEN_COPY.login

const getVerificationFailureMessage = (error, otpPurpose) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }

  return otpPurpose === 'register'
    ? 'Unable to verify your registration code right now.'
    : 'Unable to complete OTP verification right now.'
}

export async function executeOtpVerification({
  otp,
  otpPurpose,
  routeParams = {},
  verifyOtp,
  verifyRegistrationOtp,
} = {}) {
  try {
    if (otpPurpose === 'register') {
      if (typeof verifyRegistrationOtp !== 'function') {
        throw new Error('Registration verification is unavailable. Go back and request a new code.')
      }

      const result = await verifyRegistrationOtp({
        enrollmentId: routeParams?.enrollmentId,
        otp,
        accountDraft: routeParams?.accountDraft,
      })
      return { ok: true, result }
    }

    const result =
      (await verifyOtp?.({
        ...routeParams,
        otp,
      })) ?? { status: 'success' }
    return { ok: true, result }
  } catch (error) {
    return {
      ok: false,
      message: getVerificationFailureMessage(error, otpPurpose),
    }
  }
}
