import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'

import { ApiError } from '../../lib/authClient'
import {
  createEmptyCustomerLoyaltySnapshot,
  customerLoyaltyTiers,
  loadCustomerLoyaltySnapshot,
  redeemCustomerReward,
} from '../../lib/loyaltyClient'
import { createLatestRequestCoordinator } from './latestRequestCoordinator.mjs'

const createInitialLoyaltyState = () => ({
  status: 'idle',
  errorMessage: '',
  hasLoadedSnapshot: false,
  redeemingRewardId: null,
  earningPolicy: null,
  earningPolicyError: '',
  ...createEmptyCustomerLoyaltySnapshot(),
})

const getDefaultTier = () => ({
  key: customerLoyaltyTiers[0].key,
  label: customerLoyaltyTiers[0].label,
  nextTierLabel: customerLoyaltyTiers[1]?.label ?? null,
  pointsToNext: customerLoyaltyTiers[1]?.minPoints ?? 0,
  progressRatio: 0,
})

export default function useDashboardLoyaltyController({ account }) {
  const [state, setState] = useState(createInitialLoyaltyState)
  const coordinatorRef = useRef(null)
  const redemptionInFlightRef = useRef(false)
  const redemptionRequestIdRef = useRef(0)

  if (!coordinatorRef.current) {
    coordinatorRef.current = createLatestRequestCoordinator()
  }

  const reload = useCallback(async () => {
    const userId = account?.userId
    const accessToken = account?.accessToken
    const coordinator = coordinatorRef.current

    if (!userId || !accessToken) {
      coordinator.invalidate()
      setState(createInitialLoyaltyState())
      return
    }

    const token = coordinator.begin(`${userId}:${accessToken}`)
    setState((currentState) => ({
      ...currentState,
      status: 'loading',
      errorMessage: '',
    }))

    try {
      const snapshot = await loadCustomerLoyaltySnapshot({
        userId,
        accessToken,
      })
      if (!coordinator.isCurrent(token)) {
        return
      }

      setState({
        status: 'ready',
        hasLoadedSnapshot: true,
        ...snapshot,
        errorMessage: '',
        redeemingRewardId: null,
        earningPolicy: snapshot.earningPolicy ?? null,
        earningPolicyError: snapshot.earningPolicyError ?? '',
      })
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return
      }

      const message =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load your loyalty data right now.'
      setState((currentState) => ({
        ...currentState,
        status: currentState.hasLoadedSnapshot ? 'ready' : 'error',
        errorMessage: message,
        redeemingRewardId: null,
      }))
    }
  }, [account?.accessToken, account?.userId])

  useEffect(() => {
    void reload()
    return () => {
      coordinatorRef.current?.invalidate()
      redemptionInFlightRef.current = false
      redemptionRequestIdRef.current += 1
    }
  }, [reload])

  const redeem = useCallback(
    async (reward) => {
      if (!account?.accessToken || !account?.userId) {
        Alert.alert('Rewards', 'Sign in again before redeeming rewards.')
        return
      }
      if (
        !reward?.id ||
        !reward.available ||
        state.redeemingRewardId ||
        redemptionInFlightRef.current
      ) {
        return
      }

      const requestId = ++redemptionRequestIdRef.current
      redemptionInFlightRef.current = true
      setState((currentState) => ({
        ...currentState,
        redeemingRewardId: reward.id,
        errorMessage: '',
      }))

      try {
        const redemption = await redeemCustomerReward({
          userId: account.userId,
          rewardId: reward.id,
          note: `Redeemed from mobile rewards screen: ${reward.title}`,
          accessToken: account.accessToken,
        })
        if (requestId !== redemptionRequestIdRef.current) {
          return
        }

        await reload()
        if (requestId !== redemptionRequestIdRef.current) {
          return
        }

        redemptionInFlightRef.current = false
        const remainingBalance = Number(redemption?.pointsBalanceAfter ?? 0)
        Alert.alert(
          'Reward Claimed',
          `${reward.title} has been redeemed. Remaining balance: ${remainingBalance.toLocaleString()} points.`,
        )
      } catch (error) {
        if (requestId !== redemptionRequestIdRef.current) {
          return
        }

        redemptionInFlightRef.current = false
        const message =
          error instanceof ApiError && error.message
            ? error.message
            : 'We could not redeem that reward right now.'
        setState((currentState) => ({
          ...currentState,
          redeemingRewardId: null,
          errorMessage: message,
        }))
        Alert.alert('Rewards', message)
      }
    },
    [
      account?.accessToken,
      account?.userId,
      reload,
      state.redeemingRewardId,
    ],
  )

  return {
    earningPolicy: state.earningPolicy ?? null,
    earningPolicyError: state.earningPolicyError ?? '',
    featuredReward: state.featuredReward ?? null,
    pointsBalance: state.account?.pointsBalance ?? 0,
    redeem,
    reload,
    rewards: state.rewards ?? [],
    state,
    tier: state.tier ?? getDefaultTier(),
    transactions: state.transactions ?? [],
  }
}
