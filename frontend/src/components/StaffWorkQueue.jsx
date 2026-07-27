'use client'

import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  History,
  Inbox,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  claimStaffWork,
  dispatchStaffWork,
  heartbeatStaffWorkClaim,
  listStaffWorkQueue,
  releaseStaffWorkClaim,
  updateStaffQueueAvailability,
} from '@/lib/staffWorkQueueClient'
import { getStaffWorkQueueCapacityState } from './staffWorkQueueCapacity.mjs'
import { createStaffWorkDispatchCoordinator } from './staffWorkDispatchCoordinator.mjs'

const views = [
  { id: 'my', label: 'My Work', shortLabel: 'Mine', icon: UserRoundCheck },
  { id: 'team', label: 'Team Queue', shortLabel: 'Team', icon: Users },
  { id: 'unassigned', label: 'Unassigned', shortLabel: 'Open', icon: Inbox },
  { id: 'blocked', label: 'Blocked', shortLabel: 'Blocked', icon: CircleAlert },
  { id: 'history', label: 'History', shortLabel: 'History', icon: History },
]

function formatWait(value) {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `${minutes}m waiting`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`
}

function itemTitle(item) {
  return item.reference || item.jobOrderId || item.bookingId || item.entityId
}

export default function StaffWorkQueue({
  queueType,
  accessToken,
  title,
  description,
  onOpenWork,
  onReleaseWork,
  onSelectWork,
  selectedEntityId = '',
  autoOpenActiveClaim = true,
  refreshKey = 0,
}) {
  const [view, setView] = useState('my')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [cursor, setCursor] = useState('')
  const [cursorHistory, setCursorHistory] = useState([])
  const [result, setResult] = useState({
    items: [],
    page: { hasNext: false, nextCursor: null },
    summary: { total: 0, assigned: 0, unassigned: 0, mine: 0, blocked: 0, overdue: 0, oldestWaitSeconds: 0 },
    session: {
      available: false,
      capacity: 1,
      activeClaimCount: 0,
      remainingCapacity: 1,
      activeClaims: [],
      currentClaimId: null,
      currentClaim: null,
    },
  })
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [dispatchPending, setDispatchPending] = useState(false)
  const requestIdRef = useRef(0)
  const openedClaimIdRef = useRef('')
  const dispatchCoordinatorRef = useRef(null)
  const lastRefreshKeyRef = useRef(refreshKey)
  if (!dispatchCoordinatorRef.current) {
    dispatchCoordinatorRef.current = createStaffWorkDispatchCoordinator()
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    setCursor('')
    setCursorHistory([])
  }, [view, debouncedSearch])

  const load = useCallback(async ({
    quiet = false,
    viewOverride = view,
    cursorOverride = cursor,
    searchOverride = debouncedSearch,
  } = {}) => {
    if (!accessToken) return
    const requestId = ++requestIdRef.current
    if (!quiet) setStatus('loading')

    try {
      const next = await listStaffWorkQueue({
        queueType,
        accessToken,
        view: viewOverride,
        search: searchOverride,
        cursor: cursorOverride,
        limit: 25,
      })
      if (requestId !== requestIdRef.current) return
      setResult(next)
      setStatus('ready')
      setMessage('')
      return next
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      setStatus('error')
      setMessage(error?.message || 'The queue could not be loaded.')
      return null
    }
  }, [accessToken, cursor, debouncedSearch, queueType, view])

  useEffect(() => {
    const coordinator = dispatchCoordinatorRef.current
    coordinator.invalidate()
    openedClaimIdRef.current = ''
    setDispatchPending(false)
    return () => coordinator.invalidate()
  }, [accessToken, queueType])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (lastRefreshKeyRef.current === refreshKey) return
    lastRefreshKeyRef.current = refreshKey
    void load()
  }, [load, refreshKey])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load({ quiet: true })
    }, 10_000)
    return () => window.clearInterval(interval)
  }, [load])

  const activeClaim = useMemo(
    () => result.items.find((item) => item.claim?.isMine) ?? null,
    [result.items],
  )
  const capacityState = useMemo(
    () => getStaffWorkQueueCapacityState(result.session),
    [result.session],
  )
  const activeClaims = capacityState.activeClaims

  useEffect(() => {
    if (activeClaims.length === 0) return undefined

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void Promise.allSettled(
        activeClaims.map((claim) => heartbeatStaffWorkClaim({ claimId: claim.id, accessToken })),
      ).then((results) => {
        if (results.some((entry) => entry.status === 'rejected')) void load({ quiet: true })
      })
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [accessToken, activeClaims, load])

  useEffect(() => {
    const claimId = activeClaim?.claim?.id
    if (
      !autoOpenActiveClaim
      || selectedEntityId
      || !claimId
      || !onOpenWork
      || openedClaimIdRef.current
    ) return
    openedClaimIdRef.current = claimId
    onOpenWork(activeClaim)
  }, [activeClaim, autoOpenActiveClaim, onOpenWork, selectedEntityId])

  async function toggleAvailability() {
    const available = !result.session?.available
    setStatus('loading')
    try {
      await updateStaffQueueAvailability({ queueType, available, accessToken })
      setView('my')
      setCursor('')
      setCursorHistory([])
      await load()
    } catch (error) {
      setStatus('error')
      setMessage(error?.message || 'Availability could not be updated.')
    }
  }

  async function takeNextWork() {
    const coordinator = dispatchCoordinatorRef.current
    const token = coordinator.begin()
    if (!token) return

    setDispatchPending(true)
    setStatus('loading')
    try {
      const assignment = await dispatchStaffWork({ queueType, accessToken })
      if (!coordinator.isCurrent(token)) return

      let outcomeMessage = ''
      if (!assignment?.assigned) {
        outcomeMessage = assignment?.reason === 'CAPACITY_REACHED'
          ? 'Your workload is at capacity. Complete or release one item before taking another.'
          : 'No eligible work is waiting right now.'
      }

      const next = await load({
        viewOverride: 'my',
        cursorOverride: '',
        searchOverride: '',
      })
      if (!coordinator.isCurrent(token)) return

      setView('my')
      setCursor('')
      setCursorHistory([])
      if (outcomeMessage) setMessage(outcomeMessage)
      const claimedItem = next?.items?.find(
        (item) => item.claim?.id === assignment?.claim?.id,
      )
      if (claimedItem) onOpenWork?.(claimedItem)
    } catch (error) {
      if (!coordinator.isCurrent(token)) return
      setStatus('error')
      setMessage(error?.message || 'The next assignment could not be claimed.')
    } finally {
      if (coordinator.finish(token)) setDispatchPending(false)
    }
  }

  async function claimSelectedWork(item) {
    setStatus('loading')
    try {
      const assignment = await claimStaffWork({
        queueType,
        entityType: item.entityType,
        entityId: item.entityId,
        accessToken,
      })
      const claimedItem = {
        ...item,
        claim: {
          ...assignment.claim,
          isMine: true,
        },
      }
      setView('my')
      setCursor('')
      setCursorHistory([])
      await load()
      onOpenWork?.(claimedItem)
    } catch (error) {
      setStatus('error')
      setMessage(error?.message || 'This work could not be claimed.')
      await load({ quiet: true })
    }
  }

  async function releaseWork(item) {
    const claimId = item?.claim?.id
    if (!claimId) return
    setStatus('loading')
    try {
      await releaseStaffWorkClaim({
        claimId,
        reason: 'Released from staff workspace',
        accessToken,
      })
      await load()
      const releasedSelectedWork = selectedEntityId === item.entityId
        || selectedEntityId === item.jobOrderId
      if (releasedSelectedWork) onReleaseWork?.(item)
    } catch (error) {
      setStatus('error')
      setMessage(error?.message || 'The assignment could not be released.')
    }
  }

  const items = result.items ?? []
  const summary = result.summary ?? {}
  const available = Boolean(result.session?.available)
  const { capacity, activeClaimCount, hasCapacity } = capacityState

  return (
    <section className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <header className="flex flex-col gap-4 border-b border-surface-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
            <span className="badge badge-gray">{summary.total ?? 0} total</span>
            {(summary.mine ?? 0) > 0 ? <span className="badge badge-green">{summary.mine} mine</span> : null}
            <span className="badge badge-gray">{activeClaimCount} of {capacity} held</span>
            {(summary.unassigned ?? 0) > 0 ? (
              <span className="badge badge-orange">{summary.unassigned} waiting</span>
            ) : null}
            {(summary.blocked ?? 0) > 0 ? <span className="badge badge-red">{summary.blocked} blocked</span> : null}
          </div>
          <p className="mt-1 text-sm text-ink-secondary">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={dispatchPending}
            className="ops-action-secondary !px-3"
            title="Refresh queue"
            aria-label="Refresh queue"
          >
            <RefreshCw size={15} className={status === 'loading' ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={toggleAvailability}
            disabled={dispatchPending}
            className={available ? 'ops-action-secondary' : 'ops-action-primary'}
          >
            {available ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
            {available ? 'Pause' : 'Start accepting'}
          </button>
          {available && hasCapacity ? (
            <button
              type="button"
              onClick={takeNextWork}
              disabled={dispatchPending}
              aria-busy={dispatchPending}
              className="ops-action-primary"
            >
              {dispatchPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <PlayCircle size={15} />
              )}
              {dispatchPending ? 'Taking next...' : 'Take next'}
            </button>
          ) : null}
        </div>
      </header>

      <div className="border-b border-surface-border px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full grid-cols-3 gap-1 rounded-lg border border-surface-border bg-surface-muted p-1 sm:grid-cols-5 lg:w-auto">
            {views.map(({ id, label, shortLabel, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
                  view === id
                    ? 'bg-brand-orange text-white'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <Icon size={14} />
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search queue</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input !pl-9"
              placeholder="Search reference, customer, vehicle"
            />
          </label>
        </div>
      </div>

      {message ? <p className="mx-4 mt-4 rounded-md border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">{message}</p> : null}

      <div className="divide-y divide-surface-border" aria-live="polite">
        {items.map((item) => {
          const mine = Boolean(item.claim?.isMine)
          const ownedByOther = Boolean(item.claim && !mine)
          const selected = selectedEntityId === item.entityId || selectedEntityId === item.jobOrderId
          const canOpen = view !== 'history' && mine && item.jobOrderId
          const canClaim = !item.claim && view !== 'history' && hasCapacity

          return (
            <div
              key={`${item.entityType}-${item.entityId}-${item.claim?.id ?? 'unclaimed'}`}
              className={`grid w-full gap-3 px-4 py-3 text-left transition-colors md:grid-cols-[minmax(0,1fr)_auto] ${
                selected
                  ? 'bg-brand-orange/10'
                  : 'hover:bg-surface-muted'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectWork?.({ ...item, queueView: view })}
                className="min-w-0 text-left"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink-primary">{itemTitle(item)}</span>
                  {mine && view !== 'history' ? <span className="badge badge-green">Yours</span> : null}
                  {mine && view === 'history' ? <span className="badge badge-gray">Handled by you</span> : null}
                  {ownedByOther ? <span className="badge badge-blue">{item.claim.ownerName}</span> : null}
                  {!item.claim && view !== 'history' ? <span className="badge badge-gray">Unassigned</span> : null}
                </span>
                <span className="mt-1 block truncate text-sm text-ink-secondary">
                  {[item.customerName, item.vehicleName, item.plateNumber].filter(Boolean).join(' / ') || item.status}
                </span>
                {item.priorityReason ? (
                  <span className="mt-1 block text-xs text-ink-muted">{item.priorityReason}</span>
                ) : null}
              </button>
              <span className="flex flex-wrap items-center gap-2 text-xs text-ink-muted md:justify-end">
                {queueType === 'qa' && item.riskScore > 0 ? (
                  <span className="badge badge-orange">Risk {item.riskScore}</span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={13} />
                  {formatWait(item.queueEnteredAt)}
                </span>
                {canClaim ? (
                  <button
                    type="button"
                    onClick={() => void claimSelectedWork(item)}
                    className="ops-action-secondary !min-h-9 !px-3"
                  >
                    Take this
                  </button>
                ) : null}
                {canOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpenWork?.(item)}
                    className="ops-action-primary !min-h-9 !px-3"
                    aria-current={selected ? 'true' : undefined}
                  >
                    {selected ? 'Resume' : 'Open'}
                  </button>
                ) : null}
                {mine && view !== 'history' ? (
                  <button
                    type="button"
                    onClick={() => void releaseWork(item)}
                    className="ops-action-secondary !min-h-9 !px-3"
                  >
                    Release
                  </button>
                ) : null}
              </span>
            </div>
          )
        })}
      </div>

      {items.length === 0 && status !== 'loading' ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-semibold text-ink-primary">
            {view === 'my' ? 'No work assigned right now' : `No ${view.replace('_', ' ')} items found`}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {view === 'my' && !available
              ? 'Start accepting work, then take the next priority item.'
              : 'The queue will refresh automatically.'}
          </p>
        </div>
      ) : null}

      <footer className="flex flex-col gap-3 border-t border-surface-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">
            {activeClaimCount} held · {Math.max(0, capacity - activeClaimCount)} available · 25 records per page
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={cursorHistory.length === 0}
            onClick={() => {
              const previous = cursorHistory.at(-1) ?? ''
              setCursorHistory((history) => history.slice(0, -1))
              setCursor(previous)
            }}
            className="ops-action-secondary !px-3"
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            disabled={!result.page?.hasNext}
            onClick={() => {
              setCursorHistory((history) => [...history, cursor])
              setCursor(result.page?.nextCursor ?? '')
            }}
            className="ops-action-secondary !px-3"
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </section>
  )
}
