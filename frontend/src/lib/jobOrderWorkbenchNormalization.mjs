export const normalizeJobOrderForWorkbench = (jobOrder) => {
  if (!jobOrder || typeof jobOrder !== 'object') {
    return null
  }

  const items = Array.isArray(jobOrder.items) ? jobOrder.items : []
  const assignments = Array.isArray(jobOrder.assignments) ? jobOrder.assignments : []
  const progressEntries = Array.isArray(jobOrder.progressEntries) ? jobOrder.progressEntries : []
  const photos = Array.isArray(jobOrder.photos) ? jobOrder.photos : []

  return {
    ...jobOrder,
    jobOrderReference: jobOrder?.jobOrderReference ?? null,
    items,
    assignments,
    progressEntries,
    photos,
    itemCount: items.length,
    completedItemCount: items.filter((item) => item?.isCompleted).length,
    assignedTechnicianIds: assignments
      .map((assignment) => assignment?.technicianProfileId ?? assignment?.technicianUserId)
      .filter(Boolean),
    currentWorkshopStage: jobOrder?.currentWorkshopStage ?? null,
    workshopStageHistory: Array.isArray(jobOrder?.workshopStageHistory) ? jobOrder.workshopStageHistory : [],
    latestProgressEntry: progressEntries.length > 0 ? progressEntries[progressEntries.length - 1] : null,
    hasInvoiceRecord: Boolean(jobOrder.invoiceRecord),
  }
}

export const normalizeJobOrderWorkbenchSummary = (jobOrder) => ({
  id: jobOrder?.id ?? '',
  jobOrderReference: jobOrder?.jobOrderReference ?? null,
  status: jobOrder?.status ?? 'draft',
  sourceType: jobOrder?.sourceType ?? 'booking',
  sourceId: jobOrder?.sourceId ?? null,
  sourceBookingReference: jobOrder?.sourceBookingReference ?? null,
  sourceBackJobReference: jobOrder?.sourceBackJobReference ?? null,
  workDate: jobOrder?.workDate ?? null,
  vehicleId: jobOrder?.vehicleId ?? null,
  serviceAdviserCode: jobOrder?.serviceAdviserCode ?? null,
  assignedTechnicianIds: Array.isArray(jobOrder?.assignedTechnicianIds)
    ? jobOrder.assignedTechnicianIds.filter(Boolean)
    : [],
  assignments: Array.isArray(jobOrder?.assignments) ? jobOrder.assignments : [],
  currentWorkshopStage: jobOrder?.currentWorkshopStage ?? null,
  updatedAt: jobOrder?.updatedAt ?? null,
})
