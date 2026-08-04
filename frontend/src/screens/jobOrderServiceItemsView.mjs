import {
  formatServiceItemName,
  getServiceItemState,
} from '../lib/jobOrderServiceProgressModel.mjs'

export const SERVICE_ITEM_STATE_META = Object.freeze({
  todo: Object.freeze({ label: 'To do', className: 'badge-gray' }),
  in_progress: Object.freeze({ label: 'In progress', className: 'badge-orange' }),
  blocked: Object.freeze({ label: 'Blocked', className: 'badge-orange' }),
  completed: Object.freeze({ label: 'Completed', className: 'badge-green' }),
})

export const SERVICE_ITEM_ACTION_META = Object.freeze({
  start: Object.freeze({
    label: 'Start service',
    entryType: 'work_started',
    kind: 'immediate',
    primary: true,
  }),
  resume: Object.freeze({
    label: 'Resume service',
    entryType: 'work_started',
    kind: 'immediate',
    primary: true,
  }),
  update: Object.freeze({
    label: 'Add update',
    entryType: 'note',
    kind: 'message',
    primary: false,
  }),
  blocker: Object.freeze({
    label: 'Report blocker',
    entryType: 'issue_found',
    kind: 'message',
    primary: false,
  }),
  evidence: Object.freeze({
    label: 'Add photo',
    kind: 'evidence',
    primary: false,
  }),
  complete: Object.freeze({
    label: 'Mark complete',
    entryType: 'work_completed',
    kind: 'immediate',
    primary: true,
  }),
})

export function getServiceItemActions(item) {
  if (item.serviceState === 'todo') {
    return [{ key: 'start', ...SERVICE_ITEM_ACTION_META.start }]
  }

  if (item.serviceState === 'blocked') {
    return [{ key: 'resume', ...SERVICE_ITEM_ACTION_META.resume }]
  }

  if (item.serviceState !== 'in_progress') {
    return []
  }

  return [
    { key: 'update', ...SERVICE_ITEM_ACTION_META.update },
    { key: 'blocker', ...SERVICE_ITEM_ACTION_META.blocker },
    item.requiresMissingEvidence
      ? { key: 'evidence', ...SERVICE_ITEM_ACTION_META.evidence }
      : { key: 'complete', ...SERVICE_ITEM_ACTION_META.complete },
  ]
}

export function buildServiceItemMessageDraft(item, entryType) {
  return {
    workItemId: item.id,
    entryType,
    message: '',
    completedItemIds: [],
  }
}

export function buildServiceItemImmediatePayload(item, entryType) {
  const isCompletion = entryType === 'work_completed'
  const serviceName = formatServiceItemName(item)

  return {
    workItemId: item.id,
    entryType,
    message:
      entryType === 'work_started'
        ? `${serviceName} started.`
        : `${serviceName} completed.`,
    completedItemIds: isCompletion ? [item.id] : [],
  }
}

export function buildServiceItemRows({
  items = [],
  progressEntries = [],
  photos = [],
} = {}) {
  const rows = items.map((item) => {
    const hasEvidence = photos.some(
      (photo) =>
        photo?.deletedAt == null &&
        photo?.linkedEntityType === 'work_item' &&
        photo?.linkedEntityId === item.id,
    )
    return {
      ...item,
      serviceState: getServiceItemState(item, progressEntries),
      hasEvidence,
      requiresMissingEvidence:
        item.requiresPhotoEvidence !== false && !hasEvidence,
    }
  })

  return {
    rows,
    activeItems: rows.filter((item) => item.serviceState !== 'completed'),
    completedItems: rows.filter((item) => item.serviceState === 'completed'),
  }
}
