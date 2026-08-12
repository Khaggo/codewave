export const REFERENCE_UNAVAILABLE = 'Reference unavailable'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HASH_PATTERN = /^(?:0x)?[0-9a-f]{24,}$/i
const JWT_PATTERN = /^[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}$/
const TECHNICAL_PREFIX_PATTERN = /^(?:\$2[aby]\$|sha\d*:|hash:|token:|dedupe(?:key)?:|idempotency(?:key)?:|storage(?:key)?:)/i

export function isTechnicalPresentationValue(value) {
  const normalized = String(value ?? '').trim()
  return Boolean(
    normalized
      && (UUID_PATTERN.test(normalized)
        || HASH_PATTERN.test(normalized)
        || JWT_PATTERN.test(normalized)
        || TECHNICAL_PREFIX_PATTERN.test(normalized)),
  )
}

export function getSafePresentationText(...candidates) {
  for (const candidate of candidates) {
    const normalized = String(candidate ?? '').trim()
    if (normalized && !isTechnicalPresentationValue(normalized)) {
      return normalized
    }
  }

  return REFERENCE_UNAVAILABLE
}

export function getServiceDemandDisplayLabel(entry = {}) {
  return getSafePresentationText(entry.serviceName, entry.serviceReference, entry.displayReference)
}

export function getPeakHourDisplayLabel(entry = {}) {
  const timeWindow = entry.startTime && entry.endTime
    ? `${entry.startTime} - ${entry.endTime}`
    : null
  return getSafePresentationText(entry.label, entry.timeSlotReference, entry.displayReference, timeWindow)
}

export function getAnalyticsSourceDomainDisplayLabel(sourceDomain) {
  const safeDomain = getSafePresentationText(sourceDomain)
  if (safeDomain === REFERENCE_UNAVAILABLE) {
    return safeDomain
  }

  if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/i.test(safeDomain)) {
    return safeDomain
  }

  return safeDomain
    .split('.')
    .map((domainPart) => domainPart
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '))
    .join(' · ')
}

export function getInvoiceDisplayReference(entry = {}) {
  return getSafePresentationText(entry.displayReference, entry.invoiceReference)
}

export function getAuditActorDisplayLabel(entry = {}, formatLabel = (value) => value) {
  if (entry.actorDisplayName || entry.actorName) {
    return getSafePresentationText(entry.actorDisplayName, entry.actorName)
  }
  if (entry.actorRole) {
    return getSafePresentationText(formatLabel(entry.actorRole))
  }
  return entry.actorUserId ? REFERENCE_UNAVAILABLE : 'System'
}

export function getAuditTargetDisplayLabel(entry = {}, formatLabel = (value) => value) {
  return getSafePresentationText(
    entry.targetReference,
    entry.displayReference,
    entry.sourceReference,
    entry.targetEntityType ? formatLabel(entry.targetEntityType) : null,
  )
}
