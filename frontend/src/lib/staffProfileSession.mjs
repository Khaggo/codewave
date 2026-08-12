const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key)

export function normalizeStaffPhoneNumber(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11)
}

export function normalizeStaffProfile(profile) {
  if (Array.isArray(profile)) {
    return profile[0] ?? null
  }
  return profile ?? null
}

export function mapAuthoritativeStaffProfile(userResponse = {}, fallbackUser = {}) {
  const hasAuthoritativeProfile = hasOwn(userResponse, 'profile')
  const profile = normalizeStaffProfile(
    hasAuthoritativeProfile ? userResponse.profile : fallbackUser.profile,
  )
  const phoneSource = profile?.phone
    ?? (hasOwn(userResponse, 'phone') ? userResponse.phone : null)
    ?? (!hasAuthoritativeProfile ? fallbackUser.phone : null)
  const phone = normalizeStaffPhoneNumber(phoneSource)

  return {
    profile,
    phone: phone || null,
  }
}

export function getStaffPhoneNumber(user) {
  return mapAuthoritativeStaffProfile(user).phone ?? ''
}

export function requireAuthoritativeStaffPhone(userResponse, requestedPhone) {
  const expectedPhone = normalizeStaffPhoneNumber(requestedPhone)
  const persistedPhone = getStaffPhoneNumber(userResponse)

  if (!expectedPhone || persistedPhone !== expectedPhone) {
    throw new Error('The server did not confirm the requested phone number. Refresh the profile and try again.')
  }

  return persistedPhone
}
