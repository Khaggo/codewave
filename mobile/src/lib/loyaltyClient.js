import { ApiError, getApiBaseUrl } from './authClient';

const API_BASE_URL = getApiBaseUrl();
const LOYALTY_REQUEST_TIMEOUT_MS = 8000;

export const customerLoyaltyTiers = [
  { key: 'silver', label: 'Silver', minPoints: 0 },
  { key: 'gold', label: 'Gold', minPoints: 500 },
  { key: 'platinum', label: 'Platinum', minPoints: 1500 },
  { key: 'diamond', label: 'Diamond', minPoints: 2500 },
];

const rewardVisualMap = {
  service_voucher: {
    accent: '#24E37A',
    icon: 'gift-outline',
  },
  discount_coupon: {
    accent: '#FFC500',
    icon: 'ticket-percent-outline',
  },
};

const transactionSourceMetadataMap = {
  manual_adjustment: {
    sourceLabel: 'Manual adjustment',
    crossServiceHint: 'This ledger row was added directly inside the loyalty system.',
  },
  purchase_payment: {
    sourceLabel: 'Legacy ecommerce-linked entry',
    crossServiceHint:
      'This is a historical or legacy loyalty-ledger row. Current customer loyalty meaning remains service-earned first, not ecommerce-order truth.',
  },
  purchase_reversal: {
    sourceLabel: 'Legacy ecommerce-linked reversal',
    crossServiceHint:
      'This is a legacy correction row and should not be treated as the current loyalty earning policy for customer mobile.',
  },
  reward_redemption: {
    sourceLabel: 'Reward redemption',
    crossServiceHint: 'Reward redemption is recorded directly in the loyalty ledger.',
  },
  service_invoice: {
    sourceLabel: 'Legacy invoice-linked service entry',
    crossServiceHint:
      'Current customer loyalty policy is paid-service first. Older invoice-linked loyalty rows should be treated as legacy ledger history.',
  },
  service_payment: {
    sourceLabel: 'Paid service work',
    crossServiceHint:
      'Service-earned points appear after the paid-service fact reaches the loyalty ledger.',
  },
  service_reversal: {
    sourceLabel: 'Service reversal',
    crossServiceHint:
      'Service reversals are loyalty-ledger corrections and may post separately from workshop billing updates.',
  },
};

const buildAuthHeaders = (accessToken) =>
  accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

const asArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
};

const trimOrNull = (value) => {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

const request = async (path, options = {}) => {
  const {
    body,
    headers,
    timeoutMs = LOYALTY_REQUEST_TIMEOUT_MS,
    ...rest
  } = options;
  const abortController =
    typeof AbortController === 'function' &&
    Number.isFinite(timeoutMs) &&
    timeoutMs > 0
      ? new AbortController()
      : null;
  let timeoutId = null;

  try {
    const runRequest = async () => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        signal: abortController?.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      if (!response.ok) {
        const message =
          data?.message && typeof data.message === 'string'
            ? data.message
            : `Request failed with status ${response.status}`;

        throw new ApiError(message, response.status, data);
      }

      return data;
    };

    const timeoutPromise =
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              abortController?.abort();
              reject(
                new ApiError(
                  `Timed out reaching ${API_BASE_URL}${path} after ${timeoutMs}ms. Check EXPO_PUBLIC_API_BASE_URL for the current device.`,
                  0,
                  {
                    path,
                    apiBaseUrl: API_BASE_URL,
                    timeoutMs,
                    reason: 'timeout',
                  },
                ),
              );
            }, timeoutMs);
          })
        : null;

    return timeoutPromise
      ? await Promise.race([runRequest(), timeoutPromise])
      : await runRequest();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the API server.';

    throw new ApiError(
      `Unable to reach ${API_BASE_URL}${path}. Check EXPO_PUBLIC_API_BASE_URL for the current device. ${errorMessage}`,
      0,
      {
        path,
        apiBaseUrl: API_BASE_URL,
        timeoutMs,
        reason: 'network',
      },
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const toDisplayDate = (value) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '--';
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getCustomerLoyaltyTierSummary = (pointsBalance) => {
  const normalizedPointsBalance = toNumber(pointsBalance);
  const currentTier =
    [...customerLoyaltyTiers]
      .reverse()
      .find((tier) => normalizedPointsBalance >= tier.minPoints) ?? customerLoyaltyTiers[0];
  const currentTierIndex = customerLoyaltyTiers.findIndex((tier) => tier.key === currentTier.key);
  const nextTier = customerLoyaltyTiers[currentTierIndex + 1] ?? null;

  if (!nextTier) {
    return {
      ...currentTier,
      nextTierLabel: null,
      pointsToNext: 0,
      progressRatio: 1,
    };
  }

  const tierRange = Math.max(nextTier.minPoints - currentTier.minPoints, 1);
  const progressRatio = Math.min(
    Math.max((normalizedPointsBalance - currentTier.minPoints) / tierRange, 0),
    1,
  );

  return {
    ...currentTier,
    nextTierLabel: nextTier.label,
    pointsToNext: Math.max(nextTier.minPoints - normalizedPointsBalance, 0),
    progressRatio,
  };
};

export const normalizeCustomerLoyaltyAccount = (account) => {
  if (!account || typeof account !== 'object') {
    return null;
  }

  return {
    id: account.id ?? null,
    userId: account.userId ?? null,
    pointsBalance: toNumber(account.pointsBalance),
    lifetimePointsEarned: toNumber(account.lifetimePointsEarned),
    lifetimePointsRedeemed: toNumber(account.lifetimePointsRedeemed),
    lastAccruedAt: account.lastAccruedAt ?? null,
    createdAt: account.createdAt ?? null,
    updatedAt: account.updatedAt ?? null,
  };
};

export const normalizeCustomerLoyaltyTransaction = (transaction) => {
  if (!transaction || typeof transaction !== 'object') {
    return null;
  }

  const pointsDelta = toNumber(transaction.pointsDelta);
  const sourceMetadata =
    transactionSourceMetadataMap[transaction.sourceType] ?? {
      sourceLabel: 'Loyalty account activity',
      crossServiceHint:
        'This row belongs to the loyalty ledger and may update on a different timeline from other customer views.',
    };

  return {
    id: transaction.id ?? null,
    loyaltyAccountId: transaction.loyaltyAccountId ?? null,
    transactionType: transaction.transactionType ?? 'adjustment',
    sourceType: transaction.sourceType ?? 'manual_adjustment',
    sourceReference: trimOrNull(transaction.sourceReference),
    pointsDelta,
    resultingBalance: toNumber(transaction.resultingBalance),
    metadata:
      transaction.metadata && typeof transaction.metadata === 'object'
        ? transaction.metadata
        : {},
    createdAt: transaction.createdAt ?? null,
    dateLabel: toDisplayDate(transaction.createdAt),
    pointsDeltaLabel: `${pointsDelta > 0 ? '+' : ''}${pointsDelta.toLocaleString()} pts`,
    sourceLabel: sourceMetadata.sourceLabel,
    ownerDomain: 'main-service.loyalty',
    consistencyModel: 'event_driven_read_model',
    crossServiceHint: sourceMetadata.crossServiceHint,
  };
};

export const normalizeCustomerReward = ({ reward, pointsBalance }) => {
  if (!reward || typeof reward !== 'object') {
    return null;
  }

  const pointsCost = toNumber(reward.pointsCost);
  const visual = rewardVisualMap[reward.rewardType] ?? rewardVisualMap.discount_coupon;
  const isActive = reward.status === 'active';
  const isAvailable = isActive && pointsBalance >= pointsCost;
  const remainingPoints = Math.max(pointsCost - pointsBalance, 0);
  const availabilityState = !isActive
    ? 'inactive'
    : isAvailable
      ? 'redeemable'
      : 'insufficient_points';
  const helperText = !isActive
    ? 'This reward is currently inactive and cannot be redeemed.'
    : isAvailable
      ? 'Ready to redeem from your current loyalty balance.'
      : `${remainingPoints.toLocaleString()} more points needed before this reward unlocks.`;

  return {
    id: reward.id ?? null,
    key: reward.id ?? reward.name ?? `reward-${pointsCost}`,
    icon: visual.icon,
    title: String(reward.name ?? 'Reward').trim() || 'Reward',
    description:
      trimOrNull(reward.description) ??
      (reward.rewardType === 'discount_coupon' && reward.discountPercent
        ? `${toNumber(reward.discountPercent)}% discount when redeemed.`
        : 'Redeem this reward once you have enough loyalty points.'),
    pointsLabel: `${pointsCost.toLocaleString()} points`,
    progress: Math.min(pointsBalance, pointsCost),
    target: Math.max(pointsCost, 1),
    accent: visual.accent,
    available: isAvailable,
    availabilityState,
    helperText,
    status: reward.status ?? 'inactive',
    rewardType: reward.rewardType ?? 'discount_coupon',
    pointsCost,
    discountPercent:
      reward.discountPercent === null || reward.discountPercent === undefined
        ? null
        : toNumber(reward.discountPercent),
    buttonLabel: isActive ? (isAvailable ? 'Claim' : 'Locked') : 'Inactive',
    remainingPoints,
  };
};

export const createEmptyCustomerLoyaltySnapshot = () => ({
  account: normalizeCustomerLoyaltyAccount({
    pointsBalance: 0,
    lifetimePointsEarned: 0,
    lifetimePointsRedeemed: 0,
  }),
  tier: getCustomerLoyaltyTierSummary(0),
  rewards: [],
  transactions: [],
  featuredReward: null,
});

export const loadCustomerLoyaltySnapshot = async ({ userId, accessToken }) => {
  if (!userId) {
    throw new ApiError('You need an active customer session before loyalty data can load.', 401, {
      path: '/api/loyalty/accounts/:userId',
    });
  }

  const [accountResponse, rewardsResponse, transactionsResponse] = await Promise.all([
    request(`/api/loyalty/accounts/${userId}`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
    request('/api/loyalty/rewards', {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
    request(`/api/loyalty/accounts/${userId}/transactions`, {
      method: 'GET',
      headers: buildAuthHeaders(accessToken),
    }),
  ]);

  const account = normalizeCustomerLoyaltyAccount(accountResponse);
  const pointsBalance = account?.pointsBalance ?? 0;
  const rewards = asArray(rewardsResponse)
    .map((reward) =>
      normalizeCustomerReward({
        reward,
        pointsBalance,
      }),
    )
    .filter(Boolean)
    .sort((left, right) => {
      if (Number(right.available) !== Number(left.available)) {
        return Number(right.available) - Number(left.available);
      }

      return left.pointsCost - right.pointsCost;
    });
  const transactions = asArray(transactionsResponse)
    .map(normalizeCustomerLoyaltyTransaction)
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return {
    account,
    tier: getCustomerLoyaltyTierSummary(pointsBalance),
    rewards,
    transactions,
    featuredReward: rewards.find((reward) => reward.status === 'active') ?? null,
  };
};

export const redeemCustomerReward = async ({ userId, rewardId, note, accessToken }) => {
  if (!userId) {
    throw new ApiError('You need an active customer session before redeeming rewards.', 401, {
      path: '/api/loyalty/redemptions',
    });
  }

  if (!rewardId) {
    throw new ApiError('Select a live reward before redeeming it.', 400, {
      path: '/api/loyalty/redemptions',
    });
  }

  return request('/api/loyalty/redemptions', {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: {
      userId,
      rewardId,
      note: trimOrNull(note),
    },
  });
};
