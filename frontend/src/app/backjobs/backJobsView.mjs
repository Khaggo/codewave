export function splitCommaSeparatedIds(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function toggleDelimitedIdValue(value, targetId, checked) {
  const currentIds = splitCommaSeparatedIds(value)
  if (!targetId) {
    return currentIds.join(', ')
  }

  if (checked) {
    return currentIds.includes(targetId) ? currentIds.join(', ') : [...currentIds, targetId].join(', ')
  }

  return currentIds.filter((entry) => entry !== targetId).join(', ')
}

export const defaultBackJobStatusDraft = {
  status: 'inspected',
  returnInspectionId: '',
  reviewNotes: '',
  resolutionNotes: '',
}

export const defaultBackJobReworkDraft = {
  itemName: 'Warranty rework',
  itemDescription: '',
  estimatedHours: '1',
  notes: '',
  assignedTechnicianIdsText: '',
}

export function buildBackJobStatusDraft({ backJob, allowedTargets = [] } = {}) {
  return {
    ...defaultBackJobStatusDraft,
    status: allowedTargets[0] ?? defaultBackJobStatusDraft.status,
    returnInspectionId: backJob?.returnInspectionId ?? '',
  }
}

export function buildBackJobReworkDraft() {
  return {
    ...defaultBackJobReworkDraft,
  }
}

export function resolveBackJobReworkServiceAdviser({
  activeBackJob,
  vehicleJobOrders = [],
  sessionUserId,
  sessionUserRole,
  sessionStaffCode,
} = {}) {
  const originalJobOrder = Array.isArray(vehicleJobOrders)
    ? vehicleJobOrders.find((jobOrder) => jobOrder?.id === activeBackJob?.originalJobOrderId) ?? null
    : null

  if (originalJobOrder?.serviceAdviserUserId && originalJobOrder?.serviceAdviserCode) {
    return {
      serviceAdviserUserId: originalJobOrder.serviceAdviserUserId,
      serviceAdviserCode: originalJobOrder.serviceAdviserCode,
      source: 'original_job_order',
    }
  }

  if (sessionUserRole === 'service_adviser' && sessionUserId && sessionStaffCode) {
    return {
      serviceAdviserUserId: sessionUserId,
      serviceAdviserCode: sessionStaffCode,
      source: 'session_user',
    }
  }

  return null
}

export function upsertBackJob(items, backJob) {
  if (!backJob) return items
  const exists = items.some((item) => item.id === backJob.id)
  return exists
    ? items.map((item) => (item.id === backJob.id ? backJob : item))
    : [backJob, ...items]
}

export function getBackJobCounts(items) {
  return {
    total: items.length,
    reported: items.filter((item) => item.status === 'reported').length,
    approved: items.filter((item) => item.status === 'approved_for_rework').length,
    unresolved: items.filter((item) => !['resolved', 'closed', 'rejected'].includes(item.status)).length,
  }
}
