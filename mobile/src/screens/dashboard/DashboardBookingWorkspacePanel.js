import { Text, View } from 'react-native'

import {
  buildOwnedVehicleLabel,
  formatBookingServiceCurrency,
  formatBookingServiceDuration,
  formatBookingTimeSlotWindow,
} from '../../lib/bookingDiscoveryClient'
import {
  buildBookingDateCardItem,
  getBookingAvailabilityDayByDate,
  getBookingAvailabilitySlotForTime,
  parseDateOnly,
} from './bookingAvailabilityModel.mjs'
import { getSelectedBookingServices } from './bookingSelectionModel.mjs'
import { BookingModeTab } from './BookingPresentationComponents'
import {
  canSubmitBooking,
  getBookingDiscoveryStateKey,
  normalizeBookingWorkspaceMode,
} from './bookingWorkspacePresentationModel.mjs'
import DashboardBookingCreatePanel from './DashboardBookingCreatePanel'
import DashboardBookingTrackingPanel from './DashboardBookingTrackingPanel'
import DashboardScrollRegion from './DashboardScrollRegion'
import styles from './dashboardStyles'

export default function DashboardBookingWorkspacePanel({
  isWeb,
  isCompactPhone,
  isVeryCompactPhone,
  mode,
  discovery,
  selectedServiceIds,
  selectedVehicleId,
  selectedTimeKey,
  selectedDateKey,
  dateCardStyle,
  notes,
  createState,
  history,
  selectedHistoryBookingId,
  detailState,
  reservationPaymentState,
  onChangeMode,
  onRefreshDiscovery,
  onToggleService,
  onSelectVehicle,
  onSelectTime,
  onShiftAvailabilityWindow,
  onRetryAvailability,
  onSelectDate,
  onChangeDate,
  onChangeNotes,
  onRefreshConflict,
  onSubmit,
  onRefreshHistory,
  onSelectHistoryBooking,
  onOpenReservationPayment,
  onRetryReservationPayment,
}) {
  const normalizedMode = normalizeBookingWorkspaceMode(mode)
  const safeDiscovery = {
    ...(discovery && typeof discovery === 'object' ? discovery : {}),
    services: Array.isArray(discovery?.services) ? discovery.services : [],
    timeSlots: Array.isArray(discovery?.timeSlots) ? discovery.timeSlots : [],
    vehicles: Array.isArray(discovery?.vehicles) ? discovery.vehicles : [],
    availability: {
      ...(discovery?.availability && typeof discovery.availability === 'object'
        ? discovery.availability
        : {}),
      days: Array.isArray(discovery?.availability?.days) ? discovery.availability.days : [],
    },
  }
  const safeCreateState = createState && typeof createState === 'object' ? createState : { status: 'idle' }
  const safeHistory = history && typeof history === 'object' ? history : {}
  const discoveryStateKey = getBookingDiscoveryStateKey(safeDiscovery)
  const selectedVehicle = safeDiscovery.vehicles.find((vehicle) => vehicle.id === selectedVehicleId)
  const selectedServices = getSelectedBookingServices(safeDiscovery.services, selectedServiceIds, {
    activeOnly: false,
  })
  const selectedTimeSlot = safeDiscovery.timeSlots.find((timeSlot) => timeSlot.id === selectedTimeKey)
  const availability = safeDiscovery.availability
  const selectedDay = getBookingAvailabilityDayByDate(availability, selectedDateKey)
  const selectedSlotAvailability = getBookingAvailabilitySlotForTime(
    selectedDay,
    selectedTimeSlot?.id,
  )
  const minimumDate = parseDateOnly(availability.minBookableDate)
  const maximumDate = parseDateOnly(availability.maxBookableDate)
  const selectedDateValue =
    parseDateOnly(selectedDateKey) ||
    minimumDate ||
    parseDateOnly(availability.startDate) ||
    new Date()
  const vehicleOptions = safeDiscovery.vehicles.map((vehicle) => ({
    id: vehicle.id,
    title: buildOwnedVehicleLabel(vehicle),
    subtitle: `${vehicle.make} ${vehicle.model} - ${vehicle.year}`,
    plateNumber: vehicle.plateNumber,
  }))
  const allServiceOptions = safeDiscovery.services.map((service) => ({
    key: service.id,
    icon: 'wrench-outline',
    title: service.name,
    subtitle:
      service.description || 'No service description has been published for this offering yet.',
    enabled: service.isActive,
    badgeLabel: service.isActive ? null : 'Inactive',
    metaLabel: [
      service.categoryId ? 'Categorized' : null,
      formatBookingServiceCurrency(service.basePriceCents),
    ]
      .filter(Boolean)
      .join(' - '),
    durationLabel: formatBookingServiceDuration(service.durationMinutes),
  }))
  const timeSlotOptions = safeDiscovery.timeSlots.map((timeSlot) => ({
    key: timeSlot.id,
    label: timeSlot.label,
    timeRangeLabel: formatBookingTimeSlotWindow(timeSlot),
    capacityLabel: `Capacity ${timeSlot.capacity}`,
    available: timeSlot.isActive,
    reason: timeSlot.isActive ? null : 'Unavailable',
  }))
  const dateOptions = availability.days.map((day) =>
    buildBookingDateCardItem(day, selectedTimeSlot),
  )
  const hasPreviousWindow =
    availability.status === 'ready' &&
    Boolean(availability.startDate) &&
    Boolean(availability.minBookableDate) &&
    availability.startDate > availability.minBookableDate
  const hasNextWindow =
    availability.status === 'ready' &&
    Boolean(availability.endDate) &&
    Boolean(availability.maxBookableDate) &&
    availability.endDate < availability.maxBookableDate
  const isReady = canSubmitBooking({
    discoveryStateKey,
    selectedVehicle,
    selectedServices,
    selectedTimeSlot,
    selectedDateKey,
    selectedSlotAvailability,
    selectedDay,
    createStatus: safeCreateState.status,
  })

  return (
    <DashboardScrollRegion
      contentStyle={styles.bookingScrollContent}
      isWeb={isWeb}
      isVeryCompactPhone={isVeryCompactPhone}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingEyebrow}>SERVICE CENTER</Text>
        <Text style={styles.bookingTitle}>Service Booking</Text>
      </View>

      <View style={styles.bookingModeWrap}>
        <BookingModeTab
          label="New Booking"
          isActive={normalizedMode === 'book'}
          onPress={() => onChangeMode('book')}
        />
        <BookingModeTab
          label="My Bookings"
          isActive={normalizedMode === 'track'}
          onPress={() => onChangeMode('track')}
        />
      </View>

      {normalizedMode === 'book' ? (
        <DashboardBookingCreatePanel
          isCompactPhone={isCompactPhone}
          discovery={safeDiscovery}
          discoveryStateKey={discoveryStateKey}
          serviceOptions={allServiceOptions}
          selectedServiceIds={selectedServiceIds}
          vehicleOptions={vehicleOptions}
          selectedVehicleId={selectedVehicleId}
          timeSlotOptions={timeSlotOptions}
          selectedTimeKey={selectedTimeKey}
          scheduleProps={{
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
            onShiftWindow: onShiftAvailabilityWindow,
            onRetryAvailability,
            onSelectDate,
            onChangeDate,
          }}
          selectedVehicle={selectedVehicle}
          selectedServices={selectedServices}
          selectedTimeSlot={selectedTimeSlot}
          selectedDateKey={selectedDateKey}
          notes={notes}
          createState={safeCreateState}
          isReady={isReady}
          onRefreshDiscovery={onRefreshDiscovery}
          onToggleService={onToggleService}
          onSelectVehicle={onSelectVehicle}
          onSelectTime={onSelectTime}
          onChangeNotes={onChangeNotes}
          onRefreshConflict={onRefreshConflict}
          onSubmit={onSubmit}
        />
      ) : (
        <DashboardBookingTrackingPanel
          isCompactPhone={isCompactPhone}
          history={safeHistory}
          vehicles={safeDiscovery.vehicles}
          selectedHistoryBookingId={selectedHistoryBookingId}
          detailState={detailState}
          reservationPaymentState={reservationPaymentState}
          onRefreshHistory={onRefreshHistory}
          onSelectHistoryBooking={onSelectHistoryBooking}
          onOpenReservationPayment={onOpenReservationPayment}
          onRetryReservationPayment={onRetryReservationPayment}
        />
      )}
    </DashboardScrollRegion>
  )
}
