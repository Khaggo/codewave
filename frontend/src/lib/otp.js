export const MOCK_OTP = '123456'
export const RESEND_SECONDS = 60

const OTP_CONTENT = {
  login: {
    title: 'Confirm sign-in',
    subtitle: 'Enter the 6-digit sign-in code sent to',
    verifyLabel: 'Verify sign-in code',
    resendLabel: 'Resend sign-in code',
    invalidMessage: 'That sign-in code is not correct. Try again.',
  },
  registration: {
    title: 'Verify your email',
    subtitle: 'We sent a 6-digit registration code to',
    verifyLabel: 'Verify email',
    resendLabel: 'Resend verification email',
    invalidMessage: 'That verification code is not correct. Try again.',
  },
  'password-change': {
    title: 'Confirm password change',
    subtitle: 'Enter the security code sent to',
    verifyLabel: 'Confirm password change',
    resendLabel: 'Resend password-change code',
    invalidMessage: 'That password-change code is not correct. Try again.',
  },
}

export function getOtpContent(purpose) {
  return OTP_CONTENT[purpose] || OTP_CONTENT.login
}

export function maskEmail(email) {
  if (!email) return '***'

  const trimmed = String(email).trim()
  const [local = '', domain] = trimmed.split('@')

  if (!local || !domain) return '***'

  const maskedLocal =
    local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}***${local.slice(-1)}`

  return `${maskedLocal}@${domain}`
}
