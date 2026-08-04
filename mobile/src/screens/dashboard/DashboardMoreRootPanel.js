import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image, Text, TouchableOpacity, View } from 'react-native'

import { customerLoyaltyTiers } from '../../lib/loyaltyClient'
import { colors } from '../../theme'
import {
  ActionIconButton,
  MenuRow,
  NotificationIconButton,
} from './DashboardProfileComponents'
import DashboardScrollRegion from './DashboardScrollRegion'
import styles from './dashboardStyles'
import {
  buildCustomerProfileSummary,
  getLoyaltyProgressWidth,
} from './profileMenuPresentationModel.mjs'

export default function DashboardMoreRootPanel({
  isWeb,
  isVeryCompactPhone,
  account,
  notificationsFeed,
  loyaltyPointsBalance,
  loyaltyTier,
  onToggleNotifications,
  onOpenSettings,
  onOpenRewards,
  onOpenAccessories,
  onOpenNotificationPreferences,
  onSignOut,
}) {
  const safeNotifications = Array.isArray(notificationsFeed) ? notificationsFeed : []
  const profile = buildCustomerProfileSummary(account)
  const progressWidth = getLoyaltyProgressWidth(loyaltyTier?.progressRatio)
  const progressNow = Math.round(Math.min(Math.max(Number(loyaltyTier?.progressRatio) || 0, 0), 1) * 100)

  return (
    <DashboardScrollRegion
      contentStyle={styles.menuRootContent}
      isWeb={isWeb}
      isVeryCompactPhone={isVeryCompactPhone}
    >
      <View style={styles.profileHomeHeader}>
        <Text style={styles.profileHomeTitle}>More</Text>
        <View style={styles.profileHomeActions}>
          <NotificationIconButton
            count={safeNotifications.filter((item) => item.unread).length}
            onPress={onToggleNotifications}
          />
          <ActionIconButton
            icon="cog-outline"
            onPress={onOpenSettings}
            accessibilityLabel="Open account settings"
          />
        </View>
      </View>

      <View style={styles.profileHero}>
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {account?.profileImage ? (
              <Image
                source={{ uri: account.profileImage }}
                style={styles.profileImage}
                accessible={false}
              />
            ) : (
              <Text style={styles.avatarInitials}>{profile.initials}</Text>
            )}
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons
                name="account-check-outline"
                size={12}
                color={colors.primary}
              />
            </View>
          </View>

          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{profile.fullName}</Text>
            <Text style={styles.profileSubline}>{profile.email}</Text>
            <Text style={styles.profileSubline}>{profile.phone}</Text>
          </View>

          <View style={styles.loyaltyBadge}>
            <Text style={styles.loyaltyBadgeText}>{loyaltyTier.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.loyaltyCard}>
        <View style={styles.loyaltyCardHeader}>
          <View style={styles.loyaltyCardTitleRow}>
            <MaterialCommunityIcons name="trophy-outline" size={19} color="#FFCC33" />
            <Text style={styles.loyaltyCardTitle}>Loyalty Rewards</Text>
          </View>

          <View style={styles.loyaltyPointsWrap}>
            <Text style={styles.loyaltyPointsValue}>
              {loyaltyPointsBalance.toLocaleString()}
            </Text>
            <Text style={styles.loyaltyPointsLabel}>Total Points</Text>
          </View>
        </View>

        <View style={styles.loyaltyMetaRow}>
          <Text style={styles.currentTierText}>{loyaltyTier.label}</Text>
          <Text style={styles.nextTierText}>
            {loyaltyTier.nextTierLabel
              ? `${loyaltyTier.pointsToNext.toLocaleString()} pts to ${loyaltyTier.nextTierLabel}`
              : 'Top loyalty tier reached'}
          </Text>
        </View>

        <View
          style={styles.loyaltyTrack}
          accessibilityRole="progressbar"
          accessibilityLabel="Loyalty tier progress"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: progressNow,
            text: `${progressNow}% toward the next loyalty tier`,
          }}
          aria-valuenow={progressNow}
          aria-valuetext={`${progressNow}% toward the next loyalty tier`}
        >
          <View style={[styles.loyaltyFill, { width: progressWidth }]} />
        </View>

        <View style={styles.loyaltyTierRow}>
          {customerLoyaltyTiers.map((tier) => {
            const isReached = loyaltyPointsBalance >= tier.minPoints
            const isCurrent = tier.key === loyaltyTier.key

            return (
              <View key={tier.key} style={styles.loyaltyTierItem}>
                <View
                  style={[
                    styles.loyaltyTierIconWrap,
                    isReached && styles.loyaltyTierIconWrapReached,
                    isCurrent && styles.loyaltyTierIconWrapCurrent,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="medal-outline"
                    size={15}
                    color={isCurrent ? '#FFCC33' : isReached ? colors.text : colors.mutedText}
                  />
                </View>
                <Text
                  style={[
                    styles.loyaltyTierLabel,
                    isReached && styles.loyaltyTierLabelReached,
                    isCurrent && styles.loyaltyTierLabelCurrent,
                  ]}
                >
                  {tier.label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      <View style={styles.profileSettingsList}>
        <MenuRow
          icon="car-light-high"
          label="Accessories"
          onPress={onOpenAccessories}
        />
        <MenuRow
          icon="star-four-points-outline"
          label="Rewards"
          onPress={onOpenRewards}
        />
        <MenuRow
          icon="cog-outline"
          label="Account Settings"
          onPress={onOpenSettings}
        />
        <MenuRow
          icon="bell-outline"
          label="Notification Preferences"
          onPress={onOpenNotificationPreferences}
        />
      </View>

      <TouchableOpacity
        style={styles.signOutRow}
        onPress={onSignOut}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <View style={styles.signOutRowLeft}>
          <MaterialCommunityIcons name="logout-variant" size={18} color={colors.danger} />
          <Text style={styles.signOutRowText}>Sign Out</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.danger} />
      </TouchableOpacity>
    </DashboardScrollRegion>
  )
}
