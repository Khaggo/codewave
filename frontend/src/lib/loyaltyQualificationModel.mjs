const asArray = (value) => (Array.isArray(value) ? value : [])
const text = (value) => String(value ?? '').trim() || null
const dateLabel = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not set'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export const normalizeLoyaltyQualificationAudit = (qualification) => {
  if (!qualification || typeof qualification !== 'object') return null
  const vehiclePublicReference = text(qualification.vehiclePublicReference)
  if (!vehiclePublicReference) return null

  return {
    status: qualification.status === 'qualified' ? 'qualified' : 'not_qualified',
    vehiclePublicReference,
    vehicleLabel: text(qualification.vehicleLabel) ?? 'Registered vehicle',
    lastVerifiedAt: qualification.lastVerifiedAt ?? null,
    lastVerifiedAtLabel: qualification.lastVerifiedAt
      ? dateLabel(qualification.lastVerifiedAt)
      : 'Not currently verified',
    reasonCategory: qualification.reasonCategory === 'sticker_verified'
      ? 'sticker_verified'
      : 'sticker_not_present',
    history: asArray(qualification.history).map((entry) => ({
      observation: entry?.observation === 'verified_present' ? 'verified_present' : 'not_present',
      observedAt: entry?.observedAt ?? null,
      observedAtLabel: dateLabel(entry?.observedAt),
      intakeReference: text(entry?.intakeReference) ?? 'Intake reference unavailable',
      reason: text(entry?.reason),
    })),
  }
}
