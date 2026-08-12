'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Bell, ChevronDown, ClipboardList, LogOut, Menu, Search, X } from 'lucide-react'
import PortalLink from '@/components/PortalLink'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import { safeBusinessReference } from '@/lib/businessReferenceDisplay.mjs'
import {
  archiveAllReadStaffNotifications,
  archiveStaffNotification,
  listStaffNotifications,
  markAllStaffNotificationsRead,
  markStaffNotificationRead,
} from '@/lib/notificationsClient'
import { getShellRouteMeta } from './layoutShellView.mjs'

const SEARCH_DESTINATIONS = [
  { label: 'Dashboard', sub: 'Staff overview and live operations shortcuts', href: '/' },
  { label: 'Bookings', sub: 'Daily schedule, queue, status updates, rescheduling', href: '/bookings' },
  { label: 'Customers & Vehicles', sub: 'Customer profile and vehicle records', href: '/admin/customers' },
  { label: 'Job Orders', sub: 'My Work, team queue, service progress, and QA handoff', href: '/admin/job-orders' },
  { label: 'Intake Inspections', sub: 'Vehicle-scoped inspection capture and history', href: '/admin/intake-inspections' },
  { label: 'QA Audit', sub: 'Load quality gates and record super-admin overrides', href: '/admin/qa-audit' },
  { label: 'Service Invoices', sub: 'Finalized job-order invoices and payment status', href: '/admin/invoices' },
  { label: 'Accessory Orders', sub: 'Pickup preparation, collection, cancellations, and refunds', href: '/admin/accessories/orders' },
  { label: 'Accessory Catalog', sub: 'Products, variants, fitment, lighting review, media, and publication', href: '/admin/accessories/catalog' },
  { label: 'Accessory Stock', sub: 'Inventory balances and audited stock adjustments', href: '/admin/accessories/stock' },
  { label: 'User Administration', sub: 'Create staff, mechanics, technicians, and admin accounts', href: '/admin/users' },
  { label: 'Service Management', sub: 'Manage booking service categories and customer-bookable services', href: '/admin/services' },
  { label: 'Analytics', sub: 'Operational summaries and dashboard metrics', href: '/admin/summaries' },
  { label: 'Settings', sub: 'Session and portal preferences', href: '/settings' },
]

const formatRelativeTime = (value) => {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Time unavailable'
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handler(event) {
      if (open && wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return []
    }

    return SEARCH_DESTINATIONS
      .filter((destination) =>
        [destination.label, destination.sub, destination.href]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 8)
  }, [query])

  function handleNavigate() {
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={wrapRef} className="relative hidden md:block">
      <div className="flex w-56 items-center gap-2 rounded-xl border border-surface-border bg-surface-card/84 px-3 py-2 lg:w-80 xl:w-[22rem]">
        <Search size={14} className="flex-shrink-0 text-ink-muted" />
        <input
          type="text"
          placeholder="Find a workspace..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (query) setOpen(true)
          }}
          className="w-full bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            className="text-ink-dim transition-colors hover:text-ink-muted"
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>

      {open && query ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card-md animate-slide-up lg:w-96">
            <div className="border-b border-surface-border px-4 py-2.5">
              <p className="text-xs font-semibold text-ink-muted">
                {results.length ? `${results.length} matching page${results.length === 1 ? '' : 's'}` : 'No page matches'}
              </p>
            </div>
            {results.length ? (
              <ul className="max-h-72 divide-y divide-surface-border overflow-y-auto">
                {results.map((result) => (
                  <li key={result.href}>
                    <PortalLink
                      href={result.href}
                      onClick={handleNavigate}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover/70"
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: 'rgb(var(--brand-orange) / 0.08)' }}
                      >
                        <ArrowRight size={14} className="text-brand-orange" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-primary">{result.label}</p>
                        <p className="truncate text-xs text-ink-muted">{result.sub}</p>
                      </div>
                      <span className="badge badge-gray flex-shrink-0 text-[10px]">page</span>
                    </PortalLink>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-panel m-3 px-4 py-8 text-center">
                <p className="text-sm text-ink-muted">
                  No live page result for &quot;<span className="font-medium text-ink-secondary">{query}</span>&quot;.
                </p>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Search currently covers real portal pages only.
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function Topbar({ onMenuToggle, user, onLogout, workState }) {
  const pathname = usePathname()
  const routeMeta = getShellRouteMeta(pathname)

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const workItem = workState?.item ?? null
  const workClaim = workItem?.claim ?? workState?.session?.currentClaim ?? null
  const workReference = safeBusinessReference(
    workItem?.reference || workItem?.jobOrderReference || workItem?.inquiryReference || workItem?.backJobReference,
    'My Work',
  )
  const workHref = workItem?.jobOrderId
    ? `/admin/job-orders/${encodeURIComponent(workItem.jobOrderId)}`
    : '/admin/job-orders'
  const notificationKey = [
    workClaim?.id,
    workState?.summary?.blocked ?? 0,
    workState?.summary?.overdue ?? 0,
  ].join(':')
  const [seenNotificationKey, setSeenNotificationKey] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationBusy, setNotificationBusy] = useState(false)
  const unread = notifications.filter((notification) => !notification.readAt).length
    + (notificationKey !== '::' && notificationKey !== seenNotificationKey ? 1 : 0)

  useEffect(() => {
    setSeenNotificationKey(window.localStorage.getItem('autocare:staff-work-notification') ?? '')
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!user?.id || !user?.accessToken) {
      setNotifications([])
      return undefined
    }

    void listStaffNotifications({ userId: user.id, accessToken: user.accessToken })
      .then((items) => {
        if (!cancelled) setNotifications(Array.isArray(items) ? items.filter((item) => item.category !== 'auth_otp') : [])
      })
      .catch(() => {
        if (!cancelled) setNotifications([])
      })

    return () => {
      cancelled = true
    }
  }, [user?.accessToken, user?.id])

  const markNotificationRead = async (notificationId) => {
    if (!user?.id || !user?.accessToken) return
    setNotificationBusy(true)
    try {
      const updated = await markStaffNotificationRead({
        userId: user.id,
        notificationId,
        accessToken: user.accessToken,
      })
      setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt: updated.readAt ?? new Date().toISOString() } : item))
    } finally {
      setNotificationBusy(false)
    }
  }

  const markAllNotificationsRead = async () => {
    if (!user?.id || !user?.accessToken) return
    setNotificationBusy(true)
    try {
      await markAllStaffNotificationsRead({ userId: user.id, accessToken: user.accessToken })
      const readAt = new Date().toISOString()
      setNotifications((current) => current.map((item) => ({ ...item, readAt })))
    } finally {
      setNotificationBusy(false)
    }
  }

  const archiveNotification = async (notificationId) => {
    if (!user?.id || !user?.accessToken) return
    setNotificationBusy(true)
    try {
      await archiveStaffNotification({ userId: user.id, notificationId, accessToken: user.accessToken })
      setNotifications((current) => current.filter((item) => item.id !== notificationId))
    } finally {
      setNotificationBusy(false)
    }
  }

  const archiveReadNotifications = async () => {
    if (!user?.id || !user?.accessToken) return
    setNotificationBusy(true)
    try {
      await archiveAllReadStaffNotifications({ userId: user.id, accessToken: user.accessToken })
      setNotifications((current) => current.filter((item) => !item.readAt))
    } finally {
      setNotificationBusy(false)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  function close() {
    setNotifOpen(false)
    setProfileOpen(false)
  }

  return (
    <header className="sticky top-0 z-20 border-b border-surface-border bg-surface-bg/88 backdrop-blur">
      <div className="flex h-[72px] min-w-0 items-center gap-3 px-4 md:px-6 xl:px-8">
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-ink-muted hover:bg-surface-hover md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="mr-auto min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-tight text-ink-primary">{routeMeta.title}</p>
          <p className="hidden truncate text-xs text-ink-muted xl:block">{routeMeta.subtitle}</p>
        </div>

        <GlobalSearch />
        <ThemeSwitcher />

        {workClaim ? (
          <PortalLink
            href={workHref}
            className="hidden min-h-10 max-w-[220px] items-center gap-2 border border-emerald-500/25 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 xl:flex"
            title={`Resume ${workReference || 'active work'}`}
          >
            <ClipboardList size={15} className="shrink-0" />
            <span className="truncate">Resume {workReference || 'My Work'}</span>
            <ArrowRight size={14} className="shrink-0" />
          </PortalLink>
        ) : null}

        <div className="relative min-w-0 max-w-[168px] shrink-0 lg:max-w-[150px] xl:max-w-[230px]">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((value) => !value)
              setProfileOpen(false)
              setSeenNotificationKey(notificationKey)
              window.localStorage.setItem('autocare:staff-work-notification', notificationKey)
            }}
            className="relative rounded-xl border border-transparent p-2 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-secondary"
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-orange" />
            ) : null}
          </button>

          {notifOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={close} />
              <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card-md animate-slide-up">
                <div className="flex items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
                  <p className="text-sm font-semibold text-ink-primary">Notifications</p>
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-xs font-semibold text-ink-secondary disabled:opacity-50" onClick={() => void archiveReadNotifications()} disabled={notificationBusy || !notifications.some((item) => item.readAt)}>
                      Archive read
                    </button>
                    <button type="button" className="text-xs font-semibold text-brand-orange disabled:opacity-50" onClick={() => void markAllNotificationsRead()} disabled={notificationBusy || !notifications.some((item) => !item.readAt)}>
                      Mark all read
                    </button>
                  </div>
                </div>
                {notifications.length || workClaim || (workState?.summary?.blocked ?? 0) > 0 || (workState?.summary?.overdue ?? 0) > 0 ? (
                  <div className="divide-y divide-surface-border">
                    {notifications.slice(0, 6).map((notification) => (
                      <div key={notification.id} className={`flex gap-3 px-4 py-4 ${notification.readAt ? 'opacity-70' : ''}`}>
                        <Bell size={17} className="mt-0.5 shrink-0 text-brand-orange" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink-primary">{notification.title}</p>
                          <p className="mt-1 text-xs leading-5 text-ink-muted">{notification.message}</p>
                          <p className="mt-2 text-[11px] text-ink-muted" title={notification.createdAt}>{formatRelativeTime(notification.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {!notification.readAt ? <button type="button" className="min-h-8 text-[11px] font-semibold text-brand-orange" onClick={() => void markNotificationRead(notification.id)} disabled={notificationBusy}>Read</button> : null}
                          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-hover hover:text-ink-primary" onClick={() => void archiveNotification(notification.id)} disabled={notificationBusy} aria-label={`Archive ${notification.title}`} title="Archive notification">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {workClaim ? (
                      <PortalLink href={workHref} className="flex gap-3 px-4 py-4 hover:bg-surface-hover">
                        <ClipboardList size={17} className="mt-0.5 shrink-0 text-emerald-300" />
                        <span>
                          <span className="block text-sm font-semibold text-ink-primary">Work assigned to you</span>
                          <span className="mt-1 block text-xs leading-5 text-ink-muted">
                            Resume {workReference || 'your active job order'} before taking another record.
                          </span>
                        </span>
                      </PortalLink>
                    ) : null}
                    {(workState?.summary?.blocked ?? 0) > 0 ? (
                      <PortalLink href="/admin/job-orders" className="flex gap-3 px-4 py-4 hover:bg-surface-hover">
                        <Bell size={17} className="mt-0.5 shrink-0 text-amber-300" />
                        <span>
                          <span className="block text-sm font-semibold text-ink-primary">Blocked workshop work</span>
                          <span className="mt-1 block text-xs leading-5 text-ink-muted">
                            {workState.summary.blocked} record{workState.summary.blocked === 1 ? '' : 's'} need review.
                          </span>
                        </span>
                      </PortalLink>
                    ) : null}
                    {(workState?.summary?.overdue ?? 0) > 0 ? (
                      <PortalLink href="/admin/job-orders" className="flex gap-3 px-4 py-4 hover:bg-surface-hover">
                        <Bell size={17} className="mt-0.5 shrink-0 text-red-300" />
                        <span>
                          <span className="block text-sm font-semibold text-ink-primary">Overdue work waiting</span>
                          <span className="mt-1 block text-xs leading-5 text-ink-muted">
                            {workState.summary.overdue} record{workState.summary.overdue === 1 ? '' : 's'} passed the scheduled date.
                          </span>
                        </span>
                      </PortalLink>
                    ) : null}
                  </div>
                ) : (
                  <div className="empty-panel m-3 px-4 py-8 text-center">
                    <Bell size={22} className="mx-auto text-ink-muted" />
                    <p className="mt-3 text-sm font-semibold text-ink-primary">You are caught up</p>
                    <p className="mt-2 text-xs leading-5 text-ink-muted">New assignments and workshop risks will appear here.</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((value) => !value)
              setNotifOpen(false)
            }}
            aria-label={`Open account menu for ${user?.name ?? 'Admin'}`}
            className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:bg-surface-hover"
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: 'rgb(var(--brand-orange))' }}
            >
              {initials}
            </div>
            <div className="hidden min-w-0 flex-1 text-left md:block">
              <p className="truncate whitespace-nowrap text-xs font-semibold leading-none text-ink-primary" title={user?.name ?? 'Admin'}>{user?.name ?? 'Admin'}</p>
              <p className="mt-1 truncate whitespace-nowrap text-[11px] text-ink-muted" title={user?.roleLabel ?? user?.role ?? 'Administrator'}>
                {user?.roleLabel ?? user?.role ?? 'Administrator'}
              </p>
            </div>
            <ChevronDown size={13} className="hidden shrink-0 text-ink-dim md:block" />
          </button>

          {profileOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={close} />
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card-md animate-slide-up">
                <div className="border-b border-surface-border px-4 py-3">
                  <p className="text-sm font-semibold text-ink-primary">{user?.name ?? 'Admin'}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {user?.roleLabel ?? user?.role}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    onLogout?.()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
