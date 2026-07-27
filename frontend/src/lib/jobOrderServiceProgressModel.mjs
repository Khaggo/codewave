export function getServiceItemState(item, progressEntries = []) {
  if (item?.isCompleted) {
    return 'completed'
  }

  const latestStateEntry = progressEntries
    .filter(
      (entry) =>
        entry?.workItemId === item?.id &&
        ['work_started', 'issue_found', 'work_completed'].includes(entry?.entryType),
    )
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]

  if (latestStateEntry?.entryType === 'issue_found') {
    return 'blocked'
  }

  if (latestStateEntry?.entryType === 'work_started') {
    return 'in_progress'
  }

  return 'todo'
}

export function formatServiceItemName(item) {
  const rawName = String(item?.name ?? '').trim()
  const description = String(item?.description ?? '').trim()

  if (!rawName || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(rawName)) {
    return description || 'Service item'
  }

  const withoutInternalPrefix = rawName.replace(/^[A-Z0-9]+(?:[-_][A-Z0-9]+){2,}\s+/, '').trim()
  return withoutInternalPrefix || description || 'Service item'
}
