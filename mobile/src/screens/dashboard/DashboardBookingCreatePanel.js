import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { buildOwnedVehicleLabel, formatBookingTimeSlotWindow } from '../../lib/bookingDiscoveryClient'
import { colors } from '../../theme'
import { formatBookingDateLabel } from './bookingAvailabilityModel.mjs'
import {
  BookingDiscoveryStatePanel,
  BookingServiceCard,
  BookingTimeSlot,
  BookingVehicleCard,
} from './BookingPresentationComponents'
import {
  getBookingCreateStatusPresentation,
  getBookingSubmitLabel,
} from './bookingWorkspacePresentationModel.mjs'
import {
  buildBookingVehiclePickerPage,
  getBookingVehiclePageForSelection,
} from './bookingVehiclePickerModel.mjs'
import DashboardBookingSchedulePanel from './DashboardBookingSchedulePanel'
import styles from './dashboardStyles'

const bookingSteps = [
  { key: 'services', label: 'Services' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'review', label: 'Review' },
]

function BookingStepRail({ activeStep, allowedStepIndex, onSelectStep }) {
  const activeIndex = bookingSteps.findIndex((step) => step.key === activeStep)

  return (
    <View style={styles.bookingStepRail} accessibilityRole="tablist">
      {bookingSteps.map((step, index) => {
        const active = step.key === activeStep
        const complete = index < activeIndex
        const disabled = index > allowedStepIndex
        return (
          <TouchableOpacity
            key={step.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled }}
            accessibilityLabel={`Booking step ${index + 1}, ${step.label}`}
            disabled={disabled}
            onPress={() => onSelectStep(step.key)}
            style={[
              styles.bookingStepItem,
              active && styles.bookingStepItemActive,
              disabled && styles.bookingStepItemDisabled,
            ]}
          >
            <Text style={[styles.bookingStepNumber, (active || complete) && styles.bookingStepNumberActive]}>
              {complete ? 'OK' : index + 1}
            </Text>
            <Text style={[styles.bookingStepLabel, active && styles.bookingStepLabelActive]}>{step.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function BookingStepActions({ backLabel, onBack, onContinue, continueDisabled = false }) {
  return (
    <View style={styles.bookingStepActions}>
      {onBack ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={backLabel || 'Previous booking step'}
          onPress={onBack}
          style={styles.bookingStepBackButton}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={colors.text} />
          <Text style={styles.bookingStepBackText}>{backLabel || 'Back'}</Text>
        </TouchableOpacity>
      ) : <View />}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Continue to next booking step"
        accessibilityState={{ disabled: continueDisabled }}
        disabled={continueDisabled}
        onPress={onContinue}
        style={[styles.bookingStepContinueButton, continueDisabled && styles.bookingStepContinueButtonDisabled]}
      >
        <Text style={styles.bookingStepContinueText}>Continue</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  )
}

export default function DashboardBookingCreatePanel({
  isCompactPhone,
  discovery,
  discoveryStateKey,
  serviceOptions,
  selectedServiceIds,
  vehicleOptions,
  selectedVehicleId,
  timeSlotOptions,
  selectedTimeKey,
  scheduleProps,
  selectedVehicle,
  selectedServices,
  selectedTimeSlot,
  selectedDateKey,
  notes,
  createState,
  isReady,
  onRefreshDiscovery,
  onToggleService,
  onSelectVehicle,
  onSelectTime,
  onChangeNotes,
  onRefreshConflict,
  onSubmit,
}) {
  const createStatusView = getBookingCreateStatusPresentation(createState.status)
  const isDiscoveryLoading = discovery.status === 'loading'
  const hasBookableServices = serviceOptions.some((service) => service.enabled)
  const hasBookableTimeSlots = timeSlotOptions.some((slot) => slot.available)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')
  const [vehiclePage, setVehiclePage] = useState(0)
  const [activeStep, setActiveStep] = useState('services')
  const allowedStepIndex = !selectedServiceIds.length
    ? 0
    : !selectedVehicleId
      ? 1
      : !selectedTimeKey || !selectedDateKey
        ? 2
        : 3
  const filteredServiceOptions = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase()
    if (!query) {
      return serviceOptions
    }

    return serviceOptions.filter((service) =>
      [service.title, service.subtitle, service.metaLabel]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [serviceOptions, serviceSearch])
  const vehiclePickerPage = useMemo(
    () => buildBookingVehiclePickerPage({
      vehicles: vehicleOptions,
      search: vehicleSearch,
      page: vehiclePage,
    }),
    [vehicleOptions, vehiclePage, vehicleSearch],
  )

  useEffect(() => {
    if (vehicleSearch.trim()) {
      setVehiclePage(0)
      return
    }

    setVehiclePage(getBookingVehiclePageForSelection(vehicleOptions, selectedVehicleId))
  }, [selectedVehicleId, vehicleOptions, vehicleSearch])

  useEffect(() => {
    const currentStepIndex = bookingSteps.findIndex((step) => step.key === activeStep)
    if (currentStepIndex > allowedStepIndex) {
      setActiveStep(bookingSteps[allowedStepIndex].key)
    }
  }, [activeStep, allowedStepIndex])

  return (
    <>
      <View
        style={[
          styles.bookingDiscoveryBanner,
          isCompactPhone && styles.bookingDiscoveryBannerCompact,
        ]}
      >
        <BookingStepRail
          activeStep={activeStep}
          allowedStepIndex={allowedStepIndex}
          onSelectStep={setActiveStep}
        />

        <TouchableOpacity
          style={styles.bookingDiscoveryRefreshButton}
          onPress={onRefreshDiscovery}
          activeOpacity={isDiscoveryLoading ? 1 : 0.86}
          disabled={isDiscoveryLoading}
          accessibilityRole="button"
          accessibilityLabel="Refresh booking options"
          accessibilityState={{ disabled: isDiscoveryLoading, busy: isDiscoveryLoading }}
        >
          {isDiscoveryLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {discoveryStateKey === 'loading' ? (
        <BookingDiscoveryStatePanel
          icon="timer-sand"
          title="Loading booking discovery"
          message="Fetching services, time slots, eligible vehicles, and the current booking window."
          isLoading
        />
      ) : discoveryStateKey === 'unauthorized' ? (
        <BookingDiscoveryStatePanel
          icon="lock-outline"
          title="Sign in again to keep booking"
          message={
            discovery.errorMessage ||
            'Sign in again so we can load your vehicles, services, and live schedule options.'
          }
          actionLabel="Retry"
          onAction={onRefreshDiscovery}
        />
      ) : discoveryStateKey === 'error' ? (
        <BookingDiscoveryStatePanel
          icon="alert-circle-outline"
          title="Booking discovery is unavailable"
          message={discovery.errorMessage || 'We could not refresh the booking options right now.'}
          actionLabel="Retry"
          onAction={onRefreshDiscovery}
        />
      ) : (
        <>
          {activeStep === 'services' ? (
            <>
          <Text style={styles.bookingSectionLabel}>Step 1: Choose Services</Text>
          <Text style={styles.bookingDateHint}>
            Choose one or more services for the same appointment. Your selections stay highlighted
            while you move through the flow.
          </Text>
          <View style={styles.bookingVehicleSearchWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedText} />
            <TextInput
              accessibilityLabel="Search services"
              onChangeText={setServiceSearch}
              placeholder="Search services"
              placeholderTextColor={colors.mutedText}
              style={styles.bookingVehicleSearchInput}
              value={serviceSearch}
            />
          </View>
          <Text style={styles.bookingPagerText} accessibilityLiveRegion="polite">
            {selectedServiceIds.length} selected · {filteredServiceOptions.length} shown
          </Text>

          {!hasBookableServices ? (
            <BookingDiscoveryStatePanel
              icon="wrench-clock"
              title="No services are available right now"
              message="There are no customer-bookable services available right now."
            />
          ) : null}
          {filteredServiceOptions.map((service) => (
            <BookingServiceCard
              key={service.key}
              item={service}
              isSelected={selectedServiceIds.includes(service.key)}
              isCompact={isCompactPhone}
              onPress={() => onToggleService(service.key)}
            />
          ))}
          {hasBookableServices && filteredServiceOptions.length === 0 ? (
            <BookingDiscoveryStatePanel
              icon="magnify-close"
              title="No matching services"
              message="Try a different service name or description."
            />
          ) : null}

          <BookingStepActions
            continueDisabled={selectedServiceIds.length === 0}
            onContinue={() => setActiveStep('vehicle')}
          />
            </>
          ) : null}

          {activeStep === 'vehicle' ? (
            <>
          <Text style={styles.bookingSectionLabel}>Step 2: Select Vehicle</Text>
          <Text style={styles.bookingDateHint}>
            Pick the vehicle for this appointment. The booking starts with the service you need
            first.
          </Text>
          {vehicleOptions.length ? (
            <>
              <View style={styles.bookingVehicleSearchWrap}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedText} />
                <TextInput
                  accessibilityLabel="Search your vehicles"
                  autoCapitalize="characters"
                  onChangeText={setVehicleSearch}
                  placeholder="Search vehicle or plate"
                  placeholderTextColor={colors.mutedText}
                  style={styles.bookingVehicleSearchInput}
                  value={vehicleSearch}
                />
              </View>
              <View
                style={[styles.bookingPagerRow, isCompactPhone && styles.bookingPagerRowCompact]}
              >
                <Text style={styles.bookingPagerText}>
                  {vehiclePickerPage.totalMatches
                    ? `Showing ${vehiclePickerPage.firstVisibleNumber}-${vehiclePickerPage.lastVisibleNumber} of ${vehiclePickerPage.totalMatches}`
                    : 'No matching vehicles'}
                </Text>
                <View
                  style={[
                    styles.bookingPagerActions,
                    isCompactPhone && styles.bookingPagerActionsCompact,
                  ]}
                >
                  <TouchableOpacity
                    accessibilityLabel="Previous vehicles page"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !vehiclePickerPage.hasPreviousPage }}
                    activeOpacity={vehiclePickerPage.hasPreviousPage ? 0.86 : 1}
                    disabled={!vehiclePickerPage.hasPreviousPage}
                    onPress={() => setVehiclePage((current) => Math.max(0, current - 1))}
                    style={[
                      styles.bookingPagerButton,
                      !vehiclePickerPage.hasPreviousPage && styles.bookingPagerButtonDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={18} color={colors.text} />
                    <Text style={styles.bookingPagerButtonText}>Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Next vehicles page"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !vehiclePickerPage.hasNextPage }}
                    activeOpacity={vehiclePickerPage.hasNextPage ? 0.86 : 1}
                    disabled={!vehiclePickerPage.hasNextPage}
                    onPress={() => setVehiclePage((current) => current + 1)}
                    style={[
                      styles.bookingPagerButton,
                      !vehiclePickerPage.hasNextPage && styles.bookingPagerButtonDisabled,
                    ]}
                  >
                    <Text style={styles.bookingPagerButtonText}>Next</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              {vehiclePickerPage.items.map((vehicle) => (
                <BookingVehicleCard
                  key={vehicle.id}
                  item={vehicle}
                  isSelected={selectedVehicleId === vehicle.id}
                  isCompact={isCompactPhone}
                  onPress={() => onSelectVehicle(vehicle.id)}
                />
              ))}
              {!vehiclePickerPage.totalMatches ? (
                <BookingDiscoveryStatePanel
                  icon="car-search"
                  title="No matching vehicles"
                  message="Check the plate number or vehicle name and try again."
                />
              ) : null}
            </>
          ) : (
            <BookingDiscoveryStatePanel
              icon="car-off"
              title="No eligible vehicles found"
              message="Add a vehicle to your AUTOCARE account before continuing with this booking."
            />
          )}

          <BookingStepActions
            backLabel="Services"
            onBack={() => setActiveStep('services')}
            continueDisabled={!selectedVehicleId}
            onContinue={() => setActiveStep('schedule')}
          />
            </>
          ) : null}

          {activeStep === 'schedule' ? (
            <>
          <Text style={styles.bookingSectionLabel}>Step 3: Pick a Schedule</Text>
          <Text style={styles.bookingDateHint}>
            Pick a shop time first, then choose a live date. Reservation payment is requested only
            after you submit the booking.
          </Text>
          <Text style={styles.bookingSectionLabel}>Choose Time</Text>
          {!hasBookableTimeSlots ? (
            <BookingDiscoveryStatePanel
              icon="calendar-remove-outline"
              title="No bookable time slots are open"
              message="No active shop windows are open for customer booking right now."
            />
          ) : null}
          {timeSlotOptions.length ? (
            <View style={styles.bookingTimeGrid}>
              {timeSlotOptions.map((slot) => (
                <BookingTimeSlot
                  key={slot.key}
                  item={slot}
                  isSelected={selectedTimeKey === slot.key}
                  isCompact={isCompactPhone}
                  onPress={() => onSelectTime(slot.key)}
                />
              ))}
            </View>
          ) : (
            <BookingDiscoveryStatePanel
              icon="clock-remove-outline"
              title="No slot definitions returned"
              message="Time slots will appear here once they are available."
            />
          )}

          <DashboardBookingSchedulePanel {...scheduleProps} />

          <Text style={styles.bookingSectionLabel}>Special Notes</Text>
          <View style={styles.bookingNotesCard}>
            <TextInput
              value={notes}
              onChangeText={onChangeNotes}
              placeholder="Optional notes for the service team..."
              placeholderTextColor={colors.mutedText}
              multiline
              textAlignVertical="top"
              style={styles.bookingNotesInput}
              selectionColor={colors.primary}
              accessibilityLabel="Special notes for the service team"
            />
          </View>

          <BookingStepActions
            backLabel="Vehicle"
            onBack={() => setActiveStep('vehicle')}
            continueDisabled={!selectedTimeKey || !selectedDateKey}
            onContinue={() => setActiveStep('review')}
          />
            </>
          ) : null}

          {activeStep === 'review' ? (
            <>
          <View style={styles.bookingSummaryCard}>
            <Text style={styles.bookingSummaryTitle}>Step 4: Review Booking</Text>
            <View style={styles.bookingSummaryRow}>
              <Text style={styles.bookingSummaryLabel}>Vehicle</Text>
              <Text style={styles.bookingSummaryValue}>
                {selectedVehicle
                  ? buildOwnedVehicleLabel(selectedVehicle)
                  : 'Choose an owned vehicle'}
              </Text>
            </View>
            <View style={styles.bookingSummaryRow}>
              <Text style={styles.bookingSummaryLabel}>Services</Text>
              <Text style={styles.bookingSummaryValue}>
                {selectedServices.length
                  ? selectedServices.map((service) => service.name).join(', ')
                  : 'Choose one or more services'}
              </Text>
            </View>
            <View style={styles.bookingSummaryRow}>
              <Text style={styles.bookingSummaryLabel}>Slot</Text>
              <Text style={styles.bookingSummaryValue}>
                {selectedTimeSlot
                  ? `${selectedTimeSlot.label} - ${formatBookingTimeSlotWindow(selectedTimeSlot)}`
                  : 'Choose a live slot'}
              </Text>
            </View>
            <View style={styles.bookingSummaryRow}>
              <Text style={styles.bookingSummaryLabel}>Date</Text>
              <Text style={styles.bookingSummaryValue}>
                {selectedDateKey ? formatBookingDateLabel(selectedDateKey) : 'Choose a date'}
              </Text>
            </View>
            <Text style={styles.bookingSummaryNote}>
              Staff will review the requested schedule after submission. A reservation fee is
              requested only when needed to secure the slot.
            </Text>
            <View style={styles.bookingReviewEditActions}>
              {[
                ['services', 'Edit services'],
                ['vehicle', 'Edit vehicle'],
                ['schedule', 'Edit schedule'],
              ].map(([stepKey, label]) => (
                <TouchableOpacity
                  key={stepKey}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => setActiveStep(stepKey)}
                  style={styles.bookingReviewEditButton}
                >
                  <Text style={styles.bookingReviewEditText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {createStatusView ? (
            <BookingDiscoveryStatePanel
              icon={createStatusView.icon}
              title={createStatusView.title}
              message={createState.message}
              isLoading={createStatusView.isLoading}
              actionLabel={createStatusView.actionLabel ?? undefined}
              onAction={createStatusView.actionLabel ? onRefreshConflict : undefined}
            />
          ) : null}

          <TouchableOpacity
            style={[
              styles.bookingConfirmButton,
              !isReady && styles.bookingConfirmButtonDisabled,
            ]}
            onPress={isReady ? onSubmit : undefined}
            activeOpacity={isReady ? 0.88 : 1}
            disabled={!isReady}
            accessibilityRole="button"
            accessibilityLabel={getBookingSubmitLabel(createState.status, isReady)}
            accessibilityState={{
              disabled: !isReady,
              busy: createState.status === 'submitting',
            }}
          >
            <Text
              style={[
                styles.bookingConfirmButtonText,
                !isReady && styles.bookingConfirmButtonTextDisabled,
              ]}
            >
              {getBookingSubmitLabel(createState.status, isReady)}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={isReady ? colors.onPrimary : colors.mutedText}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to schedule"
            onPress={() => setActiveStep('schedule')}
            style={styles.bookingStepBackButton}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={colors.text} />
            <Text style={styles.bookingStepBackText}>Back to schedule</Text>
          </TouchableOpacity>
            </>
          ) : null}
        </>
      )}
    </>
  )
}
