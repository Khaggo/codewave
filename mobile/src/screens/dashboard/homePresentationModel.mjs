import { formatBookingDateLabel } from './bookingAvailabilityModel.mjs'
import {
  formatReservationFeeUrgency,
  getBookingServiceNames,
  getBookingTimeLabel,
  getBookingVehicleLabel,
} from './bookingPresentationModel.mjs'

const TERMINAL_BOOKING_STATUSES = new Set(['completed', 'declined', 'cancelled'])
const ACTIVE_BOOKING_STATUSES = new Set(['confirmed', 'rescheduled', 'in_service'])

export function getHomeGreeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning,'
  if (hour < 18) return 'Good afternoon,'
  return 'Good evening,'
}

export function buildHomeCustomerName(account) {
  const fullName = [account?.firstName, account?.lastName]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')

  return fullName || 'Customer'
}

export function getHomeBookingProgress(status) {
  if (TERMINAL_BOOKING_STATUSES.has(status)) return '100%'
  if (status === 'in_service') return '80%'
  if (status === 'confirmed' || status === 'rescheduled') return '55%'
  if (status === 'pending_payment') return '15%'
  return status ? '25%' : '0%'
}

export function buildHomeStatus({
  booking = null,
  reservationPayment = null,
  vehicles = [],
} = {}) {
  if (!booking) {
    return {
      badge: 'START HERE',
      title: 'Book your next service',
      subtitle:
        'Choose services, select a vehicle, and pick an available schedule in one guided flow.',
      helperText:
        'You can request multiple services in one appointment and track updates after you sign in.',
      progressWidth: '0%',
      steps: ['Choose services', 'Select vehicle', 'Pick schedule', 'Review'],
      buttonLabel: 'Start Booking',
      action: 'book',
    }
  }

  const serviceNames = getBookingServiceNames(booking)
  const dateLabel = formatBookingDateLabel(booking.scheduledDate)
  const timeLabel = getBookingTimeLabel(booking)
  const progressWidth = getHomeBookingProgress(booking.status)

  if (booking.status === 'pending_payment') {
    return {
      badge: 'NEXT STEP',
      title: 'Complete reservation fee',
      subtitle: `${serviceNames} for ${dateLabel}`,
      helperText: formatReservationFeeUrgency(reservationPayment?.expiresAt),
      progressWidth,
      steps: ['Request sent', 'Reservation fee', 'Staff review', 'Appointment'],
      buttonLabel: 'Pay Now',
      action: 'track',
    }
  }

  if (ACTIVE_BOOKING_STATUSES.has(booking.status)) {
    return {
      badge: 'NEXT STEP',
      title: 'View active service',
      subtitle: `${serviceNames} - ${timeLabel}`,
      helperText: `${getBookingVehicleLabel(booking, vehicles)} on ${dateLabel}.`,
      progressWidth,
      steps: ['Request sent', 'Staff review', 'Workshop', 'Ready'],
      buttonLabel: 'View Status',
      action: 'track',
    }
  }

  if (booking.status === 'completed') {
    return {
      badge: 'COMPLETED',
      title: 'Service completed',
      subtitle: `${serviceNames} on ${dateLabel}`,
      helperText: `${getBookingVehicleLabel(booking, vehicles)} has a completed service record.`,
      progressWidth,
      steps: ['Request sent', 'Staff review', 'Workshop', 'Completed'],
      buttonLabel: 'View History',
      action: 'track',
    }
  }

  if (booking.status === 'declined' || booking.status === 'cancelled') {
    const statusLabel = booking.status === 'declined' ? 'declined' : 'cancelled'
    return {
      badge: 'BOOKING UPDATE',
      title: `Booking ${statusLabel}`,
      subtitle: `${serviceNames} for ${dateLabel}`,
      helperText:
        'This request is no longer proceeding. Choose another schedule whenever you are ready.',
      progressWidth,
      steps: ['Request sent', 'Staff review', 'Not proceeding', 'Book again'],
      buttonLabel: 'Book Again',
      action: 'book',
    }
  }

  return {
    badge: 'NEXT STEP',
    title: 'Wait for staff review',
    subtitle: `${serviceNames} - ${timeLabel}`,
    helperText:
      'Your request is recorded. Staff will confirm, reschedule, or decline this booking after they review the slot.',
    progressWidth,
    steps: ['Request sent', 'Staff review', 'Appointment', 'Ready'],
    buttonLabel: 'View Status',
    action: 'track',
  }
}

export function buildHomeReminderSubtitle({
  booking = null,
  completedService = null,
} = {}) {
  if (booking) {
    return `${getBookingServiceNames(booking)} on ${formatBookingDateLabel(booking.scheduledDate)} at ${getBookingTimeLabel(booking)}`
  }

  if (completedService) {
    return `Last completed service: ${completedService.title} on ${completedService.dateLabel}`
  }

  return 'No live service reminder is available yet.'
}

export function buildRecentHomeServices(items = []) {
  return (Array.isArray(items) ? items : []).slice(0, 3).map((item) => ({
    key: item.id ?? item.jobOrderId ?? item.jobOrderReference,
    icon: 'check-decagram-outline',
    title:
      item.completedServiceNames?.filter(Boolean).join(', ') ||
      item.vehicleLabel ||
      item.jobOrderReference ||
      'Completed service',
    dateLabel: formatBookingDateLabel(
      item.bookingDate ?? String(item.finalizedAt ?? '').slice(0, 10),
    ),
    status: 'Completed',
  }))
}

export function buildFeaturedRewardCopy(featuredReward = null) {
  return {
    eyebrow: featuredReward
      ? featuredReward.available
        ? 'READY TO REDEEM'
        : 'LIVE LOYALTY REWARD'
      : 'LOYALTY REWARDS',
    title: featuredReward?.title ?? 'Loyalty rewards are now live',
    subtitle: featuredReward
      ? featuredReward.available
        ? `${featuredReward.description} Redeem now for ${featuredReward.pointsLabel}.`
        : `${featuredReward.description} ${featuredReward.remainingPoints.toLocaleString()} more points needed to unlock it.`
      : 'Your points wallet is connected. New rewards will appear here as soon as eligible offers are made active for customers.',
    buttonLabel: featuredReward?.available ? 'Claim Reward' : 'Open Rewards',
  }
}

export function getHomeServiceHistoryView(status, itemCount) {
  if (status === 'loading' && !itemCount) return 'loading'
  if (status === 'error') return 'error'
  return itemCount ? 'ready' : 'empty'
}
