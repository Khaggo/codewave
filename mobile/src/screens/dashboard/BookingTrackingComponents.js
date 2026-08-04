import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Text, View } from 'react-native'

import { colors } from '../../theme'
import { formatBookingDateLabel } from './bookingAvailabilityModel.mjs'
import {
  getBookingReference,
  getBookingRequestedServiceNames,
} from './bookingSelectionModel.mjs'
import {
  getBookingServiceHeadline,
  getBookingStatusLabel,
  getBookingTimeLabel,
  getBookingVehicleLabel,
} from './bookingPresentationModel.mjs'
import styles from './dashboardStyles'
import MotionPressable from './MotionPressable'

export function BookingHistoryCard({
  booking,
  vehicles,
  isSelected,
  onPress,
}) {
  const reference = getBookingReference(booking)
  const statusLabel = getBookingStatusLabel(booking.status)

  return (
    <MotionPressable
      style={[
        styles.bookingHistoryCard,
        isSelected && styles.bookingHistoryCardActive,
      ]}
      onPress={onPress}
      scaleTo={0.988}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${reference}. ${getBookingServiceHeadline(booking)}. ${statusLabel}`}
    >
      <View style={styles.bookingHistoryCardHeader}>
        <Text style={styles.bookingHistoryReference}>#{reference}</Text>
        <View style={styles.bookingHistoryStatusPill}>
          <Text style={styles.bookingHistoryStatusText}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.bookingHistoryTitle}>
        {getBookingServiceHeadline(booking)}
      </Text>
      <BookingRequestedServiceChips booking={booking} compact />
      <Text style={styles.bookingHistoryMeta}>
        {formatBookingDateLabel(booking.scheduledDate)} -{' '}
        {getBookingTimeLabel(booking)}
      </Text>
      <Text style={styles.bookingHistoryMeta}>
        {getBookingVehicleLabel(booking, vehicles)}
      </Text>
    </MotionPressable>
  )
}

export function BookingRequestedServiceChips({
  booking,
  compact = false,
}) {
  const serviceNames = getBookingRequestedServiceNames(booking)
  if (!serviceNames.length) {
    return null
  }

  return (
    <View
      style={[
        styles.bookingServiceChipRow,
        compact && styles.bookingServiceChipRowCompact,
      ]}
    >
      {serviceNames.map((serviceName) => (
        <View key={serviceName} style={styles.bookingServiceChip}>
          <Text style={styles.bookingServiceChipText}>{serviceName}</Text>
        </View>
      ))}
    </View>
  )
}

export function TrackingStep({ item, isLast }) {
  const isDone = item.state === 'done'
  const isCurrent = item.state === 'current'
  const isDim = item.state === 'upcoming' || item.state === 'inactive'

  return (
    <View style={styles.trackingStepRow}>
      <View style={styles.trackingRail}>
        <View
          style={[
            styles.trackingStepDot,
            isDone && styles.trackingStepDotDone,
            isCurrent && styles.trackingStepDotCurrent,
            isDim && styles.trackingStepDotIdle,
          ]}
        >
          {isDone ? (
            <MaterialCommunityIcons
              name="check"
              size={14}
              color={colors.text}
            />
          ) : isCurrent ? (
            <View style={styles.trackingStepDotCurrentCore} />
          ) : null}
        </View>
        {!isLast ? (
          <View
            style={[
              styles.trackingStepLine,
              (isDone || isCurrent) && styles.trackingStepLineActive,
              item.state === 'inactive' && styles.trackingStepLineIdle,
            ]}
          />
        ) : null}
      </View>

      <View style={styles.trackingStepContent}>
        <Text
          style={[
            styles.trackingStepTitle,
            isCurrent && styles.trackingStepTitleCurrent,
            item.state === 'inactive' && styles.trackingStepTitleInactive,
          ]}
        >
          {item.label}
        </Text>
        <Text
          style={[
            styles.trackingStepStatus,
            item.state === 'inactive' && styles.trackingStepStatusInactive,
          ]}
        >
          {item.status}
        </Text>
        {item.note ? (
          <View
            style={[
              styles.trackingStepNoteCard,
              item.state === 'inactive' &&
                styles.trackingStepNoteCardInactive,
            ]}
          >
            <Text
              style={[
                styles.trackingStepNoteText,
                item.state === 'inactive' &&
                  styles.trackingStepNoteTextInactive,
              ]}
            >
              {item.note}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}
