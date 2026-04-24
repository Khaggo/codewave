import { ApiError } from './authClient'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')

const rewardTypeLabels = {
  service_voucher: 'Service Voucher',
  discount_coupon: 'Discount Coupon',
}

const rewardStatusLabels = {
  active: 'Active',
  inactive: 'Inactive',
}

const earningRuleSourceLabels = {
  service: 'Service',
  ecommerce: 'E-commerce',
  both: 'Service + E-commerce',
}

const earningRuleFormulaLabels = {
  flat_points: 'Flat Points',
  amount_ratio: 'Amount Ratio',
}

const transactionTypeLabels = {
  accrual: 'Accrual',
  redemption: 'Redemption',
  adjustment: 'Adjustment',
  reversal: 'Reversal',
}

const asArray = (value) => (Array.isArray(value) ? value : [])

const toNumber = (value) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue ? normalizedValue : null
}

const formatDateTime = (value) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const centsToCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(toNumber(value) / 100)

const parseResponse = async (response) => {
  const rawText = await response.text()

  if (!rawText) {
    return null
  }

  try {
    return JSON.parse(rawText)
  } catch {
    return rawText
  }
}

const request = async (path, { accessToken, body, method = 'GET' } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await parseResponse(response)

  if (!response.ok) {
    const message =
      data?.message && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, data)
  }

  return data
}

export const normalizeReward = (reward) => {
  if (!reward || typeof reward !== 'object') {
    return null
  }

  return {
    id: reward.id ?? null,
    name: trimOrNull(reward.name) ?? 'Untitled reward',
    description: trimOrNull(reward.description),
    fulfillmentNote: trimOrNull(reward.fulfillmentNote),
    rewardType: reward.rewardType ?? 'service_voucher',
    typeLabel: rewardTypeLabels[reward.rewardType] ?? 'Reward',
    pointsCost: toNumber(reward.pointsCost),
    pointsLabel: `${toNumber(reward.pointsCost).toLocaleString()} pts`,
    discountPercent:
      reward.discountPercent === null || reward.discountPercent === undefined
        ? null
        : toNumber(reward.discountPercent),
    discountLabel:
      reward.discountPercent === null || reward.discountPercent === undefined
        ? 'None'
        : `${toNumber(reward.discountPercent)}%`,
    status: reward.status ?? 'inactive',
    statusLabel: rewardStatusLabels[reward.status] ?? 'Inactive',
    createdByUserId: reward.createdByUserId ?? null,
    updatedByUserId: reward.updatedByUserId ?? null,
    createdAt: reward.createdAt ?? null,
    updatedAt: reward.updatedAt ?? null,
    updatedAtLabel: formatDateTime(reward.updatedAt ?? reward.createdAt),
    audits: asArray(reward.audits),
    auditCount: asArray(reward.audits).length,
  }
}

export const normalizeEarningRule = (rule) => {
  if (!rule || typeof rule !== 'object') {
    return null
  }

  const formulaSummary =
    rule.formulaType === 'flat_points'
      ? `${toNumber(rule.flatPoints).toLocaleString()} pts`
      : `${toNumber(rule.pointsPerStep).toLocaleString()} pts / ${centsToCurrency(rule.amountStepCents)}`

  return {
    id: rule.id ?? null,
    name: trimOrNull(rule.name) ?? 'Untitled earning rule',
    description: trimOrNull(rule.description),
    accrualSource: rule.accrualSource ?? 'service',
    sourceLabel: earningRuleSourceLabels[rule.accrualSource] ?? 'Source',
    formulaType: rule.formulaType ?? 'amount_ratio',
    formulaLabel: earningRuleFormulaLabels[rule.formulaType] ?? 'Formula',
    formulaSummary,
    flatPoints: rule.flatPoints === null || rule.flatPoints === undefined ? null : toNumber(rule.flatPoints),
    amountStepCents:
      rule.amountStepCents === null || rule.amountStepCents === undefined
        ? null
        : toNumber(rule.amountStepCents),
    pointsPerStep:
      rule.pointsPerStep === null || rule.pointsPerStep === undefined
        ? null
        : toNumber(rule.pointsPerStep),
    minimumAmountCents:
      rule.minimumAmountCents === null || rule.minimumAmountCents === undefined
        ? null
        : toNumber(rule.minimumAmountCents),
    minimumAmountLabel:
      rule.minimumAmountCents === null || rule.minimumAmountCents === undefined
        ? 'No minimum'
        : centsToCurrency(rule.minimumAmountCents),
    eligibleServiceTypes: asArray(rule.eligibleServiceTypes),
    eligibleServiceCategories: asArray(rule.eligibleServiceCategories),
    eligibleProductIds: asArray(rule.eligibleProductIds),
    eligibleProductCategoryIds: asArray(rule.eligibleProductCategoryIds),
    promoLabel: trimOrNull(rule.promoLabel),
    manualBenefitNote: trimOrNull(rule.manualBenefitNote),
    activeFrom: rule.activeFrom ?? null,
    activeUntil: rule.activeUntil ?? null,
    activeWindowLabel:
      rule.activeFrom || rule.activeUntil
        ? `${rule.activeFrom ? formatDateTime(rule.activeFrom) : 'Now'} to ${
            rule.activeUntil ? formatDateTime(rule.activeUntil) : 'No end'
          }`
        : 'Always on',
    status: rule.status ?? 'inactive',
    statusLabel: rewardStatusLabels[rule.status] ?? 'Inactive',
    createdByUserId: rule.createdByUserId ?? null,
    updatedByUserId: rule.updatedByUserId ?? null,
    createdAt: rule.createdAt ?? null,
    updatedAt: rule.updatedAt ?? null,
    updatedAtLabel: formatDateTime(rule.updatedAt ?? rule.createdAt),
    audits: asArray(rule.audits),
    auditCount: asArray(rule.audits).length,
  }
}

export const normalizeLoyaltyAnalytics = (analytics) => {
  const totals = analytics?.totals ?? {}

  return {
    refreshedAt: analytics?.refreshedAt ?? null,
    refreshedAtLabel: formatDateTime(analytics?.refreshedAt),
    refreshJobId: analytics?.refreshJobId ?? null,
    totals: {
      accountCount: toNumber(totals.accountCount),
      totalPointsBalance: toNumber(totals.totalPointsBalance),
      totalPointsEarned: toNumber(totals.totalPointsEarned),
      totalPointsRedeemed: toNumber(totals.totalPointsRedeemed),
      redemptionCount: toNumber(totals.redemptionCount),
    },
    transactionTypes: asArray(analytics?.transactionTypes).map((item) => ({
      transactionType: item.transactionType ?? 'unknown',
      typeLabel: transactionTypeLabels[item.transactionType] ?? item.transactionType ?? 'Unknown',
      count: toNumber(item.count),
      netPointsDelta: toNumber(item.netPointsDelta),
    })),
    topRewards: asArray(analytics?.topRewards).map((item) => ({
      rewardId: item.rewardId ?? null,
      rewardName: trimOrNull(item.rewardName) ?? 'Reward',
      rewardStatus: item.rewardStatus ?? 'unknown',
      redemptionCount: toNumber(item.redemptionCount),
      sourceRedemptionIds: asArray(item.sourceRedemptionIds),
    })),
  }
}

export const listLoyaltyRewards = async (accessToken) =>
  asArray(await request('/api/loyalty/rewards', { accessToken }))
    .map(normalizeReward)
    .filter(Boolean)

export const createLoyaltyReward = async (payload, accessToken) =>
  normalizeReward(
    await request('/api/admin/loyalty/rewards', {
      method: 'POST',
      accessToken,
      body: payload,
    }),
  )

export const updateLoyaltyReward = async ({ rewardId, ...payload }, accessToken) => {
  if (!rewardId) {
    throw new ApiError('Select a reward before updating it.', 400, {
      path: '/api/admin/loyalty/rewards/:id',
    })
  }

  return normalizeReward(
    await request(`/api/admin/loyalty/rewards/${rewardId}`, {
      method: 'PATCH',
      accessToken,
      body: payload,
    }),
  )
}

export const updateLoyaltyRewardStatus = async ({ rewardId, status, reason }, accessToken) => {
  if (!rewardId) {
    throw new ApiError('Select a reward before changing its status.', 400, {
      path: '/api/admin/loyalty/rewards/:id/status',
    })
  }

  return normalizeReward(
    await request(`/api/admin/loyalty/rewards/${rewardId}/status`, {
      method: 'PATCH',
      accessToken,
      body: {
        status,
        reason,
      },
    }),
  )
}

export const listLoyaltyEarningRules = async (accessToken) =>
  asArray(await request('/api/admin/loyalty/earning-rules', { accessToken }))
    .map(normalizeEarningRule)
    .filter(Boolean)

export const createLoyaltyEarningRule = async (payload, accessToken) =>
  normalizeEarningRule(
    await request('/api/admin/loyalty/earning-rules', {
      method: 'POST',
      accessToken,
      body: payload,
    }),
  )

export const updateLoyaltyEarningRule = async ({ ruleId, ...payload }, accessToken) => {
  if (!ruleId) {
    throw new ApiError('Select an earning rule before updating it.', 400, {
      path: '/api/admin/loyalty/earning-rules/:id',
    })
  }

  return normalizeEarningRule(
    await request(`/api/admin/loyalty/earning-rules/${ruleId}`, {
      method: 'PATCH',
      accessToken,
      body: payload,
    }),
  )
}

export const updateLoyaltyEarningRuleStatus = async ({ ruleId, status, reason }, accessToken) => {
  if (!ruleId) {
    throw new ApiError('Select an earning rule before changing its status.', 400, {
      path: '/api/admin/loyalty/earning-rules/:id/status',
    })
  }

  return normalizeEarningRule(
    await request(`/api/admin/loyalty/earning-rules/${ruleId}/status`, {
      method: 'PATCH',
      accessToken,
      body: {
        status,
        reason,
      },
    }),
  )
}

export const getLoyaltyAnalytics = async (accessToken) =>
  normalizeLoyaltyAnalytics(await request('/api/analytics/loyalty', { accessToken }))
