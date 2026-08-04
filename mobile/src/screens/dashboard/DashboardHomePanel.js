import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Text, TouchableOpacity, View } from 'react-native'

import { colors } from '../../theme'
import {
  HomeServiceRow,
  TimelineStateCard,
} from './DashboardActivityComponents'
import {
  NotificationIconButton,
  ProfileAvatarButton,
} from './DashboardProfileComponents'
import DashboardScrollRegion from './DashboardScrollRegion'
import MotionPressable from './MotionPressable'
import styles from './dashboardStyles'
import {
  buildFeaturedRewardCopy,
  buildHomeCustomerName,
  buildHomeReminderSubtitle,
  buildHomeStatus,
  buildRecentHomeServices,
  getHomeGreeting,
  getHomeServiceHistoryView,
} from './homePresentationModel.mjs'

export default function DashboardHomePanel({
  isWeb,
  isCompactPhone,
  isVeryCompactPhone,
  account,
  notificationsFeed,
  bookingHistory,
  bookingCreateState,
  bookingVehicles,
  serviceHistoryState,
  primaryVehicleLabel,
  primaryVehicleMetaLabel,
  selectedGarageVehicleId,
  featuredReward,
  isProfileTooltipVisible,
  onToggleNotifications,
  onOpenProfile,
  onChangeProfilePhoto,
  onProfileHoverIn,
  onProfileHoverOut,
  onDismissNotification,
  onOpenBooking,
  onOpenAccessories,
  onOpenGarage,
  onOpenTimeline,
  onOpenRewards,
  onRedeemReward,
}) {
  const safeNotifications = Array.isArray(notificationsFeed) ? notificationsFeed : []
  const safeBookings = bookingHistory?.bookings ?? []
  const latestBooking = safeBookings[0] ?? bookingCreateState?.booking ?? null
  const latestReservationPayment = latestBooking?.reservationPayment ?? null
  const recentServices = buildRecentHomeServices(serviceHistoryState?.items)
  const latestCompletedService = recentServices[0] ?? null
  const unreadCount = safeNotifications.filter((item) => item.unread).length
  const pinnedNotification = safeNotifications[0] ?? null
  const topStatus = buildHomeStatus({
    booking: latestBooking,
    reservationPayment: latestReservationPayment,
    vehicles: bookingVehicles,
  })
  const reminderSubtitle = buildHomeReminderSubtitle({
    booking: latestBooking,
    completedService: latestCompletedService,
  })
  const rewardCopy = buildFeaturedRewardCopy(featuredReward)
  const serviceHistoryView = getHomeServiceHistoryView(
    serviceHistoryState?.status,
    recentServices.length,
  )
  const handleFeaturedRewardPress = () => {
    if (featuredReward?.available) {
      onRedeemReward(featuredReward)
      return
    }

    onOpenRewards()
  }

  return (
    <DashboardScrollRegion
      contentStyle={styles.homeScrollContent}
      isWeb={isWeb}
      isVeryCompactPhone={isVeryCompactPhone}
    >
      <View style={styles.homeHeader}>
        <View style={styles.homeBrandRow}>
          <View style={styles.homeBrandBadge}>
            <MaterialCommunityIcons name="wrench-outline" size={18} color={colors.text} />
          </View>
          <View>
            <Text style={styles.homeBrandEyebrow}>CRUISERS CRIB</Text>
            <Text style={styles.homeBrandTitle}>AUTOCARE</Text>
          </View>
        </View>

        <View style={styles.homeHeaderActions}>
          <NotificationIconButton count={unreadCount} onPress={onToggleNotifications} />
          <ProfileAvatarButton
            account={account}
            onPress={onOpenProfile}
            onChangePhoto={onChangeProfilePhoto}
            showTooltip={isProfileTooltipVisible}
            onHoverIn={onProfileHoverIn}
            onHoverOut={onProfileHoverOut}
          />
        </View>
      </View>

      <Text style={styles.homeGreeting}>{getHomeGreeting()}</Text>
      <View style={styles.homeNameRow}>
        <Text style={styles.homeName}>{buildHomeCustomerName(account)}</Text>
        <Text style={styles.homeWave}>!</Text>
      </View>

      <View style={[styles.homeStatusCard, !latestBooking && styles.homeStatusCardIdle]}>
        <View
          style={[
            styles.homeStatusHeader,
            isVeryCompactPhone && styles.homeStatusHeaderVeryCompact,
          ]}
        >
          <View style={styles.homeStatusCopy}>
            <Text style={[styles.homeStatusBadge, !latestBooking && styles.homeStatusBadgeIdle]}>
              {topStatus.badge}
            </Text>
            <Text style={styles.homeStatusTitle}>{topStatus.title}</Text>
            <Text style={styles.homeStatusSubtitle}>{topStatus.subtitle}</Text>
            <Text style={styles.homeStatusHelper}>{topStatus.helperText}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.homeTrackButton,
              !latestBooking && styles.homeTrackButtonIdle,
              isVeryCompactPhone && styles.homeTrackButtonVeryCompact,
            ]}
            onPress={() => onOpenBooking(topStatus.action)}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={topStatus.buttonLabel}
          >
            <Text
              style={[
                styles.homeTrackButtonText,
                !latestBooking && styles.homeTrackButtonTextIdle,
              ]}
            >
              {topStatus.buttonLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.homeProgressLabels}>
          {topStatus.steps.map((step) => (
            <Text key={step} style={styles.homeProgressLabel}>
              {step}
            </Text>
          ))}
        </View>
        <View style={styles.homeProgressTrack}>
          <View style={[styles.homeProgressFill, { width: topStatus.progressWidth }]} />
        </View>
      </View>

      {pinnedNotification ? (
        <View style={styles.homeNotificationBanner}>
          <View
            style={[
              styles.homeNotificationIconWrap,
              { backgroundColor: pinnedNotification.bgColor },
            ]}
          >
            <MaterialCommunityIcons
              name={pinnedNotification.icon}
              size={18}
              color={pinnedNotification.tint}
            />
          </View>
          <View style={styles.homeNotificationCopy}>
            <Text style={styles.homeNotificationMeta}>
              {pinnedNotification.brand}{' '}
              <Text style={styles.homeNotificationTime}>
                {pinnedNotification.timeLabel}
              </Text>
            </Text>
            <Text style={styles.homeNotificationTitle}>{pinnedNotification.title}</Text>
            <Text style={styles.homeNotificationText}>{pinnedNotification.message}</Text>
          </View>
          <TouchableOpacity
            style={styles.homeNotificationClose}
            onPress={() => onDismissNotification(pinnedNotification.key)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${pinnedNotification.title || 'notification'}`}
          >
            <MaterialCommunityIcons name="close" size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </View>
      ) : null}

      <MotionPressable
        style={styles.homeVehicleCard}
        onPress={() => onOpenGarage(selectedGarageVehicleId)}
        accessibilityRole="button"
        accessibilityLabel={`Open Garage for ${primaryVehicleLabel}`}
      >
        <View style={styles.homeVehicleIconWrap}>
          <MaterialCommunityIcons name="car-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.homeVehicleTopCopy}>
          <Text style={styles.homeVehicleTitle}>{primaryVehicleLabel}</Text>
          <Text style={styles.homeVehicleMeta}>{primaryVehicleMetaLabel}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.mutedText} />
      </MotionPressable>

      <TouchableOpacity
        style={styles.homePrimaryBookingButton}
        onPress={() => onOpenBooking('book')}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Book service"
      >
        <MaterialCommunityIcons name="calendar-plus" size={20} color={colors.onPrimary} />
        <Text style={styles.homePrimaryBookingButtonText}>Book Service</Text>
      </TouchableOpacity>

      <View style={styles.homePmsCard}>
        <View style={styles.homePmsIconWrap}>
          <MaterialCommunityIcons name="car-light-high" size={20} color={colors.primary} />
        </View>
        <View style={styles.homePmsCopy}>
          <Text style={styles.homePmsTitle}>Vehicle Accessories</Text>
          <Text style={styles.homePmsSubtitle}>Browse lights, decals, and cabin upgrades for shop pickup.</Text>
        </View>
        <TouchableOpacity
          style={styles.homePmsButton}
          onPress={onOpenAccessories}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel="Browse vehicle accessories"
        >
          <Text style={styles.homePmsButtonText}>Browse</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.homePmsCard}>
        <View style={styles.homePmsIconWrap}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.homePmsCopy}>
          <Text style={styles.homePmsTitle}>Service Reminder</Text>
          <Text style={styles.homePmsSubtitle}>{reminderSubtitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.homePmsButton}
          onPress={() => onOpenBooking('book')}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel="Book service"
        >
          <Text style={styles.homePmsButtonText}>Book</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.homeSectionHeader}>
        <Text style={styles.homeSectionLabel}>Recent Services</Text>
        <TouchableOpacity
          style={styles.homeViewAllButton}
          onPress={onOpenTimeline}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel="View all completed services"
        >
          <Text style={styles.homeViewAllText}>View All</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {serviceHistoryView === 'loading' ? (
        <TimelineStateCard
          icon="history"
          title="Loading completed services"
          message="We are syncing your finalized workshop history for the home dashboard."
        />
      ) : serviceHistoryView === 'error' ? (
        <TimelineStateCard
          icon="wifi-strength-alert-outline"
          title="Completed services unavailable"
          message={
            serviceHistoryState.errorMessage ||
            'We could not load your finalized service history right now.'
          }
        />
      ) : serviceHistoryView === 'ready' ? (
        recentServices.map((item) => (
          <HomeServiceRow key={item.key} item={item} isCompact={isCompactPhone} />
        ))
      ) : (
        <TimelineStateCard
          icon="history"
          title="No completed services yet"
          message="Completed workshop history will appear here once a finalized job order is recorded for your account."
        />
      )}

      <View style={styles.homeOfferCard}>
        <Text style={styles.homeOfferEyebrow}>{rewardCopy.eyebrow}</Text>
        <Text style={styles.homeOfferTitle}>{rewardCopy.title}</Text>
        <Text
          style={[
            styles.homeOfferSubtitle,
            isVeryCompactPhone && styles.homeOfferSubtitleCompact,
          ]}
        >
          {rewardCopy.subtitle}
        </Text>
        <TouchableOpacity
          style={styles.homeOfferButton}
          onPress={handleFeaturedRewardPress}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={rewardCopy.buttonLabel}
        >
          <Text style={styles.homeOfferButtonText}>{rewardCopy.buttonLabel}</Text>
        </TouchableOpacity>
        <View style={styles.homeOfferCircle} />
      </View>
    </DashboardScrollRegion>
  )
}
