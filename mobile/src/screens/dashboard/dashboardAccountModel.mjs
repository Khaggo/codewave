import {
  normalizeEmail,
  normalizePhoneNumber,
  validateBirthday,
  validatePhoneNumber,
} from '../../utils/validation.js'

export const createDashboardProfileForm = (account) => ({
  fullName: `${account?.firstName || ''} ${account?.lastName || ''}`.trim(),
  email: account?.email || '',
  phoneNumber: normalizePhoneNumber(account?.phoneNumber || ''),
  birthday: account?.birthday || null,
  city: account?.city || '',
  gender: account?.gender || '',
})

const splitFullName = (fullName) => {
  const nameParts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean)

  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' '),
  }
}

export const buildDashboardProfileSavePlan = ({ account, profileForm }) => {
  const form = profileForm ?? {}
  const errors = {}
  const phoneError = validatePhoneNumber(form.phoneNumber)
  const birthdayError = validateBirthday(form.birthday)

  if (!String(form.fullName ?? '').trim()) {
    errors.fullName = 'Enter your full name.'
  }
  if (phoneError) {
    errors.phoneNumber = phoneError
  }
  if (birthdayError) {
    errors.birthday = birthdayError
  }

  const unsupportedChanges = []
  const normalizedCurrentEmail = normalizeEmail(account?.email)
  const normalizedRequestedEmail = normalizeEmail(form.email)
  const normalizedCurrentCity = String(account?.city ?? '').trim()
  const normalizedRequestedCity = String(form.city ?? '').trim()
  const normalizedCurrentGender = String(account?.gender ?? '').trim()
  const normalizedRequestedGender = String(form.gender ?? '').trim()

  if (
    normalizedRequestedEmail &&
    normalizedRequestedEmail !== normalizedCurrentEmail
  ) {
    unsupportedChanges.push('email')
  }
  if (normalizedRequestedCity !== normalizedCurrentCity) {
    unsupportedChanges.push('city')
  }
  if (normalizedRequestedGender !== normalizedCurrentGender) {
    unsupportedChanges.push('gender')
  }

  return {
    errors,
    unsupportedChanges,
    payload: {
      ...splitFullName(form.fullName),
      phoneNumber: normalizePhoneNumber(form.phoneNumber),
      birthday: form.birthday,
    },
  }
}
