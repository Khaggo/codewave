import {
  getBookingAvailabilityDayByDate,
  getBookingAvailabilitySlotForTime,
  getFirstBookableBookingDateKey,
} from './bookingAvailabilityModel.mjs'
import { getSelectedBookingServices } from './bookingSelectionModel.mjs'
import { isBookableTimeSlot } from './bookingWorkspacePresentationModel.mjs'

export const createInitialBookingAvailabilityState = () => ({
  status: 'idle',
  errorMessage: '',
  generatedAt: '',
  startDate: '',
  endDate: '',
  minBookableDate: '',
  maxBookableDate: '',
  vehicleId: null,
  days: [],
})

export const createInitialBookingDiscoveryState = () => ({
  status: 'idle',
  services: [],
  timeSlots: [],
  vehicles: [],
  availability: createInitialBookingAvailabilityState(),
  errorMessage: '',
})

export const createInitialBookingDraft = () => ({
  serviceIds: [],
  timeKey: null,
  vehicleId: null,
  dateKey: null,
  servicePage: 0,
  notes: '',
})

export const createInitialBookingCreateState = () => ({
  status: 'idle',
  message: '',
  booking: null,
})

export const normalizeBookingDraft = ({
  draft,
  discovery,
  servicePageSize,
}) => {
  const services = Array.isArray(discovery?.services) ? discovery.services : []
  const timeSlots = Array.isArray(discovery?.timeSlots) ? discovery.timeSlots : []
  const vehicles = Array.isArray(discovery?.vehicles) ? discovery.vehicles : []
  const availability = discovery?.availability ?? createInitialBookingAvailabilityState()
  const currentDraft = draft ?? createInitialBookingDraft()
  const canValidateDiscovery = discovery?.status === 'ready'
  const vehicleId = !canValidateDiscovery
    ? currentDraft.vehicleId
    : vehicles.some((vehicle) => vehicle.id === currentDraft.vehicleId)
      ? currentDraft.vehicleId
      : vehicles[0]?.id ?? null
  const serviceIds = !canValidateDiscovery
    ? currentDraft.serviceIds ?? []
    : (currentDraft.serviceIds ?? []).filter((serviceId) =>
        services.some((service) => service.id === serviceId && service.isActive),
      )
  const timeKey = !canValidateDiscovery
    ? currentDraft.timeKey
    : timeSlots.some(
          (timeSlot) => timeSlot.id === currentDraft.timeKey && timeSlot.isActive,
        )
      ? currentDraft.timeKey
      : timeSlots.find(isBookableTimeSlot)?.id ?? timeSlots[0]?.id ?? null
  const dateKey =
    availability.status === 'ready'
      ? currentDraft.dateKey &&
        getBookingAvailabilityDayByDate(availability, currentDraft.dateKey)
        ? currentDraft.dateKey
        : getFirstBookableBookingDateKey(availability, timeKey)
      : currentDraft.dateKey
  const normalizedPageSize = Math.max(1, Number(servicePageSize) || 1)
  const totalPages = Math.max(1, Math.ceil(services.length / normalizedPageSize))

  return {
    ...currentDraft,
    serviceIds,
    timeKey,
    vehicleId,
    dateKey,
    servicePage: canValidateDiscovery
      ? Math.min(
          Math.max(0, Number(currentDraft.servicePage) || 0),
          totalPages - 1,
        )
      : Math.max(0, Number(currentDraft.servicePage) || 0),
  }
}

export const areBookingDraftsEqual = (left, right) =>
  left?.timeKey === right?.timeKey &&
  left?.vehicleId === right?.vehicleId &&
  left?.dateKey === right?.dateKey &&
  left?.servicePage === right?.servicePage &&
  left?.notes === right?.notes &&
  (left?.serviceIds ?? []).length === (right?.serviceIds ?? []).length &&
  (left?.serviceIds ?? []).every(
    (serviceId, index) => serviceId === right?.serviceIds?.[index],
  )

export const resolveBookingSubmission = ({
  account,
  discovery,
  draft,
}) => {
  if (!account?.userId) {
    return {
      valid: false,
      state: {
        status: 'unauthorized',
        message: 'Sign in again before submitting a booking request.',
        booking: null,
      },
    }
  }

  const selectedVehicle = discovery?.vehicles?.find(
    (vehicle) => vehicle.id === draft?.vehicleId,
  )
  const selectedServices = getSelectedBookingServices(
    discovery?.services,
    draft?.serviceIds,
  )
  const selectedTimeSlot = discovery?.timeSlots?.find(
    (timeSlot) => timeSlot.id === draft?.timeKey,
  )
  const selectedAvailabilityDay = getBookingAvailabilityDayByDate(
    discovery?.availability,
    draft?.dateKey,
  )
  const selectedAvailabilitySlot = getBookingAvailabilitySlotForTime(
    selectedAvailabilityDay,
    selectedTimeSlot?.id,
  )
  const isSelectedDateAvailable = selectedAvailabilitySlot
    ? selectedAvailabilitySlot.isAvailable
    : Boolean(selectedAvailabilityDay?.isBookable)

  if (
    !selectedVehicle ||
    !selectedServices.length ||
    !selectedTimeSlot?.isActive ||
    !draft?.dateKey ||
    !isSelectedDateAvailable
  ) {
    return {
      valid: false,
      state: {
        status: 'validation-error',
        message:
          'Choose an owned vehicle, at least one active service, an active time slot, and a live available appointment date.',
        booking: null,
      },
    }
  }

  return {
    valid: true,
    selectedVehicle,
    selectedServices,
    selectedTimeSlot,
    scheduledDate: draft.dateKey,
    notes: String(draft.notes ?? '').trim() || undefined,
  }
}

export const getBookingSubmissionErrorState = ({
  statusCode,
  fallbackMessage,
}) => {
  if (statusCode === 400) {
    return {
      status: 'validation-error',
      message:
        'The booking request is missing or has invalid fields. Check the date and service selection.',
      booking: null,
    }
  }
  if (statusCode === 401 || statusCode === 403) {
    return {
      status: 'unauthorized',
      message: 'Your session could not submit this booking. Sign in again and retry.',
      booking: null,
    }
  }
  if (statusCode === 404) {
    return {
      status: 'not-found',
      message: 'The user, owned vehicle, service, or time slot could not be found.',
      booking: null,
    }
  }
  if (statusCode === 409) {
    return {
      status: 'conflict',
      message:
        'That slot is no longer available or another booking conflict exists. Refreshing live availability now.',
      booking: null,
    }
  }

  return {
    status: 'error',
    message: fallbackMessage || 'Unable to submit booking right now.',
    booking: null,
  }
}

export const getBookingSubmissionSuccessState = (booking) => ({
  status: 'success',
  message:
    booking?.status === 'pending_payment'
      ? 'Booking request sent. Complete the reservation fee to secure your schedule and unlock staff confirmation.'
      : 'Booking request sent. Staff will review the schedule next.',
  booking,
})
