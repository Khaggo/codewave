const rawUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const readableBusinessReferencePattern =
  /^(?:INV|ORD|BK|JO|CASE|VEH|OR|CR|POL|CLAIM|PAY)-[A-Z0-9-]+$/i

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue || null
}

export function getReadableLoyaltySourceReference(transaction) {
  const metadata =
    transaction?.metadata && typeof transaction.metadata === 'object'
      ? transaction.metadata
      : {}
  const pointsInput =
    metadata.pointsInput && typeof metadata.pointsInput === 'object'
      ? metadata.pointsInput
      : {}
  const invoiceReference = trimOrNull(pointsInput.invoiceReference)
  const rewardNameSnapshot = trimOrNull(metadata.rewardNameSnapshot)
  const sourceReference = trimOrNull(transaction?.sourceReference)

  if (invoiceReference) {
    return invoiceReference
  }

  if (transaction?.sourceType === 'reward_redemption') {
    return rewardNameSnapshot ?? 'Reward redemption'
  }

  if (sourceReference && readableBusinessReferencePattern.test(sourceReference)) {
    return sourceReference
  }

  if (sourceReference && !rawUuidPattern.test(sourceReference) && /\s/.test(sourceReference)) {
    return sourceReference
  }

  if (transaction?.sourceType === 'manual_adjustment') {
    return 'Manual adjustment'
  }

  return null
}

export function formatLoyaltyTransactionMeta({
  dateLabel,
  sourceReferenceLabel,
} = {}) {
  return [trimOrNull(dateLabel), trimOrNull(sourceReferenceLabel)]
    .filter(Boolean)
    .join(' - ')
}
