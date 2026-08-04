import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Text, TouchableOpacity, View } from 'react-native'

import { formatLoyaltyTransactionMeta } from '../../lib/loyaltyPresentation.mjs'
import { colors } from '../../theme'
import { formatDate } from '../../utils/validation'
import MotionPressable from './MotionPressable'
import styles from './dashboardStyles'
import {
  getLifecycleSummaryTone,
  getRewardOfferState,
  getTimelineToneKeys,
} from './dashboardCardPresentationModel.mjs'

export function RewardOfferCard({ item, onClaim }) {
  const { progressRatio, isButtonDisabled, buttonLabel } = getRewardOfferState(item)

  return (
    <View style={styles.rewardCard}>
      <View style={styles.rewardCardHeader}>
        <View style={styles.rewardIconWrap}>
          <MaterialCommunityIcons name={item.icon} size={20} color={item.accent} />
        </View>
        <View style={styles.rewardCopy}>
          <Text style={styles.rewardTitle}>{item.title}</Text>
          <Text style={styles.rewardPoints}>{item.pointsLabel}</Text>
        </View>
        <TouchableOpacity
          style={[styles.claimButton, isButtonDisabled && styles.claimButtonLocked]}
          onPress={isButtonDisabled ? undefined : onClaim}
          activeOpacity={isButtonDisabled ? 1 : 0.86}
          disabled={isButtonDisabled}
          accessibilityRole="button"
          accessibilityLabel={`${buttonLabel} ${item.title}`}
          accessibilityState={{ disabled: isButtonDisabled, busy: Boolean(item.loading) }}
        >
          <Text style={[styles.claimButtonText, isButtonDisabled && styles.claimButtonTextLocked]}>
            {buttonLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rewardProgressMeta}>
        <Text style={styles.rewardProgressLabel}>Progress</Text>
        <Text style={[styles.rewardProgressValue, { color: item.accent }]}>
          {item.progress.toLocaleString()} / {item.target.toLocaleString()}
        </Text>
      </View>
      <View style={styles.rewardProgressTrack}>
        <View
          style={[
            styles.rewardProgressFill,
            { width: `${progressRatio * 100}%`, backgroundColor: item.accent },
          ]}
        />
      </View>
      <Text style={styles.rewardHelperText}>{item.helperText}</Text>
    </View>
  )
}

export function LoyaltyTransactionRow({ item }) {
  const isPositive = item.pointsDelta >= 0

  return (
    <View style={styles.loyaltyTransactionRow}>
      <View style={styles.loyaltyTransactionCopy}>
        <Text style={styles.loyaltyTransactionTitle}>{item.sourceLabel}</Text>
        <Text style={styles.loyaltyTransactionMeta}>{formatLoyaltyTransactionMeta(item)}</Text>
      </View>
      <View style={styles.loyaltyTransactionAmountWrap}>
        <Text
          style={[
            styles.loyaltyTransactionAmount,
            isPositive
              ? styles.loyaltyTransactionAmountPositive
              : styles.loyaltyTransactionAmountNegative,
          ]}
        >
          {item.pointsDeltaLabel}
        </Text>
        <Text style={styles.loyaltyTransactionBalance}>
          Balance {item.resultingBalance.toLocaleString()}
        </Text>
      </View>
    </View>
  )
}

export function QuickActionCard({ item, onPress, isCompact = false }) {
  return (
    <MotionPressable
      containerStyle={[
        styles.quickActionCardContainer,
        isCompact && styles.quickActionCardContainerCompact,
      ]}
      style={styles.quickActionCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View
        style={[
          styles.quickActionIconWrap,
          isCompact && styles.quickActionIconWrapCompact,
          { backgroundColor: item.bgColor },
        ]}
      >
        <View style={[styles.quickActionIconInner, { backgroundColor: item.iconColor }]}>
          <MaterialCommunityIcons name={item.icon} size={20} color={colors.text} />
        </View>
      </View>
      <Text style={styles.quickActionLabel}>{item.label}</Text>
    </MotionPressable>
  )
}

export function HomeServiceRow({ item, isCompact = false }) {
  return (
    <View style={[styles.homeServiceRow, isCompact && styles.homeServiceRowCompact]}>
      <View style={[styles.homeServiceRowLeft, isCompact && styles.homeServiceRowLeftCompact]}>
        <View style={styles.homeServiceIconWrap}>
          <MaterialCommunityIcons name={item.icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.homeServiceCopy}>
          <Text style={styles.homeServiceTitle}>{item.title}</Text>
          <Text style={styles.homeServiceDate}>{item.dateLabel}</Text>
        </View>
      </View>
      <View style={styles.homeServiceStatusPill}>
        <Text style={styles.homeServiceStatusText}>{item.status}</Text>
      </View>
    </View>
  )
}

export function TimelineEventCard({ item }) {
  const tones = getTimelineToneKeys(item)
  const statusToneStyle =
    tones.status === 'success'
      ? styles.timelineStatusPillSuccess
      : styles.timelineStatusPillDefault
  const statusTextToneStyle =
    tones.status === 'success'
      ? styles.timelineStatusTextSuccess
      : styles.timelineStatusTextDefault
  const typeToneStyle =
    tones.type === 'summary'
      ? styles.timelineTypePillSummary
      : tones.type === 'verified'
        ? styles.timelineTypePillVerified
        : styles.timelineTypePillAdministrative

  return (
    <View style={styles.timelineEventCard}>
      <View style={styles.timelineEventRail}>
        <View style={styles.timelineEventDot}>
          <MaterialCommunityIcons name={item.icon} size={15} color={colors.primary} />
        </View>
        <View style={styles.timelineEventLine} />
      </View>
      <View style={styles.timelineEventContent}>
        <View style={styles.timelineEventHeader}>
          <Text style={styles.timelineEventTitle}>{item.title}</Text>
          <View style={[styles.timelineStatusPill, statusToneStyle]}>
            <Text style={[styles.timelineStatusText, statusTextToneStyle]}>
              {item.statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.timelineEventSummary}>{item.summary}</Text>
        {item.metaLabel ? (
          <Text style={styles.timelineEventMechanic}>{`\u2022 ${item.metaLabel}`}</Text>
        ) : null}
        <View style={styles.timelineEventFooter}>
          <View style={styles.timelineEventMetaRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.mutedText} />
            <Text style={styles.timelineEventDate}>{item.dateLabel}</Text>
          </View>
          <Text style={styles.timelineEventPrice}>{item.sourceLabel}</Text>
        </View>
        <View style={[styles.timelineTypePill, typeToneStyle]}>
          <Text style={styles.timelineTypeText}>{item.typeLabel}</Text>
        </View>
      </View>
    </View>
  )
}

export function TimelineStateCard({ icon, title, message, actionLabel, onAction }) {
  return (
    <View style={styles.timelineStateCard}>
      <View style={styles.timelineStateIconWrap}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.timelineStateTitle}>{title}</Text>
      <Text style={styles.timelineStateText}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.timelineStateAction}
          onPress={onAction}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.timelineStateActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export function LifecycleSummaryCard({ summaryCard }) {
  const tone = getLifecycleSummaryTone(summaryCard.state)
  const pillStyle =
    tone === 'visible'
      ? styles.timelineSummaryPillVisible
      : tone === 'pending'
        ? styles.timelineSummaryPillPending
        : styles.timelineSummaryPillHidden
  const pillTextStyle =
    tone === 'visible'
      ? styles.timelineSummaryPillTextVisible
      : tone === 'pending'
        ? styles.timelineSummaryPillTextPending
        : styles.timelineSummaryPillTextHidden

  return (
    <View style={styles.timelineSummaryCard}>
      <View style={styles.timelineSummaryHeader}>
        <View>
          <Text style={styles.bookingEyebrow}>REVIEWED SUMMARY</Text>
          <Text style={styles.timelineSummaryTitle}>{summaryCard.title}</Text>
        </View>
        <View style={[styles.timelineSummaryPill, pillStyle]}>
          <Text style={[styles.timelineSummaryPillText, pillTextStyle]}>
            {summaryCard.stateLabel}
          </Text>
        </View>
      </View>
      {summaryCard.summaryText ? (
        <Text style={styles.timelineSummaryBody}>{summaryCard.summaryText}</Text>
      ) : null}
      <Text style={styles.timelineSummaryHelperText}>{summaryCard.helperText}</Text>
      {summaryCard.reviewedAt ? (
        <Text style={styles.timelineSummaryMeta}>
          {`Updated ${formatDate(new Date(summaryCard.reviewedAt))}`}
        </Text>
      ) : null}
    </View>
  )
}
