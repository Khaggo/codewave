const BOOKING_MODES = new Set(['book', 'track'])

export const isBookableService = (service) => Boolean(service?.isActive)

export const isBookableTimeSlot = (timeSlot) => Boolean(timeSlot?.isActive)

export function normalizeBookingWorkspaceMode(value) {
  return BOOKING_MODES.has(value) ? value : 'book'
}

export function getBookingDiscoveryStateKey(bookingDiscovery = {}) {
  const status = bookingDiscovery.status ?? 'idle'
  const vehicles = Array.isArray(bookingDiscovery.vehicles) ? bookingDiscovery.vehicles : []
  const services = Array.isArray(bookingDiscovery.services) ? bookingDiscovery.services : []
  const timeSlots = Array.isArray(bookingDiscovery.timeSlots) ? bookingDiscovery.timeSlots : []

  if (status === 'idle' || status === 'loading') {
    return status
  }

  if (status === 'unauthorized' || status === 'error') {
    return status
  }

  if (!vehicles.length) {
    return 'empty-vehicles'
  }

  if (!services.some(isBookableService)) {
    return 'empty-services'
  }

  if (!timeSlots.some(isBookableTimeSlot)) {
    return 'unavailable-slots'
  }

  return 'ready'
}

export function canSubmitBooking({
  discoveryStateKey,
  selectedVehicle,
  selectedServices = [],
  selectedTimeSlot,
  selectedDateKey,
  selectedSlotAvailability,
  selectedDay,
  createStatus,
} = {}) {
  const hasAvailableDate = selectedSlotAvailability
    ? Boolean(selectedSlotAvailability.isAvailable)
    : Boolean(selectedDay?.isBookable)

  return Boolean(
    discoveryStateKey === 'ready' &&
      selectedVehicle &&
      selectedServices.some(isBookableService) &&
      selectedTimeSlot?.isActive &&
      selectedDateKey &&
      hasAvailableDate &&
      createStatus !== 'submitting',
  )
}

export function getBookingCreateStatusPresentation(status) {
  if (!status || status === 'idle') {
    return null
  }

  if (status === 'success') {
    return {
      icon: 'check-circle-outline',
      title: 'Booking request sent',
      isLoading: false,
      actionLabel: null,
    }
  }

  if (status === 'conflict') {
    return {
      icon: 'calendar-alert',
      title: 'Slot conflict',
      isLoading: false,
      actionLabel: 'Refresh Options',
    }
  }

  if (status === 'submitting') {
    return {
      icon: 'timer-sand',
      title: 'Sending Request',
      isLoading: true,
      actionLabel: null,
    }
  }

  if (status === 'unauthorized') {
    return {
      icon: 'alert-circle-outline',
      title: 'Sign in again',
      isLoading: false,
      actionLabel: null,
    }
  }

  return {
    icon: 'alert-circle-outline',
    title: 'Booking request needs attention',
    isLoading: false,
    actionLabel: null,
  }
}

export function getBookingSubmitLabel(status, isReady) {
  if (status === 'submitting') {
    return 'Sending...'
  }

  return isReady ? 'Book Appointment' : 'Complete all steps to book'
}

export function getBookingHistoryView({ status = 'idle', bookings = [] } = {}) {
  const hasBookings = Array.isArray(bookings) && bookings.length > 0

  if (status === 'loading' && !hasBookings) {
    return 'loading'
  }

  if (status === 'unauthorized') {
    return 'unauthorized'
  }

  if (status === 'error') {
    return 'error'
  }

  return hasBookings ? 'ready' : 'empty'
}
