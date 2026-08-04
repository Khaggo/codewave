import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { colors } from '../../theme'
import styles from './dashboardStyles'
import MotionPressable from './MotionPressable'

export function BookingModeTab({ label, isActive, onPress }) {
  return (
    <MotionPressable
      containerStyle={styles.bookingModeTabContainer}
      style={[styles.bookingModeTab, isActive && styles.bookingModeTabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.bookingModeTabText,
          isActive && styles.bookingModeTabTextActive,
        ]}
      >
        {label}
      </Text>
    </MotionPressable>
  )
}

export function BookingDiscoveryStatePanel({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  isLoading = false,
}) {
  return (
    <View style={styles.bookingStatePanel} accessibilityRole="summary">
      <View style={styles.bookingStatePanelHeader}>
        <View style={styles.bookingStatePanelIconWrap}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={colors.primary}
            />
          )}
        </View>
        <View style={styles.bookingStatePanelCopy}>
          <Text style={styles.bookingStatePanelTitle}>{title}</Text>
          <Text style={styles.bookingStatePanelText}>{message}</Text>
        </View>
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.bookingStatePanelButton}
          onPress={onAction}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.bookingStatePanelButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export function BookingVehicleCard({
  item,
  isSelected,
  onPress,
  isCompact = false,
}) {
  return (
    <MotionPressable
      style={[
        styles.bookingServiceCard,
        isSelected && styles.bookingServiceCardSelected,
        isCompact && styles.bookingServiceCardCompact,
      ]}
      onPress={onPress}
      scaleTo={0.988}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${item.title}, plate ${item.plateNumber}`}
    >
      <View style={styles.bookingServiceIconWrap}>
        <MaterialCommunityIcons
          name="car-outline"
          size={20}
          color={isSelected ? colors.primary : colors.labelText}
        />
      </View>

      <View
        style={[
          styles.bookingServiceBody,
          isCompact && styles.bookingServiceBodyCompact,
        ]}
      >
        <View
          style={[
            styles.bookingServiceCopy,
            isCompact && styles.bookingServiceCopyCompact,
          ]}
        >
          <View style={styles.bookingServiceTitleRow}>
            <Text style={styles.bookingServiceTitle}>{item.title}</Text>
            <View style={styles.bookingVehicleBadge}>
              <Text style={styles.bookingVehicleBadgeText}>YOUR VEHICLE</Text>
            </View>
          </View>
          <Text style={styles.bookingServiceSubtitle}>{item.subtitle}</Text>
        </View>

        <View
          style={[
            styles.bookingVehicleMeta,
            isCompact && styles.bookingVehicleMetaCompact,
          ]}
        >
          <Text style={styles.bookingVehicleMetaLabel}>PLATE NUMBER</Text>
          <Text style={styles.bookingVehicleMetaValue}>{item.plateNumber}</Text>
        </View>
      </View>
    </MotionPressable>
  )
}

export function BookingServiceCard({
  item,
  isSelected,
  onPress,
  isCompact = false,
}) {
  return (
    <MotionPressable
      style={[
        styles.bookingServiceCard,
        isSelected && styles.bookingServiceCardSelected,
        !item.enabled && styles.bookingServiceCardDisabled,
        isCompact && styles.bookingServiceCardCompact,
      ]}
      onPress={item.enabled ? onPress : undefined}
      disabled={!item.enabled}
      scaleTo={0.988}
      accessibilityRole="button"
      accessibilityState={{
        selected: isSelected,
        disabled: !item.enabled,
      }}
      accessibilityLabel={`${item.title}. ${item.subtitle}`}
    >
      <View
        style={[
          styles.bookingServiceIconWrap,
          !item.enabled && styles.bookingServiceIconWrapDisabled,
        ]}
      >
        <MaterialCommunityIcons
          name={item.icon || 'wrench-outline'}
          size={20}
          color={
            !item.enabled
              ? colors.mutedText
              : isSelected
                ? colors.primary
                : colors.labelText
          }
        />
      </View>

      <View
        style={[
          styles.bookingServiceBody,
          isCompact && styles.bookingServiceBodyCompact,
        ]}
      >
        <View
          style={[
            styles.bookingServiceCopy,
            isCompact && styles.bookingServiceCopyCompact,
          ]}
        >
          <View style={styles.bookingServiceTitleRow}>
            <Text
              style={[
                styles.bookingServiceTitle,
                !item.enabled && styles.bookingDisabledText,
              ]}
            >
              {item.title}
            </Text>
            {item.badgeLabel ? (
              <View style={styles.bookingUnavailableBadge}>
                <Text style={styles.bookingUnavailableBadgeText}>
                  {item.badgeLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              styles.bookingServiceSubtitle,
              !item.enabled && styles.bookingDisabledSubtext,
            ]}
          >
            {item.subtitle}
          </Text>
        </View>

        <View
          style={[
            styles.bookingServiceMeta,
            isCompact && styles.bookingServiceMetaCompact,
          ]}
        >
          {item.metaLabel ? (
            <Text
              style={[
                styles.bookingServicePrice,
                !item.enabled && styles.bookingDisabledText,
              ]}
            >
              {item.metaLabel}
            </Text>
          ) : null}
          <View style={styles.bookingServiceDurationRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={12}
              color={colors.mutedText}
            />
            <Text style={styles.bookingServiceDuration}>
              {item.durationLabel}
            </Text>
          </View>
        </View>
      </View>
    </MotionPressable>
  )
}

export function BookingDateCard({
  item,
  isSelected,
  onPress,
  isCompact,
  cardStyle,
}) {
  return (
    <MotionPressable
      containerStyle={[styles.bookingDatePressable, cardStyle]}
      style={[
        styles.bookingDateCard,
        isCompact && styles.bookingDateCardCompact,
        item.statusTone === 'success' && styles.bookingDateCardSuccess,
        item.statusTone === 'warning' && styles.bookingDateCardLimited,
        item.statusTone === 'danger' && styles.bookingDateCardDanger,
        !item.isSelectable && styles.bookingDateCardDisabled,
        isSelected && styles.bookingDateCardActive,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityState={{
        selected: isSelected,
        disabled: !item.isSelectable,
      }}
      onPress={item.isSelectable ? onPress : undefined}
      disabled={!item.isSelectable}
    >
      <View style={styles.bookingDateLeading}>
        <Text
          style={[
            styles.bookingDateWeekday,
            !item.isSelectable && styles.bookingDisabledSubtext,
          ]}
        >
          {item.weekday}
        </Text>
        <View style={styles.bookingDateDayRow}>
          <Text
            style={[
              styles.bookingDateDay,
              !item.isSelectable && styles.bookingDisabledText,
            ]}
          >
            {item.day}
          </Text>
          <Text
            style={[
              styles.bookingDateMonth,
              !item.isSelectable && styles.bookingDisabledSubtext,
            ]}
          >
            {item.month}
          </Text>
        </View>
      </View>
      <View style={styles.bookingDateBody}>
        <Text
          numberOfLines={1}
          style={[
            styles.bookingDateCapacityText,
            !item.isSelectable && styles.bookingDisabledSubtext,
          ]}
        >
          {item.capacityLabel}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.bookingDateDetailText,
            !item.isSelectable && styles.bookingDisabledSubtext,
          ]}
        >
          {item.detailLabel}
        </Text>
      </View>
      <View
        style={[
          styles.bookingDateStatusBadge,
          item.statusTone === 'success' &&
            styles.bookingDateStatusBadgeSuccess,
          item.statusTone === 'warning' &&
            styles.bookingDateStatusBadgeWarning,
          item.statusTone === 'danger' && styles.bookingDateStatusBadgeDanger,
          !item.isSelectable && styles.bookingDateStatusBadgeMuted,
        ]}
      >
        <Text style={styles.bookingDateStatusText}>{item.statusLabel}</Text>
      </View>
    </MotionPressable>
  )
}

export function BookingTimeSlot({
  item,
  isSelected,
  onPress,
  isCompact,
}) {
  return (
    <MotionPressable
      containerStyle={[
        styles.bookingTimeSlotContainer,
        isCompact && styles.bookingTimeSlotContainerCompact,
      ]}
      style={[
        styles.bookingTimeSlot,
        isCompact && styles.bookingTimeSlotCompact,
        isSelected && styles.bookingTimeSlotActive,
        !item.available && styles.bookingTimeSlotDisabled,
      ]}
      onPress={item.available ? onPress : undefined}
      disabled={!item.available}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}. ${item.timeRangeLabel || ''} ${item.capacityLabel || item.reason || ''}`.trim()}
      accessibilityState={{
        selected: isSelected,
        disabled: !item.available,
      }}
    >
      <Text
        style={[
          styles.bookingTimeSlotText,
          isSelected && styles.bookingTimeSlotTextActive,
          !item.available && styles.bookingTimeSlotTextDisabled,
        ]}
      >
        {item.label}
      </Text>
      {item.timeRangeLabel ? (
        <Text
          style={[
            styles.bookingTimeSlotSubtext,
            isSelected && styles.bookingTimeSlotSubtextActive,
            !item.available && styles.bookingTimeSlotTextDisabled,
          ]}
        >
          {item.timeRangeLabel}
        </Text>
      ) : null}
      {item.capacityLabel ? (
        <Text
          style={[
            styles.bookingTimeSlotReason,
            isSelected && styles.bookingTimeSlotReasonActive,
          ]}
        >
          {item.capacityLabel}
        </Text>
      ) : null}
      {!item.available && item.reason ? (
        <Text style={styles.bookingTimeSlotReason}>{item.reason}</Text>
      ) : null}
    </MotionPressable>
  )
}
