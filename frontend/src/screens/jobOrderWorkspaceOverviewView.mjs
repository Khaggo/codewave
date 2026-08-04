import {
  formatJobOrderReference,
  formatStatusLabel,
} from './jobOrderWorkbenchViewModel.mjs'

export const buildJobOrderHistoryMetrics = ({
  monthCount = 0,
  markedDateCount = 0,
  selectedDateCount = 0,
} = {}) => [
  { label: 'Records', value: monthCount },
  { label: 'Dates', value: markedDateCount },
  { label: 'Selected', value: selectedDateCount },
]

export const buildJobOrderSummaryCards = ({
  isTechnician = false,
  workbenchScope = 'active',
  activeJobOrder = null,
  queueMode = 'live',
  handoffCount = 0,
  handoffStatus = 'idle',
  executionPhase = 'draft',
  selectedCandidate = null,
  canAppendProgress = false,
} = {}) => {
  const assignedTechnicianIds = activeJobOrder?.assignedTechnicianIds ?? []
  const photos = activeJobOrder?.photos ?? []
  const invoiceRecord = activeJobOrder?.invoiceRecord ?? null

  const queueCard = isTechnician
    ? {
        iconKey: 'queue',
        label: workbenchScope === 'history' ? 'Assigned History' : 'Assigned Queue',
        value: activeJobOrder ? 'Loaded' : 'Awaiting load',
        sub: activeJobOrder
          ? `Job order ${formatJobOrderReference(activeJobOrder)} is ready for technician updates`
          : workbenchScope === 'history'
            ? 'Choose one of your finalized or cancelled assigned job orders to review'
            : 'Choose one of your assigned job orders to begin',
      }
    : {
        iconKey: 'queue',
        label: workbenchScope === 'history' ? 'Job Order History' : 'Booking Handoff Queue',
        value:
          workbenchScope === 'history'
            ? handoffCount
            : queueMode === 'handoff_create'
              ? 'Ready to create'
              : handoffCount,
        sub:
          workbenchScope === 'history'
            ? 'Finalized and cancelled work stays here instead of the live workshop queue.'
            : queueMode === 'handoff_create'
              ? 'A handoff-ready booking is selected and can now become the first job order for this date.'
              : handoffStatus === 'handoff_empty'
                ? 'No confirmed booking source is ready today'
                : 'Ready for job-order handoff',
      }

  const phaseCard = {
    iconKey: 'phase',
    label: 'Active Phase',
    value: activeJobOrder
      ? formatStatusLabel(executionPhase)
      : queueMode === 'handoff_create'
        ? 'Create first job order'
        : 'Awaiting load',
    sub: activeJobOrder
      ? `Current status: ${formatStatusLabel(activeJobOrder.status)}`
      : queueMode === 'handoff_create'
        ? 'No job order exists yet for this date, but the booking handoff is ready to convert.'
        : 'Load or create a job order to begin execution',
  }

  const ownershipCard = {
    iconKey: 'ownership',
    label: isTechnician ? 'Progress Access' : 'Assignment State',
    value: isTechnician
      ? activeJobOrder
        ? canAppendProgress
          ? 'Assigned'
          : 'Read only'
        : 'Awaiting load'
      : activeJobOrder
        ? assignedTechnicianIds.length > 0
          ? `${assignedTechnicianIds.length} assigned`
          : 'Unassigned'
        : selectedCandidate
          ? queueMode === 'handoff_create'
            ? 'Ready to create'
            : 'Ready to assign'
          : 'Awaiting source',
    sub: isTechnician
      ? activeJobOrder
        ? canAppendProgress
          ? 'You can append workshop progress entries to this job order.'
          : 'Only service advisers or super admins can append progress for this job order.'
        : 'Load a job order to confirm assignment access.'
      : activeJobOrder
        ? assignedTechnicianIds.join(', ') || 'No technician assigned'
        : selectedCandidate
          ? queueMode === 'handoff_create'
            ? `${selectedCandidate.serviceSummary} is ready to become the first job order on this date.`
            : selectedCandidate.serviceSummary
          : 'Select a confirmed or workshop-handoff booking first',
  }

  const completionCard = {
    iconKey: 'completion',
    label: isTechnician ? 'Photo Evidence' : 'Finalize & Payment',
    value: isTechnician
      ? activeJobOrder
        ? `${photos.length} attached`
        : 'Awaiting load'
      : invoiceRecord
        ? formatStatusLabel(invoiceRecord.paymentStatus)
        : activeJobOrder
          ? 'Not finalized'
          : 'No invoice record',
    sub: isTechnician
      ? photos[0]?.caption ??
        photos[0]?.fileName ??
        'Attach before-and-after evidence while the work is active.'
      : invoiceRecord
        ? invoiceRecord.invoiceReference
        : 'Finalization creates the invoice-ready record',
  }

  return [queueCard, phaseCard, ownershipCard, completionCard]
}

