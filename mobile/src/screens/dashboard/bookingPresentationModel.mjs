import {
  buildOwnedVehicleLabel,
  formatBookingTimeSlotWindow,
} from '../../lib/bookingDisplayModel.mjs'
import {
  getBookingReference,
  getBookingRequestedServiceNames,
} from './bookingSelectionModel.mjs'

export { getBookingReference }

const bookingStatusLabels = Object.freeze({
  pending: 'Pending staff review',
  pending_payment: 'Awaiting reservation payment',
  confirmed: 'Confirmed by staff',
  in_service: 'Vehicle in service',
  declined: 'Declined',
  rescheduled: 'Rescheduled by staff',
  completed: 'Completed',
  cancelled: 'Cancelled',
})

const reservationFeeFallback =
  'Complete the reservation fee soon to secure your appointment.'

export function formatReservationFeeUrgency(value, now = Date.now()) {
  if (!value) {
    return reservationFeeFallback
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return reservationFeeFallback
  }

  const diffMs = parsedDate.getTime() - Number(now)
  if (diffMs <= 0) {
    return 'Your reservation fee window has ended. Refresh the payment status or request a new payment link.'
  }

  const totalMinutes = Math.max(1, Math.round(diffMs / 60000))
  if (totalMinutes < 60) {
    return `Complete the reservation fee within ${totalMinutes} minute${totalMinutes === 1 ? '' : 's'} to secure your slot.`
  }

  const totalHours = Math.max(1, Math.round(totalMinutes / 60))
  if (totalHours < 24) {
    return `Complete the reservation fee within ${totalHours} hour${totalHours === 1 ? '' : 's'} to secure your slot.`
  }

  const totalDays = Math.max(1, Math.round(totalHours / 24))
  return `Complete the reservation fee within ${totalDays} day${totalDays === 1 ? '' : 's'} to secure your slot.`
}

export function formatBookingDateTimeLabel(value) {
  if (!value) return '--'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return '--'

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getBookingStatusLabel(status) {
  const normalizedStatus = String(status ?? '')
    .trim()
    .toLowerCase()

  if (!normalizedStatus) {
    return 'Booking update pending'
  }

  return (
    bookingStatusLabels[normalizedStatus] ||
    normalizedStatus
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')
  )
}

export function getReservationPaymentStatusLabel(payment) {
  const status = String(payment?.status ?? '').trim().toLowerCase()

  switch (status) {
    case 'pending':
      return 'Awaiting payment'
    case 'paid':
      return 'Paid'
    case 'failed':
      return 'Payment failed'
    case 'expired':
      return 'Payment expired'
    case 'cancelled':
      return 'Payment cancelled'
    case 'refunded':
      return 'Refunded'
    default:
      return 'Payment status unavailable'
  }
}

export function getBookingServiceNames(booking) {
  const serviceNames = getBookingRequestedServiceNames(booking)
  return serviceNames.length ? serviceNames.join(', ') : 'Service request'
}

export function getBookingServiceHeadline(booking) {
  const serviceNames = getBookingRequestedServiceNames(booking)
  if (!serviceNames.length) {
    return 'Service request'
  }

  return serviceNames.length === 1
    ? serviceNames[0]
    : `${serviceNames[0]} + ${serviceNames.length - 1} more`
}

export function getBookingVehicleLabel(booking, vehicles = []) {
  const matchingVehicle = vehicles.find(
    (vehicle) => vehicle.id === booking?.vehicleId,
  )

  return matchingVehicle
    ? buildOwnedVehicleLabel(matchingVehicle)
    : booking?.vehicleDisplayName || booking?.plateNumber || 'Unlisted vehicle'
}

export function getBookingTimeLabel(booking) {
  if (!booking?.timeSlot) {
    return 'Time slot pending'
  }

  return `${booking.timeSlot.label} - ${formatBookingTimeSlotWindow(booking.timeSlot)}`
}

export function buildBookingTrackingSteps(booking) {
  if (!booking) {
    return [
      {
        label: 'Booking Request',
        status: 'No booking selected',
        state: 'inactive',
      },
      {
        label: 'Staff Review',
        status: 'Offline',
        state: 'inactive',
        note: 'Submit a booking request to see live status here.',
      },
      {
        label: 'Appointment Outcome',
        status: 'Offline',
        state: 'inactive',
      },
    ]
  }

  const status = booking.status
  const workshopStage = booking?.currentWorkshopStage ?? null
  const workshopStageLabels = {
    received: 'Received',
    diagnosis: 'Diagnosis',
    in_repair: 'In Repair',
    quality_check: 'Quality Check',
    ready: 'Ready',
  }

  if (
    workshopStage &&
    status !== 'completed' &&
    status !== 'declined' &&
    status !== 'cancelled'
  ) {
    const orderedStages = [
      'received',
      'diagnosis',
      'in_repair',
      'quality_check',
      'ready',
    ]
    const currentIndex = orderedStages.indexOf(workshopStage)

    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: 'Staff Review',
        status: booking.status === 'rescheduled' ? 'Rescheduled' : 'Confirmed',
        state: 'done',
      },
      ...orderedStages.map((stageKey, index) => ({
        label: workshopStageLabels[stageKey] ?? stageKey,
        status:
          index < currentIndex
            ? 'Completed'
            : index === currentIndex
              ? 'Current stage'
              : 'Upcoming',
        state:
          index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'current'
              : 'upcoming',
        note:
          index === currentIndex
            ? booking?.workshopStageHistory?.find(
                (entry) => entry?.stage === stageKey,
              )?.note ??
              'Service adviser is updating your live workshop progress.'
            : undefined,
      })),
    ]
  }

  if (status === 'declined' || status === 'cancelled') {
    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: status === 'declined' ? 'Declined By Staff' : 'Cancelled',
        status: getBookingStatusLabel(status),
        state: 'current',
      },
    ]
  }

  if (status === 'completed') {
    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: 'Staff Review',
        status: 'Confirmed',
        state: 'done',
      },
      {
        label: 'Appointment Complete',
        status: 'Completed',
        state: 'current',
      },
    ]
  }

  if (status === 'confirmed' || status === 'rescheduled') {
    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: status === 'rescheduled' ? 'Rescheduled By Staff' : 'Staff Confirmed',
        status: getBookingStatusLabel(status),
        state: 'current',
        note: 'Arrival, adviser assignment, and workshop progress stay separate from booking status.',
      },
      {
        label: 'Appointment Outcome',
        status: 'Upcoming',
        state: 'upcoming',
      },
    ]
  }

  if (status === 'in_service') {
    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: 'Staff Review',
        status: 'Confirmed',
        state: 'done',
      },
      {
        label: 'Workshop Service',
        status: 'In Progress',
        state: 'current',
        note: 'Your vehicle is already in the workshop and service updates will continue through the job-order flow.',
      },
      {
        label: 'Appointment Outcome',
        status: 'Pending completion',
        state: 'upcoming',
      },
    ]
  }

  if (status === 'pending_payment') {
    return [
      {
        label: 'Booking Request',
        status: 'Submitted',
        state: 'done',
      },
      {
        label: 'Reservation Payment',
        status: 'Awaiting payment',
        state: 'current',
        note: 'Finish the reservation fee payment so staff can confirm this booking and generate the check-in QR code.',
      },
      {
        label: 'Staff Review',
        status: 'Pending payment confirmation',
        state: 'upcoming',
      },
      {
        label: 'Appointment Outcome',
        status: 'Upcoming',
        state: 'upcoming',
      },
    ]
  }

  return [
    {
      label: 'Booking Request',
      status: 'Submitted',
      state: 'done',
    },
    {
      label: 'Staff Review',
      status: 'Pending',
      state: 'current',
      note: 'Your request is recorded and awaiting staff confirmation. You will see updates here if the slot is confirmed, rescheduled, or declined.',
    },
    {
      label: 'Appointment Outcome',
      status: 'Upcoming',
      state: 'upcoming',
    },
  ]
}
