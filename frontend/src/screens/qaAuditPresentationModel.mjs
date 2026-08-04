function normalizeBusinessToken(value, fallback = 'WORK') {
  const normalizedValue = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  return normalizedValue || fallback
}

function formatCompactDateToken(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function formatCompactTimeToken(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}${minutes}${seconds}`
}

export function formatQaJobOrderReference(jobOrder) {
  if (jobOrder?.jobOrderReference) return jobOrder.jobOrderReference
  if (jobOrder?.sourceBackJobReference) {
    return `JO-RW \u00b7 ${jobOrder.sourceBackJobReference}`
  }
  if (jobOrder?.sourceBookingReference) {
    return `JO \u00b7 ${jobOrder.sourceBookingReference}`
  }

  const compactDate = formatCompactDateToken(
    jobOrder?.workDate ?? jobOrder?.createdAt,
  )
  const timeToken = formatCompactTimeToken(
    jobOrder?.createdAt ?? jobOrder?.updatedAt,
  )
  const plateToken = normalizeBusinessToken(
    jobOrder?.plateNumber ??
      jobOrder?.vehicleDisplayName ??
      jobOrder?.serviceAdviserCode,
    'WORK',
  )
  const prefix = jobOrder?.jobType === 'back_job' ? 'JO-RW' : 'JO'
  return compactDate
    ? `${prefix}-${compactDate}-${timeToken || plateToken}`
    : `${prefix}-${plateToken}`
}

export function getLoadedJobOrderReference(
  jobOrderId,
  jobOrderOptions = [],
  qualityGate = null,
) {
  if (qualityGate?.jobOrderReference) return qualityGate.jobOrderReference

  const matchingJobOrder =
    jobOrderOptions.find((jobOrder) => jobOrder.id === jobOrderId) ??
    (qualityGate?.jobOrderId
      ? jobOrderOptions.find(
          (jobOrder) => jobOrder.id === qualityGate.jobOrderId,
        )
      : null)

  return matchingJobOrder
    ? formatQaJobOrderReference(matchingJobOrder)
    : 'Selected job order'
}
