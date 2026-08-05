const asArray = (value) => (Array.isArray(value) ? value : [])

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue ? normalizedValue : null
}

export const normalizeCustomerLoyaltyEarningPolicy = (policy) => {
  if (!policy || typeof policy !== 'object') {
    return null
  }

  const requirements = asArray(policy.requirements)
    .map((requirement) => ({
      formula: trimOrNull(requirement?.formula),
      eligibility: trimOrNull(requirement?.eligibility),
    }))
    .filter((requirement) => requirement.formula || requirement.eligibility)

  const summary = trimOrNull(policy.summary)
  const exclusions = asArray(policy.exclusions)
    .map(trimOrNull)
    .filter(Boolean)

  if (!summary && !requirements.length && !exclusions.length) {
    return null
  }

  return {
    summary: summary ?? 'Earning guidance is available from the service team.',
    requirements,
    exclusions,
  }
}
