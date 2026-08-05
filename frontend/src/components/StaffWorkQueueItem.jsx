import { Clock3 } from 'lucide-react'

import { safeBusinessReference } from '@/lib/businessReferenceDisplay.mjs'

function formatWait(value) {
  if (value === null || value === undefined || String(value).trim() === '') return ''
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `${minutes}m waiting`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`
}

function itemTitle(item) {
  return safeBusinessReference(
    item.reference || item.jobOrderReference || item.inquiryReference || item.backJobReference,
    'Work item',
  )
}

export default function StaffWorkQueueItem({
  item,
  view,
  queueType,
  selectedEntityId,
  hasCapacity,
  onSelect,
  onClaim,
  onOpen,
  onRelease,
}) {
  const mine = Boolean(item.claim?.isMine)
  const ownedByOther = Boolean(item.claim && !mine)
  const waitLabel = formatWait(item.queueEnteredAt)
  const selected = selectedEntityId === item.entityId || selectedEntityId === item.jobOrderId
  const canOpen = view !== 'history' && mine && item.jobOrderId
  const canClaim = !item.claim && view !== 'history' && hasCapacity

  return (
    <div
      className={`grid w-full gap-2 px-4 py-2.5 text-left transition-colors md:grid-cols-[minmax(0,1fr)_auto] ${
        selected ? 'bg-brand-orange/10' : 'hover:bg-surface-muted'
      }`}
    >
      <button type="button" onClick={onSelect} className="min-h-11 min-w-0 text-left" aria-label={`Preview ${itemTitle(item)}`}>
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-primary">{itemTitle(item)}</span>
          {mine && view !== 'history' ? <span className="badge badge-green">Yours</span> : null}
          {mine && view === 'history' ? <span className="badge badge-gray">Handled by you</span> : null}
          {ownedByOther ? (
            <span className="badge badge-blue">
              {item.claim.ownerName || 'Handled by another staff member'}
            </span>
          ) : null}
          {!item.claim && view !== 'history' ? <span className="badge badge-gray">Unassigned</span> : null}
        </span>
        <span className="mt-1 block truncate text-sm text-ink-secondary">
          {[item.customerName, item.vehicleName, item.plateNumber].filter(Boolean).join(' / ') || item.status}
        </span>
        {item.priorityReason ? (
          <span className="mt-1 block text-xs text-ink-secondary">{item.priorityReason}</span>
        ) : null}
      </button>
      <span className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary md:justify-end">
        {queueType === 'qa' && item.riskScore > 0 ? (
          <span className="badge badge-orange">Risk {item.riskScore}</span>
        ) : null}
        {waitLabel ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} />
            {waitLabel}
          </span>
        ) : null}
        {canClaim ? (
          <button type="button" onClick={onClaim} className="ops-action-secondary !px-3">
            Take this
          </button>
        ) : null}
        {canOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="ops-action-primary !px-3"
            aria-current={selected ? 'true' : undefined}
          >
            {selected ? 'Resume' : 'Open'}
          </button>
        ) : null}
        {mine && view !== 'history' ? (
          <button type="button" onClick={onRelease} className="ops-action-secondary !px-3">
            Release
          </button>
        ) : null}
      </span>
    </div>
  )
}
