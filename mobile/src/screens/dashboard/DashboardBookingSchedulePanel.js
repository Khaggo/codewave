import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Text, TouchableOpacity, View } from 'react-native'

import DatePickerField from '../../components/DatePickerField'
import { colors } from '../../theme'
import { formatDate } from '../../utils/validation'
import {
  formatBookingAvailabilityStatusLabel,
  formatBookingDateLabel,
  getBookingAvailabilityWindowLabel,
} from './bookingAvailabilityModel.mjs'
import {
  BookingDateCard,
  BookingDiscoveryStatePanel,
} from './BookingPresentationComponents'
import styles from './dashboardStyles'

export default function DashboardBookingSchedulePanel({
  isCompactPhone,
  isVeryCompactPhone,
  availability,
  dateOptions,
  selectedDateKey,
  selectedDateValue,
  minimumDate,
  maximumDate,
  selectedDay,
  selectedSlotAvailability,
  hasPreviousWindow,
  hasNextWindow,
  dateCardStyle,
  onShiftWindow,
  onRetryAvailability,
  onSelectDate,
  onChangeDate,
}) {
  const isLoading = availability.status === 'loading'

  return (
    <>
      <Text style={styles.bookingSectionLabel}>Choose Date</Text>
      <Text style={styles.bookingDateHint}>
        Browse the live booking window and choose a date that still has room for your selected
        time.
      </Text>
      <View style={styles.bookingAvailabilityWindowCard}>
        <View
          style={[
            styles.bookingAvailabilityToolbar,
            isCompactPhone && styles.bookingAvailabilityToolbarCompact,
          ]}
        >
          <View style={styles.bookingAvailabilityCopy}>
            <Text style={styles.bookingAvailabilityTitle}>Available Booking Window</Text>
            <Text style={styles.bookingAvailabilityText}>
              {getBookingAvailabilityWindowLabel(availability)}
            </Text>
          </View>
          <View
            style={[
              styles.bookingAvailabilityActions,
              isCompactPhone && styles.bookingAvailabilityActionsCompact,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.bookingPagerButton,
                !hasPreviousWindow && styles.bookingPagerButtonDisabled,
              ]}
              disabled={!hasPreviousWindow || isLoading}
              onPress={() => onShiftWindow('prev')}
              activeOpacity={!hasPreviousWindow || isLoading ? 1 : 0.86}
              accessibilityRole="button"
              accessibilityLabel="Previous booking dates"
              accessibilityState={{ disabled: !hasPreviousWindow || isLoading, busy: isLoading }}
            >
              <MaterialCommunityIcons name="chevron-left" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.bookingPagerButton,
                !hasNextWindow && styles.bookingPagerButtonDisabled,
              ]}
              disabled={!hasNextWindow || isLoading}
              onPress={() => onShiftWindow('next')}
              activeOpacity={!hasNextWindow || isLoading ? 1 : 0.86}
              accessibilityRole="button"
              accessibilityLabel="Next booking dates"
              accessibilityState={{ disabled: !hasNextWindow || isLoading, busy: isLoading }}
            >
              <MaterialCommunityIcons name="chevron-right" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && !availability.days.length ? (
          <BookingDiscoveryStatePanel
            icon="calendar-sync"
            title="Refreshing live availability"
            message="Loading approved appointment dates for this booking window."
            isLoading
          />
        ) : null}

        {availability.status === 'error' ? (
          <BookingDiscoveryStatePanel
            icon="calendar-alert"
            title="Date availability is unavailable"
            message={
              availability.errorMessage ||
              'We could not refresh the booking availability window right now.'
            }
            actionLabel="Retry"
            onAction={onRetryAvailability}
          />
        ) : null}

        {availability.days.length ? (
          <View
            style={[
              styles.bookingAvailabilityGrid,
              isVeryCompactPhone && styles.bookingAvailabilityGridCompact,
            ]}
          >
            {dateOptions.map((dateOption) => (
              <BookingDateCard
                key={dateOption.key}
                item={dateOption}
                isSelected={selectedDateKey === dateOption.key}
                isCompact={isCompactPhone}
                cardStyle={dateCardStyle}
                onPress={() => onSelectDate(dateOption.key)}
              />
            ))}
          </View>
        ) : null}

        <DatePickerField
          label="Jump To A Date"
          value={selectedDateValue}
          onChange={onChangeDate}
          placeholder="Choose an appointment date"
          helperText={
            minimumDate && maximumDate
              ? `Supported booking horizon: ${formatDate(minimumDate)} to ${formatDate(maximumDate)}. Use the live date cards above as the final availability source.`
              : 'Choose a date inside the live booking horizon.'
          }
          title="Jump To A Booking Date"
          subtitle="Use this if the date you want is farther into the supported booking window."
          trailingLabel="Jump"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          initialPickerStep="day"
        />

        {selectedDay ? (
          <View style={styles.bookingAvailabilitySelectionCard}>
            <View
              style={[
                styles.bookingAvailabilitySelectionHeader,
                isCompactPhone && styles.bookingAvailabilitySelectionHeaderCompact,
              ]}
            >
              <Text style={styles.bookingAvailabilitySelectionTitle}>
                {formatBookingDateLabel(selectedDay.scheduledDate)}
              </Text>
              <View
                style={[
                  styles.bookingDateStatusBadge,
                  selectedDay.status === 'closed'
                    ? styles.bookingDateStatusBadgeMuted
                    : selectedSlotAvailability?.isAvailable
                      ? selectedDay.status === 'limited'
                        ? styles.bookingDateStatusBadgeWarning
                        : styles.bookingDateStatusBadgeSuccess
                      : styles.bookingDateStatusBadgeDanger,
                ]}
              >
                <Text style={styles.bookingDateStatusText}>
                  {formatBookingAvailabilityStatusLabel(
                    selectedDay.status === 'closed'
                      ? 'closed'
                      : selectedSlotAvailability?.isAvailable
                        ? selectedDay.status
                        : (selectedSlotAvailability?.remainingCapacity ?? 0) > 0
                          ? 'blocked'
                          : 'full',
                  )}
                </Text>
              </View>
            </View>
            <Text style={styles.bookingAvailabilitySelectionMeta}>
              {selectedDay.status === 'closed'
                ? selectedDay.closureLabel ||
                  selectedDay.closureReason ||
                  'This date is closed for new bookings.'
                : selectedSlotAvailability
                  ? selectedSlotAvailability.isAvailable
                    ? `${selectedSlotAvailability.label}: ${selectedSlotAvailability.remainingCapacity} of ${selectedSlotAvailability.capacity} spots left.`
                    : `${selectedSlotAvailability.label}: ${
                        selectedSlotAvailability.remainingCapacity > 0
                          ? 'unavailable for this vehicle or booking right now.'
                          : 'fully booked.'
                      }`
                  : `${selectedDay.availableSlotCount} of ${selectedDay.activeSlotCount} live slots are still available on this day.`}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  )
}
