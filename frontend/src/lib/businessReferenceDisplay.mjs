export const REFERENCE_UNAVAILABLE = 'Reference unavailable'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HASH_FRAGMENT_PATTERN = /^(?:[a-z]+-)?[0-9a-f]{8,}$/i

export function safeBusinessReference(value, fallback = REFERENCE_UNAVAILABLE) {
  const normalizedValue = String(value ?? '').trim()
  if (!normalizedValue || UUID_PATTERN.test(normalizedValue) || HASH_FRAGMENT_PATTERN.test(normalizedValue)) {
    return fallback
  }

  return normalizedValue
}

export function getRecordBusinessReference(record, keys = [], fallback = REFERENCE_UNAVAILABLE) {
  for (const key of keys) {
    const reference = safeBusinessReference(record?.[key], '')
    if (reference) return reference
  }

  return fallback
}

export const getVehicleReference = (vehicle) =>
  getRecordBusinessReference(vehicle, ['publicReference'])

export const getJobOrderReference = (jobOrder) =>
  getRecordBusinessReference(jobOrder, ['jobOrderReference', 'reference'])

export const getInsuranceInquiryReference = (inquiry) =>
  getRecordBusinessReference(inquiry, ['inquiryReference', 'reference'])

export const getBackJobReference = (backJob) =>
  getRecordBusinessReference(backJob, ['backJobReference', 'reference'])

export const getBookingReference = (booking) =>
  getRecordBusinessReference(booking, ['bookingReference', 'reference'])

export function getStaffDisplayLabel(account) {
  return String(account?.displayName ?? account?.fullName ?? account?.email ?? account?.staffCode ?? '').trim() || 'Staff member'
}
