import { loyaltyRoutes } from './requests';
import type {
  LoyaltyAccountResponse,
  LoyaltyTransactionResponse,
  RewardResponse,
} from './responses';

export type CustomerMobileLoyaltyAccountState =
  | 'account_loading'
  | 'account_zero_balance'
  | 'account_ready'
  | 'account_unavailable';

export type CustomerMobileLoyaltyHistoryState =
  | 'history_loading'
  | 'history_empty'
  | 'history_partial'
  | 'history_ready'
  | 'history_unavailable';

export type CustomerMobileLoyaltyRewardState =
  | 'reward_catalog_loading'
  | 'reward_catalog_empty'
  | 'reward_redeemable'
  | 'reward_insufficient_points'
  | 'reward_inactive'
  | 'reward_catalog_unavailable';

export type CustomerMobileLoyaltyRedemptionState =
  | 'redemption_idle'
  | 'redemption_submitting'
  | 'redemption_succeeded'
  | 'redemption_insufficient_points'
  | 'redemption_reward_inactive'
  | 'redemption_forbidden'
  | 'redemption_failed';

export type CustomerMobileLoyaltyActivityKind =
  | 'service_payment_earned'
  | 'reward_redemption'
  | 'manual_adjustment'
  | 'service_reversal'
  | 'legacy_drift';

export interface CustomerMobileLoyaltyAccountStateRule {
  state: CustomerMobileLoyaltyAccountState;
  surface: 'customer-mobile';
  truth: 'loyalty-account-route' | 'service-runtime';
  routeKey: 'getLoyaltyAccount';
  description: string;
}

export interface CustomerMobileLoyaltyHistoryStateRule {
  state: CustomerMobileLoyaltyHistoryState;
  surface: 'customer-mobile';
  truth: 'loyalty-transactions-route' | 'service-runtime';
  routeKey: 'getLoyaltyTransactions';
  description: string;
}

export interface CustomerMobileLoyaltyRewardStateRule {
  state: CustomerMobileLoyaltyRewardState;
  surface: 'customer-mobile';
  truth: 'reward-catalog-route' | 'client-derived';
  routeKey: 'listLoyaltyRewards';
  description: string;
}

export interface CustomerMobileLoyaltyRedemptionStateRule {
  state: CustomerMobileLoyaltyRedemptionState;
  surface: 'customer-mobile';
  truth: 'redemption-route' | 'client-derived';
  routeKey: 'createLoyaltyRedemption';
  description: string;
}

export const customerMobileLoyaltyRoutes = {
  getLoyaltyAccount: loyaltyRoutes.getLoyaltyAccount,
  getLoyaltyTransactions: loyaltyRoutes.getLoyaltyTransactions,
  listLoyaltyRewards: loyaltyRoutes.listLoyaltyRewards,
  createLoyaltyRedemption: loyaltyRoutes.createLoyaltyRedemption,
} as const;

export const customerMobileLoyaltyAccountStateRules: CustomerMobileLoyaltyAccountStateRule[] = [
  {
    state: 'account_loading',
    surface: 'customer-mobile',
    truth: 'loyalty-account-route',
    routeKey: 'getLoyaltyAccount',
    description: 'The customer mobile app is loading the active customer loyalty balance.',
  },
  {
    state: 'account_zero_balance',
    surface: 'customer-mobile',
    truth: 'loyalty-account-route',
    routeKey: 'getLoyaltyAccount',
    description:
      'The loyalty account exists, but the customer has no earned or redeemed points yet.',
  },
  {
    state: 'account_ready',
    surface: 'customer-mobile',
    truth: 'loyalty-account-route',
    routeKey: 'getLoyaltyAccount',
    description:
      'The loyalty account exists and the customer has a non-zero balance or historical loyalty activity.',
  },
  {
    state: 'account_unavailable',
    surface: 'customer-mobile',
    truth: 'service-runtime',
    routeKey: 'getLoyaltyAccount',
    description: 'The loyalty account could not be loaded because of auth or runtime failure.',
  },
];

export const customerMobileLoyaltyHistoryStateRules: CustomerMobileLoyaltyHistoryStateRule[] = [
  {
    state: 'history_loading',
    surface: 'customer-mobile',
    truth: 'loyalty-transactions-route',
    routeKey: 'getLoyaltyTransactions',
    description: 'The customer mobile app is loading the loyalty ledger history.',
  },
  {
    state: 'history_empty',
    surface: 'customer-mobile',
    truth: 'loyalty-transactions-route',
    routeKey: 'getLoyaltyTransactions',
    description: 'The customer has no loyalty ledger rows yet.',
  },
  {
    state: 'history_partial',
    surface: 'customer-mobile',
    truth: 'loyalty-transactions-route',
    routeKey: 'getLoyaltyTransactions',
    description:
      'The customer has a small loyalty history, such as an initial service-earned accrual plus a recent redemption.',
  },
  {
    state: 'history_ready',
    surface: 'customer-mobile',
    truth: 'loyalty-transactions-route',
    routeKey: 'getLoyaltyTransactions',
    description: 'The customer loyalty ledger contains enough activity for a fuller reward-history view.',
  },
  {
    state: 'history_unavailable',
    surface: 'customer-mobile',
    truth: 'service-runtime',
    routeKey: 'getLoyaltyTransactions',
    description: 'The loyalty history route could not be read because of auth or runtime failure.',
  },
];

export const customerMobileLoyaltyRewardStateRules: CustomerMobileLoyaltyRewardStateRule[] = [
  {
    state: 'reward_catalog_loading',
    surface: 'customer-mobile',
    truth: 'reward-catalog-route',
    routeKey: 'listLoyaltyRewards',
    description: 'The customer mobile app is loading the active reward catalog.',
  },
  {
    state: 'reward_catalog_empty',
    surface: 'customer-mobile',
    truth: 'reward-catalog-route',
    routeKey: 'listLoyaltyRewards',
    description: 'No customer-visible active rewards are currently published.',
  },
  {
    state: 'reward_redeemable',
    surface: 'customer-mobile',
    truth: 'client-derived',
    routeKey: 'listLoyaltyRewards',
    description:
      'The reward is active and the current loyalty balance is high enough to redeem it now.',
  },
  {
    state: 'reward_insufficient_points',
    surface: 'customer-mobile',
    truth: 'client-derived',
    routeKey: 'listLoyaltyRewards',
    description:
      'The reward is active, but the customer needs more service-earned points before redeeming it.',
  },
  {
    state: 'reward_inactive',
    surface: 'customer-mobile',
    truth: 'reward-catalog-route',
    routeKey: 'listLoyaltyRewards',
    description:
      'The reward exists but is inactive and must not be redeemable from the customer surface.',
  },
  {
    state: 'reward_catalog_unavailable',
    surface: 'customer-mobile',
    truth: 'service-runtime',
    routeKey: 'listLoyaltyRewards',
    description: 'The reward catalog could not be loaded because of auth or runtime failure.',
  },
];

export const customerMobileLoyaltyRedemptionStateRules: CustomerMobileLoyaltyRedemptionStateRule[] =
  [
    {
      state: 'redemption_idle',
      surface: 'customer-mobile',
      truth: 'client-derived',
      routeKey: 'createLoyaltyRedemption',
      description: 'The customer has not started a redemption request yet.',
    },
    {
      state: 'redemption_submitting',
      surface: 'customer-mobile',
      truth: 'client-derived',
      routeKey: 'createLoyaltyRedemption',
      description: 'The customer selected a reward and the redemption request is in flight.',
    },
    {
      state: 'redemption_succeeded',
      surface: 'customer-mobile',
      truth: 'redemption-route',
      routeKey: 'createLoyaltyRedemption',
      description: 'The backend accepted the redemption and returned the updated ledger-backed balance.',
    },
    {
      state: 'redemption_insufficient_points',
      surface: 'customer-mobile',
      truth: 'redemption-route',
      routeKey: 'createLoyaltyRedemption',
      description: 'The backend rejected the redemption because the customer does not have enough points.',
    },
    {
      state: 'redemption_reward_inactive',
      surface: 'customer-mobile',
      truth: 'redemption-route',
      routeKey: 'createLoyaltyRedemption',
      description: 'The backend rejected the redemption because the reward is inactive.',
    },
    {
      state: 'redemption_forbidden',
      surface: 'customer-mobile',
      truth: 'redemption-route',
      routeKey: 'createLoyaltyRedemption',
      description:
        'The backend rejected the redemption because the request crossed the active-customer ownership boundary.',
    },
    {
      state: 'redemption_failed',
      surface: 'customer-mobile',
      truth: 'client-derived',
      routeKey: 'createLoyaltyRedemption',
      description: 'A non-classified runtime or validation failure blocked the redemption request.',
    },
  ];

export const getCustomerMobileLoyaltyAccountState = (
  account: LoyaltyAccountResponse | null,
): Extract<CustomerMobileLoyaltyAccountState, 'account_zero_balance' | 'account_ready'> => {
  if (!account) {
    return 'account_zero_balance';
  }

  return account.pointsBalance > 0 ||
    account.lifetimePointsEarned > 0 ||
    account.lifetimePointsRedeemed > 0
    ? 'account_ready'
    : 'account_zero_balance';
};

export const getCustomerMobileLoyaltyHistoryState = (
  transactions: LoyaltyTransactionResponse[],
): Extract<CustomerMobileLoyaltyHistoryState, 'history_empty' | 'history_partial' | 'history_ready'> => {
  if (!transactions.length) {
    return 'history_empty';
  }

  if (transactions.length < 5) {
    return 'history_partial';
  }

  return 'history_ready';
};

export const getCustomerMobileLoyaltyRewardState = ({
  reward,
  pointsBalance,
}: {
  reward: RewardResponse;
  pointsBalance: number;
}): Extract<
  CustomerMobileLoyaltyRewardState,
  'reward_redeemable' | 'reward_insufficient_points' | 'reward_inactive'
> => {
  if (reward.status !== 'active') {
    return 'reward_inactive';
  }

  return pointsBalance >= reward.pointsCost
    ? 'reward_redeemable'
    : 'reward_insufficient_points';
};

export const getCustomerMobileLoyaltyActivityKind = (
  transaction: LoyaltyTransactionResponse,
): CustomerMobileLoyaltyActivityKind => {
  if (transaction.sourceType === 'service_payment') {
    return 'service_payment_earned';
  }

  if (transaction.sourceType === 'reward_redemption') {
    return 'reward_redemption';
  }

  if (transaction.sourceType === 'manual_adjustment') {
    return 'manual_adjustment';
  }

  if (transaction.sourceType === 'service_reversal') {
    return 'service_reversal';
  }

  return 'legacy_drift';
};

export const customerMobileLoyaltyKnownDrift = {
  legacySourceTypes: ['service_invoice', 'purchase_payment', 'purchase_reversal'] as const,
  note:
    'Some backend internals and historical rows may still expose older non-canonical loyalty source types. Customer-facing copy must treat them as legacy drift rather than the current earning policy.',
} as const;

export const customerMobileLoyaltyContractSources = [
  'docs/architecture/domains/main-service/loyalty.md',
  'docs/contracts/T112-loyalty-core.md',
  'docs/contracts/T528-commerce-and-main-service-derived-state-sync.md',
  'docs/architecture/tasks/05-client-integration/T521-loyalty-balance-history-rewards-and-redemption-mobile-flow.md',
  'mobile/src/lib/loyaltyClient.js',
  'mobile/src/screens/Dashboard.js',
] as const;
