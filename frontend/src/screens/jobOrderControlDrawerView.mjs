import {
  formatBookingReference,
  formatDateTime,
} from './jobOrderWorkbenchViewModel.mjs'

export const JOB_ORDER_CONTROL_DRAWER_TABS = Object.freeze([
  Object.freeze({ key: 'overview', label: 'Workflow' }),
  Object.freeze({ key: 'my_work', label: 'My Work' }),
  Object.freeze({ key: 'context', label: 'Context' }),
])

export function getJobOrderDrawerSourceLabel(jobOrder) {
  if (jobOrder?.sourceType === 'booking') {
    return `Booking ${formatBookingReference({
      scheduledDate: jobOrder.workDate,
      plateNumber: jobOrder.plateNumber,
      bookingReference: jobOrder.sourceBookingReference,
    })}`
  }

  return jobOrder?.sourceBackJobReference
    ? `Back-job ${jobOrder.sourceBackJobReference}`
    : 'Back-job rework'
}

export function buildJobOrderDrawerContextRows({
  jobOrder,
  sourceCandidate,
  hasSavedAssignments = false,
} = {}) {
  if (!jobOrder) {
    return []
  }

  return [
    [
      'Customer',
      sourceCandidate?.customerLabel ??
        jobOrder.customerLabel ??
        'Unknown customer',
    ],
    [
      'Vehicle',
      sourceCandidate?.vehicleLabel ??
        jobOrder.vehicleLabel ??
        'Unknown vehicle',
    ],
    ['Source', getJobOrderDrawerSourceLabel(jobOrder)],
    [
      'Service adviser',
      jobOrder.serviceAdviserCode ||
        jobOrder.serviceAdviserUserId ||
        'Not assigned',
    ],
    [
      'Assigned team',
      hasSavedAssignments
        ? `${jobOrder.assignedTechnicianIds?.length ?? 0} saved`
        : 'No saved assignment',
    ],
    ['Evidence', `${jobOrder.photos?.length ?? 0} attached`],
    ['Updated', formatDateTime(jobOrder.updatedAt)],
  ]
}

export function getJobOrderDrawerAssignmentMeta({
  stageLabel,
  activeClaimId,
} = {}) {
  const normalizedStageLabel = String(stageLabel ?? '').trim() || 'Current stage'
  return activeClaimId
    ? `${normalizedStageLabel} - Claim active`
    : normalizedStageLabel
}
