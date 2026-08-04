import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useMemo, useState } from 'react'
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import {
  LoyaltyTransactionRow,
  RewardOfferCard,
} from './DashboardActivityComponents'
import { NotificationIconButton } from './DashboardProfileComponents'
import DashboardScrollRegion from './DashboardScrollRegion'
import styles from './dashboardStyles'
import {
  getLoyaltyProgressWidth,
  getProfileMenuLoyaltyState,
} from './profileMenuPresentationModel.mjs'
import { getRewardCatalogPage } from './rewardCatalogListModel.mjs'

export default function DashboardRewardsPanel({
  isWeb,
  isVeryCompactPhone,
  notificationCount,
  loyaltyState,
  rewards,
  pointsBalance,
  tier,
  transactions,
  onToggleNotifications,
  onRedeemReward,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [catalogPageIndex, setCatalogPageIndex] = useState(0)
  const catalogState = getProfileMenuLoyaltyState({
    status: loyaltyState.status,
    rewards,
    errorMessage: loyaltyState.errorMessage,
  })
  const catalogPage = useMemo(
    () => getRewardCatalogPage({
      rewards,
      query: searchQuery,
      page: catalogPageIndex,
    }),
    [catalogPageIndex, rewards, searchQuery],
  )

  return (
    <DashboardScrollRegion
      contentStyle={styles.menuRootContent}
      isWeb={isWeb}
      isVeryCompactPhone={isVeryCompactPhone}
    >
      <View style={styles.profileHomeHeader}>
        <View>
          <Text style={styles.bookingEyebrow}>LOYALTY</Text>
          <Text style={styles.profileHomeTitle}>Rewards</Text>
        </View>
        <NotificationIconButton
          count={notificationCount}
          onPress={onToggleNotifications}
        />
      </View>

      <View style={styles.loyaltyCard}>
        <View style={styles.loyaltyCardHeader}>
          <View style={styles.loyaltyCardTitleRow}>
            <MaterialCommunityIcons name="trophy-outline" size={19} color="#FFCC33" />
            <Text style={styles.loyaltyCardTitle}>Your Rewards Wallet</Text>
          </View>
          <View style={styles.loyaltyPointsWrap}>
            <Text style={styles.loyaltyPointsValue}>
              {pointsBalance.toLocaleString()}
            </Text>
            <Text style={styles.loyaltyPointsLabel}>Total Points</Text>
          </View>
        </View>

        <View style={styles.loyaltyMetaRow}>
          <Text style={styles.currentTierText}>{tier.label}</Text>
          <Text style={styles.nextTierText}>
            {tier.nextTierLabel
              ? `${tier.pointsToNext.toLocaleString()} pts to ${tier.nextTierLabel}`
              : 'Top loyalty tier reached'}
          </Text>
        </View>

        <View
          style={styles.loyaltyTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(Math.min(Math.max(Number(tier.progressRatio) || 0, 0), 1) * 100),
          }}
        >
          <View
            style={[
              styles.loyaltyFill,
              { width: getLoyaltyProgressWidth(tier.progressRatio) },
            ]}
          />
        </View>
      </View>

      <Text style={styles.sectionHeading}>Available Rewards</Text>
      {catalogState === 'loading' ? (
        <View style={styles.infoPanel} accessibilityLiveRegion="polite">
          <Text style={styles.infoPanelTitle}>Loading rewards</Text>
          <Text style={styles.infoPanelText}>
            Loading your points balance and reward catalog.
          </Text>
        </View>
      ) : null}

      {catalogState === 'error' ? (
        <View style={styles.infoPanel} accessibilityRole="alert">
          <Text style={styles.infoPanelTitle}>Rewards unavailable</Text>
          <Text style={styles.infoPanelText}>{loyaltyState.errorMessage}</Text>
        </View>
      ) : null}

      {catalogState === 'ready' ? (
        <>
          <View style={styles.bookingVehicleSearchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color="#9A9AA3" />
            <TextInput
              accessibilityLabel="Search rewards"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => {
                setSearchQuery(value)
                setCatalogPageIndex(0)
              }}
              placeholder="Search rewards or points"
              placeholderTextColor="#777780"
              style={styles.bookingVehicleSearchInput}
              value={searchQuery}
            />
          </View>

          <View style={styles.bookingPagerRow}>
            <Text style={styles.bookingPagerText}>
              {catalogPage.totalMatches
                ? `Showing ${catalogPage.firstVisibleNumber}-${catalogPage.lastVisibleNumber} of ${catalogPage.totalMatches}`
                : 'No matching rewards'}
            </Text>
            <View style={styles.bookingPagerActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Previous rewards page"
                accessibilityState={{ disabled: !catalogPage.canGoPrevious }}
                activeOpacity={catalogPage.canGoPrevious ? 0.86 : 1}
                disabled={!catalogPage.canGoPrevious}
                onPress={() => setCatalogPageIndex(catalogPage.currentPage - 1)}
                style={[
                  styles.bookingPagerButton,
                  !catalogPage.canGoPrevious && styles.bookingPagerButtonDisabled,
                ]}
              >
                <Text style={styles.bookingPagerButtonText}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Next rewards page"
                accessibilityState={{ disabled: !catalogPage.canGoNext }}
                activeOpacity={catalogPage.canGoNext ? 0.86 : 1}
                disabled={!catalogPage.canGoNext}
                onPress={() => setCatalogPageIndex(catalogPage.currentPage + 1)}
                style={[
                  styles.bookingPagerButton,
                  !catalogPage.canGoNext && styles.bookingPagerButtonDisabled,
                ]}
              >
                <Text style={styles.bookingPagerButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>

          {catalogPage.items.map((item) => (
            <RewardOfferCard
              key={item.key}
              item={{
                ...item,
                loading: loyaltyState.redeemingRewardId === item.id,
              }}
              onClaim={() => onRedeemReward(item)}
            />
          ))}

          {!catalogPage.totalMatches ? (
            <View style={styles.infoPanel}>
              <Text style={styles.infoPanelTitle}>No matching rewards</Text>
              <Text style={styles.infoPanelText}>
                Try a reward name or required points amount.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {catalogState === 'empty' ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>Reward catalog is empty</Text>
          <Text style={styles.infoPanelText}>
            New rewards will appear here when they become available.
          </Text>
        </View>
      ) : null}

      {transactions.length ? (
        <View style={styles.loyaltyActivityCard}>
          <Text style={styles.loyaltyActivityTitle}>Recent Loyalty Activity</Text>
          <Text style={styles.loyaltyActivitySubtitle}>
            Points earned and redeemed from your loyalty account.
          </Text>
          {transactions.slice(0, 5).map((item) => (
            <LoyaltyTransactionRow key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>No loyalty activity yet</Text>
          <Text style={styles.infoPanelText}>
            Points activity will appear after an eligible paid service.
          </Text>
        </View>
      )}
    </DashboardScrollRegion>
  )
}
