export function splitCommaSeparatedIds(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
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
