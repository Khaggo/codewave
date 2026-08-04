import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { formatBookingServiceCurrency } from '../../lib/bookingDiscoveryClient'
import { colors } from '../../theme'
import { formatBookingDateLabel } from './bookingAvailabilityModel.mjs'
import {
  buildBookingTrackingSteps,
  formatBookingDateTimeLabel,
  formatReservationFeeUrgency,
  getBookingReference,
  getBookingServiceHeadline,
  getBookingStatusLabel,
  getBookingTimeLabel,
  getBookingVehicleLabel,
  getReservationPaymentStatusLabel,
} from './bookingPresentationModel.mjs'
import { BookingDiscoveryStatePanel } from './BookingPresentationComponents'
import {
  BookingHistoryCard,
  BookingRequestedServiceChips,
  TrackingStep,
} from './BookingTrackingComponents'
import { buildBookingHistoryListPage } from './bookingHistoryListModel.mjs'
import { getBookingHistoryView } from './bookingWorkspacePresentationModel.mjs'
import styles from './dashboardStyles'

export default function DashboardBookingTrackingPanel({
  isCompactPhone,
  history,
  vehicles,
  selectedHistoryBookingId,
  detailState,
  reservationPaymentState,
  onRefreshHistory,
  onSelectHistoryBooking,
  onOpenReservationPayment,
  onRetryReservationPayment,
}) {
  const historyView = getBookingHistoryView(history)
  const selectedHistoryBooking = history.bookings.find(
    (booking) => booking.id === selectedHistoryBookingId,
  )
  const selectedBooking = detailState.booking ?? selectedHistoryBooking ?? null
  const selectedReservationPayment = selectedBooking?.reservationPayment ?? null
  const trackingSteps = buildBookingTrackingSteps(selectedBooking)
  const isPaymentLoading = reservationPaymentState.status === 'loading'
  const [historySearch, setHistorySearch] = useState('')
  const [historyPage, setHistoryPage] = useState(0)
  const historyListPage = useMemo(
    () => buildBookingHistoryListPage({
      bookings: history.bookings,
      vehicles,
      search: historySearch,
      page: historyPage,
    }),
    [history.bookings, historyPage, historySearch, vehicles],
  )

  useEffect(() => {
    const selectionIsVisible = historyListPage.items.some(
      (booking) => booking.id === selectedHistoryBookingId,
    )
    if (!selectionIsVisible && historyListPage.items[0]) {
      onSelectHistoryBooking(historyListPage.items[0].id)
    }
  }, [historyListPage.items, onSelectHistoryBooking, selectedHistoryBookingId])

  return (
    <>
      <View style={styles.bookingHistoryToolbar}>
        <View>
          <Text style={styles.bookingSectionLabel}>Active and Past Bookings</Text>
          <Text style={styles.bookingHistoryToolbarText}>
            See confirmation, payment, and workshop progress in one place.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bookingDiscoveryRefreshButton}
          onPress={onRefreshHistory}
          activeOpacity={history.status === 'loading' ? 1 : 0.86}
          disabled={history.status === 'loading'}
          accessibilityRole="button"
          accessibilityLabel="Refresh booking history"
          accessibilityState={{
            disabled: history.status === 'loading',
            busy: history.status === 'loading',
          }}
        >
          {history.status === 'loading' ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {historyView === 'loading' ? (
        <BookingDiscoveryStatePanel
          icon="timer-sand"
          title="Loading active services"
          message="Fetching your booking activity."
          isLoading
        />
      ) : historyView === 'unauthorized' ? (
        <BookingDiscoveryStatePanel
          icon="lock-outline"
          title="Sign in again"
          message={history.errorMessage || 'Sign in again to load booking history.'}
          actionLabel="Retry"
          onAction={onRefreshHistory}
        />
      ) : historyView === 'error' ? (
        <BookingDiscoveryStatePanel
          icon="alert-circle-outline"
          title="History unavailable"
          message={history.errorMessage || 'Unable to load booking history right now.'}
          actionLabel="Retry"
          onAction={onRefreshHistory}
        />
      ) : historyView === 'ready' ? (
        <>
          <View style={styles.bookingVehicleSearchWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedText} />
            <TextInput
              accessibilityLabel="Search booking history"
              nativeID="booking-history-search"
              onChangeText={(value) => {
                setHistorySearch(value)
                setHistoryPage(0)
              }}
              placeholder="Search booking, vehicle, or status"
              placeholderTextColor={colors.mutedText}
              style={styles.bookingVehicleSearchInput}
              value={historySearch}
            />
          </View>
          <View
            style={[styles.bookingPagerRow, isCompactPhone && styles.bookingPagerRowCompact]}
          >
            <Text style={styles.bookingPagerText}>
              {historyListPage.totalMatches
                ? `Showing ${historyListPage.firstVisibleNumber}-${historyListPage.lastVisibleNumber} of ${historyListPage.totalMatches}`
                : 'No matching bookings'}
            </Text>
            <View
              style={[
                styles.bookingPagerActions,
                isCompactPhone && styles.bookingPagerActionsCompact,
              ]}
            >
              <TouchableOpacity
                accessibilityLabel="Previous booking history page"
                accessibilityRole="button"
                accessibilityState={{ disabled: !historyListPage.hasPreviousPage }}
                activeOpacity={historyListPage.hasPreviousPage ? 0.86 : 1}
                disabled={!historyListPage.hasPreviousPage}
                onPress={() => setHistoryPage(historyListPage.currentPage - 1)}
                style={[
                  styles.bookingPagerButton,
                  !historyListPage.hasPreviousPage && styles.bookingPagerButtonDisabled,
                ]}
              >
                <MaterialCommunityIcons name="chevron-left" size={18} color={colors.text} />
                <Text style={styles.bookingPagerButtonText}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Next booking history page"
                accessibilityRole="button"
                accessibilityState={{ disabled: !historyListPage.hasNextPage }}
                activeOpacity={historyListPage.hasNextPage ? 0.86 : 1}
                disabled={!historyListPage.hasNextPage}
                onPress={() => setHistoryPage(historyListPage.currentPage + 1)}
                style={[
                  styles.bookingPagerButton,
                  !historyListPage.hasNextPage && styles.bookingPagerButtonDisabled,
                ]}
              >
                <Text style={styles.bookingPagerButtonText}>Next</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          {historyListPage.totalMatches ? (
            <View style={styles.bookingHistoryList}>
              {historyListPage.items.map((booking) => (
                <BookingHistoryCard
                  key={booking.id}
                  booking={booking}
                  vehicles={vehicles}
                  isSelected={selectedHistoryBookingId === booking.id}
                  onPress={() => onSelectHistoryBooking(booking.id)}
                />
              ))}
            </View>
          ) : (
            <BookingDiscoveryStatePanel
              icon="calendar-search"
              title="No matching bookings"
              message="Check the booking reference, vehicle, service, or status and try again."
            />
          )}
        </>
      ) : (
        <BookingDiscoveryStatePanel
          icon="calendar-blank-outline"
          title="No bookings yet"
          message="Your active bookings and completed appointment records will appear here."
        />
      )}

      {detailState.status === 'loading' && selectedHistoryBookingId ? (
        <BookingDiscoveryStatePanel
          icon="timer-sand"
          title="Refreshing booking detail"
          message="Loading the selected booking detail."
          isLoading
        />
      ) : null}

      {detailState.status === 'unauthorized' || detailState.status === 'error' ? (
        <BookingDiscoveryStatePanel
          icon="alert-circle-outline"
          title={detailState.status === 'unauthorized' ? 'Sign in again' : 'Detail unavailable'}
          message={detailState.errorMessage || 'Unable to load selected booking detail right now.'}
        />
      ) : null}

      {selectedBooking ? (
        <>
          <View style={styles.trackingSummaryCard}>
            <View style={styles.trackingSummaryHeader}>
              <Text style={styles.trackingReferenceText}>
                Booking #{getBookingReference(selectedBooking)}
              </Text>
              <View style={[styles.trackingStatusPill, styles.trackingStatusPillActive]}>
                <Text style={styles.trackingStatusPillText}>
                  {getBookingStatusLabel(selectedBooking.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.trackingSummaryTitle}>
              {getBookingServiceHeadline(selectedBooking)}
            </Text>
            <View style={styles.trackingRequestedServicesSection}>
              <Text style={styles.bookingSectionLabel}>Requested services</Text>
              <BookingRequestedServiceChips booking={selectedBooking} />
            </View>

            <View style={styles.trackingMetaGrid}>
              <View
                style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}
              >
                <Text style={styles.trackingMetaLabel}>Vehicle</Text>
                <Text style={styles.trackingMetaValue}>
                  {getBookingVehicleLabel(selectedBooking, vehicles)}
                </Text>
              </View>
              <View
                style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}
              >
                <Text style={styles.trackingMetaLabel}>Date</Text>
                <Text style={styles.trackingMetaValue}>
                  {formatBookingDateLabel(selectedBooking.scheduledDate)}
                </Text>
              </View>
              <View
                style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}
              >
                <Text style={styles.trackingMetaLabel}>Time</Text>
                <Text style={styles.trackingMetaValue}>
                  {getBookingTimeLabel(selectedBooking)}
                </Text>
              </View>
              <View
                style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}
              >
                <Text style={styles.trackingMetaLabel}>Status</Text>
                <Text style={styles.trackingMetaValue}>
                  {getBookingStatusLabel(selectedBooking.status)}
                </Text>
              </View>
              <View style={styles.trackingMetaItemWide}>
                <Text style={styles.trackingMetaLabel}>Notes</Text>
                <Text style={styles.trackingMetaValue}>
                  {selectedBooking.notes || 'No notes submitted.'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.trackingProgressCard}>
            <Text style={styles.bookingSectionLabel}>Booking Progress</Text>
            {trackingSteps.map((step, index) => (
              <TrackingStep
                key={step.label}
                item={step}
                isLast={index === trackingSteps.length - 1}
              />
            ))}
          </View>

          {selectedReservationPayment || selectedBooking.status === 'pending_payment' ? (
            <View style={styles.bookingStatusHistoryCard}>
              <Text style={styles.bookingSectionLabel}>Reservation Fee</Text>
              <View style={styles.trackingMetaGrid}>
                <View
                  style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}
                >
                  <Text style={styles.trackingMetaLabel}>Status</Text>
                  <Text style={styles.trackingMetaValue}>
                    {getReservationPaymentStatusLabel(selectedReservationPayment)}
                  </Text>
                </View>
                <View
                  style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}
                >
                  <Text style={styles.trackingMetaLabel}>Amount</Text>
                  <Text style={styles.trackingMetaValue}>
                    {selectedReservationPayment?.amountCents !== undefined &&
                    selectedReservationPayment?.amountCents !== null
                      ? formatBookingServiceCurrency(selectedReservationPayment.amountCents)
                      : 'Awaiting payment setup'}
                  </Text>
                </View>
                <View
                  style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}
                >
                  <Text style={styles.trackingMetaLabel}>Reference</Text>
                  <Text style={styles.trackingMetaValue}>
                    {selectedReservationPayment?.referenceNumber ||
                      'Generated after payment confirmation'}
                  </Text>
                </View>
                <View
                  style={[styles.trackingMetaItem, isCompactPhone && styles.trackingMetaItemWide]}
                >
                  <Text style={styles.trackingMetaLabel}>Pay By</Text>
                  <Text style={styles.trackingMetaValue}>
                    {selectedReservationPayment?.expiresAt
                      ? formatBookingDateTimeLabel(selectedReservationPayment.expiresAt)
                      : 'No expiry recorded'}
                  </Text>
                </View>
              </View>

              {selectedReservationPayment?.failureReason ? (
                <Text style={styles.bookingReservationPaymentWarning}>
                  {selectedReservationPayment.failureReason}
                </Text>
              ) : selectedBooking.status === 'pending_payment' ? (
                <Text style={styles.bookingReservationPaymentHint}>
                  {formatReservationFeeUrgency(selectedReservationPayment?.expiresAt)}
                </Text>
              ) : selectedReservationPayment?.status === 'paid' ? (
                <Text style={styles.bookingReservationPaymentHint}>
                  The reservation fee is secured and will be deducted from the final service
                  invoice.
                </Text>
              ) : null}

              {reservationPaymentState.errorMessage ? (
                <Text style={styles.bookingReservationPaymentWarning} accessibilityRole="alert">
                  {reservationPaymentState.errorMessage}
                </Text>
              ) : null}

              {selectedBooking.status === 'pending_payment' ? (
                <View style={styles.bookingReservationPaymentActions}>
                  <TouchableOpacity
                    style={[styles.primaryButton, isPaymentLoading && styles.primaryButtonDisabled]}
                    onPress={onOpenReservationPayment}
                    disabled={isPaymentLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Pay reservation fee"
                    accessibilityState={{ disabled: isPaymentLoading, busy: isPaymentLoading }}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isPaymentLoading ? 'Opening Payment...' : 'Pay Reservation Fee'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onRetryReservationPayment}
                    disabled={isPaymentLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh reservation payment link"
                    accessibilityState={{ disabled: isPaymentLoading, busy: isPaymentLoading }}
                  >
                    <Text style={styles.secondaryButtonText}>Refresh Payment Link</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          {selectedBooking.statusHistory?.length ? (
            <View style={styles.bookingStatusHistoryCard}>
              <Text style={styles.bookingSectionLabel}>Recorded Status Changes</Text>
              {selectedBooking.statusHistory.slice(0, 4).map((historyItem) => (
                <View key={historyItem.id} style={styles.bookingStatusHistoryRow}>
                  <Text style={styles.bookingStatusHistoryTitle}>
                    {getBookingStatusLabel(historyItem.nextStatus)}
                  </Text>
                  <Text style={styles.bookingStatusHistoryMeta}>
                    {historyItem.reason || 'No reason provided'} -{' '}
                    {formatBookingDateTimeLabel(historyItem.changedAt)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </>
  )
}
