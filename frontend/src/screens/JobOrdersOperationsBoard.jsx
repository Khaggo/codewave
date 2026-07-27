'use client'

import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Loader2,
  PanelRightClose,
  RefreshCw,
  ShieldAlert,
  UserRoundCheck,
  Users,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import StaffWorkQueue from '@/components/StaffWorkQueue'
import PortalLink from '@/components/PortalLink'
import PageHeader from '@/components/ui/PageHeader'
import { claimStaffWork, listStaffWorkPresence } from '@/lib/staffWorkQueueClient'
import { useUser } from '@/lib/userContext'

function formatDateTime(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Not available'
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function workHref(item) {
  if (item?.jobOrderId) {
    return `/admin/job-orders/${encodeURIComponent(item.jobOrderId)}`
  }
  if (item?.bookingId) {
    return `/bookings?bookingId=${encodeURIComponent(item.bookingId)}`
  }
  return '/admin/job-orders'
}

export default function JobOrdersOperationsBoard() {
  const user = useUser()
  const [selectedItem, setSelectedItem] = useState(null)
  const [presence, setPresence] = useState([])
  const [presenceStatus, setPresenceStatus] = useState('idle')
  const [claimState, setClaimState] = useState({ status: 'idle', message: '' })

  const loadPresence = useCallback(async () => {
    if (!user?.accessToken) return
    setPresenceStatus((current) => (current === 'idle' ? 'loading' : current))
    try {
      const next = await listStaffWorkPresence({
        queueType: 'job_order',
        accessToken: user.accessToken,
      })
      setPresence(Array.isArray(next) ? next : [])
      setPresenceStatus('ready')
    } catch {
      setPresenceStatus('error')
    }
  }, [user?.accessToken])

  useEffect(() => {
    void loadPresence()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadPresence()
    }, 15_000)
    return () => window.clearInterval(interval)
  }, [loadPresence])

  useEffect(() => {
    setClaimState({ status: 'idle', message: '' })
  }, [selectedItem?.entityId])

  const openWork = useCallback((item) => {
    window.location.assign(workHref(item))
  }, [])

  const claimAndOpenWork = useCallback(async (item) => {
    if (!user?.accessToken || !item?.entityId || !item?.entityType) return
    setClaimState({ status: 'submitting', message: '' })
    try {
      const result = await claimStaffWork({
        queueType: 'job_order',
        entityType: item.entityType,
        entityId: item.entityId,
        accessToken: user.accessToken,
      })
      openWork({
        ...item,
        claim: {
          ...result.claim,
          isMine: true,
        },
      })
    } catch (error) {
      setClaimState({
        status: 'error',
        message: error?.message || 'This work could not be claimed. Refresh the queue and try again.',
      })
    }
  }, [openWork, user?.accessToken])

  const activeStaff = presence.filter((entry) => entry.available).length
  const staffWithWork = presence.filter((entry) => entry.activeClaim).length

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Workshop Operations"
        title="Job Orders"
        description="Claim work, monitor the workshop queue, and open one focused job workspace."
        meta={(
          <>
            <span className="badge badge-green">{activeStaff} accepting work</span>
            <span className="badge badge-gray">{staffWithWork} active assignments</span>
          </>
        )}
        actions={(
          <PortalLink href="/bookings" className="ops-action-primary">
            <CalendarClock size={15} />
            Booking handoffs
          </PortalLink>
        )}
      />

      <StaffWorkQueue
        queueType="job_order"
        accessToken={user?.accessToken}
        title="Workshop queue"
        description="Resume assigned work or claim the next workshop record."
        onSelectWork={setSelectedItem}
        onOpenWork={openWork}
        selectedEntityId={selectedItem?.entityId}
        autoOpenActiveClaim={false}
      />

      <section className="border-t border-surface-border pt-5" aria-labelledby="team-workload-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="team-workload-heading" className="text-base font-semibold text-ink-primary">Team workload</h2>
            <p className="mt-1 text-sm text-ink-secondary">Live adviser and administrator queue presence.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadPresence()}
            className="ops-action-secondary h-10 w-10 px-0"
            aria-label="Refresh team workload"
            title="Refresh team workload"
          >
            <RefreshCw size={15} className={presenceStatus === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>

        {presence.length ? (
          <div className="mt-3 overflow-x-auto border-y border-surface-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Staff</th>
                  <th className="px-4 py-3 font-semibold">Queue state</th>
                  <th className="px-4 py-3 font-semibold">Current work</th>
                  <th className="px-4 py-3 font-semibold">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {presence.map((entry) => (
                  <tr key={entry.userId}>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ink-primary">{entry.staffName}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{entry.staffCode || 'No staff code'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${entry.available ? 'badge-green' : 'badge-gray'}`}>
                        {entry.available ? 'Accepting work' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {entry.activeClaim ? 'Active assignment' : 'No active claim'}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatDateTime(entry.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 border-y border-surface-border px-4 py-6 text-sm text-ink-muted">
            {presenceStatus === 'error' ? 'Team workload is temporarily unavailable.' : 'No staff queue sessions yet.'}
          </p>
        )}
      </section>

      {selectedItem ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/55"
            onClick={() => setSelectedItem(null)}
            aria-label="Close job preview"
          />
          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-surface-border bg-surface-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-preview-title"
          >
            <header className="flex items-center justify-between border-b border-surface-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-ink-muted">Quick preview</p>
                <h2 id="job-preview-title" className="mt-1 truncate text-lg font-semibold text-ink-primary">
                  {selectedItem.reference || 'Workshop record'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="ops-action-secondary h-10 w-10 px-0"
                aria-label="Close job preview"
                title="Close"
              >
                <PanelRightClose size={16} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase text-ink-muted">Customer and vehicle</p>
                  <p className="mt-2 font-semibold text-ink-primary">{selectedItem.customerName || 'Customer unavailable'}</p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {[selectedItem.vehicleName, selectedItem.plateNumber].filter(Boolean).join(' / ') || 'Vehicle unavailable'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-surface-border py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink-muted">Stage</p>
                    <p className="mt-1 text-sm font-semibold text-ink-primary">{selectedItem.status?.replaceAll('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink-muted">Owner</p>
                    <p className="mt-1 text-sm font-semibold text-ink-primary">
                      {selectedItem.claim?.isMine
                        ? 'Assigned to you'
                        : selectedItem.claim?.ownerName || 'Unassigned'}
                    </p>
                  </div>
                </div>

                {selectedItem.priorityReason ? (
                  <div className="flex gap-3 border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-amber-100">
                    <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{selectedItem.priorityReason}</p>
                      <p className="mt-1 text-xs opacity-80">Queue entered {formatDateTime(selectedItem.queueEnteredAt)}</p>
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold uppercase text-ink-muted">Next action</p>
                  <div className="mt-2 flex items-start gap-3">
                    {selectedItem.bookingId && !selectedItem.jobOrderId ? (
                      <ClipboardList size={18} className="mt-0.5 text-brand-orange" />
                    ) : (
                      <Wrench size={18} className="mt-0.5 text-brand-orange" />
                    )}
                    <p className="text-sm leading-6 text-ink-secondary">
                      {selectedItem.queueView === 'history'
                        ? 'This is a read-only ownership record. Active work must be resumed from My Work.'
                        : selectedItem.bookingId && !selectedItem.jobOrderId
                        ? 'Open the booking handoff and send it to the workshop.'
                        : selectedItem.claim?.isMine
                          ? 'Resume the focused workspace and continue the current stage.'
                          : selectedItem.claim
                            ? `This record is currently handled by ${selectedItem.claim.ownerName}.`
                            : 'Claim this record from the queue before editing it.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <footer className="border-t border-surface-border p-4">
              {claimState.message ? (
                <p className="mb-3 text-sm text-red-300" role="alert">
                  {claimState.message}
                </p>
              ) : null}
              {selectedItem.queueView === 'history' ? (
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="ops-action-secondary w-full"
                >
                  Close history preview
                </button>
              ) : (
              <button
                type="button"
                onClick={() => {
                  if (selectedItem.claim?.isMine) {
                    openWork(selectedItem)
                    return
                  }
                  void claimAndOpenWork(selectedItem)
                }}
                disabled={
                  claimState.status === 'submitting'
                  || Boolean(selectedItem.claim && !selectedItem.claim.isMine)
                }
                className="ops-action-primary w-full"
              >
                {claimState.status === 'submitting' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : selectedItem.claim?.isMine ? (
                  <UserRoundCheck size={16} />
                ) : (
                  <Users size={16} />
                )}
                {selectedItem.claim && !selectedItem.claim.isMine
                  ? `Handled by ${selectedItem.claim.ownerName || 'another staff member'}`
                  : selectedItem.claim?.isMine
                    ? selectedItem.bookingId && !selectedItem.jobOrderId
                      ? 'Open booking handoff'
                      : 'Open workspace'
                    : claimState.status === 'submitting'
                      ? 'Claiming work...'
                      : 'Take this job'}
                <ChevronRight size={16} />
              </button>
              )}
            </footer>
          </aside>
        </>
      ) : null}
    </div>
  )
}
