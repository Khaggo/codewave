const PROFILE_MENU_SCREENS = new Set([
  'root',
  'settings',
  'personal',
  'security',
  'gift',
  'notificationPreferences',
  'saved',
])

const normalizeText = (value) => String(value ?? '').trim()

export function normalizeProfileMenuScreen(value) {
  const normalized = normalizeText(value)
  return PROFILE_MENU_SCREENS.has(normalized) ? normalized : 'root'
}

export function formatCustomerProfilePhone(value) {
  const digits = normalizeText(value).replace(/\D/g, '')
  const localDigits =
    /^09\d{9}$/.test(digits)
      ? digits.slice(1)
      : /^639\d{9}$/.test(digits)
        ? digits.slice(2)
        : ''

  if (!localDigits) {
    return 'Phone not provided'
  }

  return `+63 ${localDigits.slice(0, 3)}-${localDigits.slice(3, 6)}-${localDigits.slice(6)}`
}

export function buildCustomerProfileSummary(account = null) {
  const firstName = normalizeText(account?.firstName)
  const lastName = normalizeText(account?.lastName)
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Customer'
  const emailValue = normalizeText(account?.email)
  const email = emailValue || 'Email not provided'
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() ||
    emailValue.charAt(0).toUpperCase() ||
    'C'

  return {
    fullName,
    email,
    phone: formatCustomerProfilePhone(account?.phoneNumber),
    initials,
  }
}

export function getLoyaltyProgressWidth(progressRatio) {
  const numericRatio = Number(progressRatio)
  const clampedRatio = Number.isFinite(numericRatio)
    ? Math.min(Math.max(numericRatio, 0), 1)
    : 0

  if (clampedRatio === 0) {
    return '0%'
  }

  return `${Math.max(clampedRatio, 0.08) * 100}%`
}

export function getProfileMenuLoyaltyState({
  status = 'idle',
  rewards = [],
  errorMessage = '',
} = {}) {
  const hasRewards = Array.isArray(rewards) && rewards.length > 0
  const normalizedError = normalizeText(errorMessage)

  if (status === 'loading' && !hasRewards) {
    return 'loading'
  }

  if (normalizedError) {
    return 'error'
  }

  return hasRewards ? 'ready' : 'empty'
}
