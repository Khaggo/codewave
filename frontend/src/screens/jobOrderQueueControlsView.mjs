export function getHandoffCandidateSelectionState(candidate, selectedBookingId = '') {
  const isSelected = Boolean(candidate?.bookingId)
    && candidate.bookingId === selectedBookingId

  return {
    isSelected,
    badgeLabel: isSelected ? 'Selected source' : 'Confirmed source',
  }
}

export function buildJobOrderQueueDateSummary(entry, workbenchScope = 'active') {
  const jobOrderCount = Number(entry?.jobOrderCount) || 0
  const bookingQueueCount = Number(entry?.bookingQueueCount) || 0
  const jobOrderLabel = `${jobOrderCount} job order${jobOrderCount === 1 ? '' : 's'}`

  return workbenchScope === 'active' && bookingQueueCount > 0
    ? `${jobOrderLabel} / ${bookingQueueCount} queue`
    : jobOrderLabel
}

export function buildJobOrderQueueEmptyMessage(workbenchScope, selectedMonth) {
  return workbenchScope === 'history'
    ? `No finalized or cancelled job orders are marked for ${selectedMonth} yet.`
    : `No job-order or booking-handoff dates are marked for ${selectedMonth} yet.`
}
