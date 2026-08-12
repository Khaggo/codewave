export function formatDateTime(value) {
  if (!value) return 'Not generated yet'

  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPesoFromCents(amountCents) {
  const amount = Number(amountCents ?? 0) / 100
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function getReservationPaymentStatusLabel(payment) {
  switch (payment?.status) {
    case 'paid':
      return 'Paid'
    case 'failed':
      return 'Payment failed'
    case 'cancelled':
      return 'Payment cancelled'
    case 'refunded':
      return 'Refund review'
    case 'expired':
      return 'Hold expired'
    default:
      return 'Awaiting payment'
  }
}

export function formatClockLabel(value) {
  const normalizedValue = String(value ?? '').trim()
  const match = /^(\d{2}):(\d{2})/.exec(normalizedValue)

  if (!match) {
    return normalizedValue || '--'
  }

  const hours = Number(match[1])
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12

  return `${displayHour}:${minutes} ${meridiem}`
}

export function formatTimeSlotWindow(slot) {
  if (!slot?.startTime || !slot?.endTime) {
    return ''
  }

  return `${formatClockLabel(slot.startTime)} - ${formatClockLabel(slot.endTime)}`
}

export function isBookingEligibleForIntake(booking) {
  return ['confirmed', 'in_service'].includes(String(booking?.status ?? '').trim())
}
