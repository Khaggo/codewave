import type { RouteContract } from '../shared';

export type RewardType = 'service_voucher' | 'discount_coupon';
export type RewardStatus = 'active' | 'inactive';
export type LoyaltyTransactionType = 'accrual' | 'redemption' | 'adjustment' | 'reversal';
export type LoyaltySourceType =
  | 'service_invoice'
  | 'purchase_payment'
  | 'reward_redemption'
  | 'manual_adjustment'
  | 'service_reversal'
  | 'purchase_reversal';

export interface CreateRewardRequest {
  name: string;
  description?: string;
  rewardType: RewardType;
  pointsCost: number;
  discountPercent?: number;
  status?: RewardStatus;
  reason?: string;
}

export interface UpdateRewardRequest {
  name?: string;
  description?: string;
  rewardType?: RewardType;
  pointsCost?: number;
  discountPercent?: number;
  reason?: string;
}

export interface UpdateRewardStatusRequest {
  status: RewardStatus;
  reason: string;
}

export interface RedeemRewardRequest {
  userId: string;
  rewardId: string;
  note?: string;
}

export const loyaltyRoutes: Record<string, RouteContract> = {
  getLoyaltyAccount: {
    method: 'GET',
    path: '/api/loyalty/accounts/:userId',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Customers can only read their own loyalty account; service advisers and super admins can read customer loyalty balances.',
  },
  getLoyaltyTransactions: {
    method: 'GET',
    path: '/api/loyalty/accounts/:userId/transactions',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Returns the append-only loyalty ledger for the selected user.',
  },
  listLoyaltyRewards: {
    method: 'GET',
    path: '/api/loyalty/rewards',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Non-admin actors only see active rewards; super admins see inactive rewards plus audit history.',
  },
  createLoyaltyRedemption: {
    method: 'POST',
    path: '/api/loyalty/redemptions',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Creates a redemption-backed debit transaction when the reward is active and the account has enough points.',
  },
  createReward: {
    method: 'POST',
    path: '/api/admin/loyalty/rewards',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Super admins create reward catalog entries and seed the audit trail.',
  },
  updateReward: {
    method: 'PATCH',
    path: '/api/admin/loyalty/rewards/:id',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Super admins update reward details without rewriting historical loyalty transactions.',
  },
  updateRewardStatus: {
    method: 'PATCH',
    path: '/api/admin/loyalty/rewards/:id/status',
    status: 'live',
    source: 'swagger',
    notes: 'Live route. Super admins activate or deactivate rewards with a required audit reason.',
  },
};
