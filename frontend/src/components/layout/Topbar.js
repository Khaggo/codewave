'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Bell, ChevronDown, LogOut, Menu, Search, X } from 'lucide-react'
import PortalLink from '@/components/PortalLink'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import { isEcommerceEnabled } from '@/lib/runtimeFlags'
import { getShellRouteMeta } from './layoutShellView.mjs'

const SEARCH_DESTINATIONS = [
  { label: 'Dashboard', sub: 'Staff overview and live operations shortcuts', href: '/' },
  { label: 'Bookings', sub: 'Daily schedule, queue, status updates, rescheduling', href: '/bookings' },
  { label: 'Customers & Vehicles', sub: 'Customer profile and vehicle records', href: '/admin/customers' },
  { label: 'Job Order Workbench', sub: 'Create job orders, progress, photos, finalization, payment', href: '/admin/job-orders' },
  { label: 'Intake Inspections', sub: 'Vehicle-scoped inspection capture and history', href: '/admin/intake-inspections' },
  { label: 'QA Audit', sub: 'Load quality gates and record super-admin overrides', href: '/admin/qa-audit' },
  { label: 'Invoice & Orders', sub: 'Known job-order invoices and ecommerce order lookup', href: '/admin/invoices' },
  { label: 'User Administration', sub: 'Create staff, mechanics, technicians, and admin accounts', href: '/admin/users' },
  { label: 'Service Management', sub: 'Manage booking service categories and customer-bookable services', href: '/admin/services' },
  { label: 'Catalog Administration', sub: 'Manage ecommerce catalog visibility', href: '/admin/catalog' },
  { label: 'Inventory', sub: 'Stock visibility and inventory alerts', href: '/admin/inventory' },
  { label: 'Analytics', sub: 'Operational summaries and dashboard metrics', href: '/admin/summaries' },
  { label: 'Settings', sub: 'Session and portal preferences', href: '/settings' },
]

function GlobalSearch() {
  const ecommerceEnabled = isEcommerceEnabled()
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

  const destinations = useMemo(
    () =>
      SEARCH_DESTINATIONS.filter((destination) =>
        ecommerceEnabled ? true : !['/admin/catalog', '/admin/inventory'].includes(destination.href),
      ),
    [ecommerceEnabled],
  )

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return []
    }

    return destinations
      .filter((destination) =>
        [destination.label, destination.sub, destination.href]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 8)
  }, [destinations, query])

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

export default function Topbar({ onMenuToggle, user, onLogout }) {
  const pathname = usePathname()
  const routeMeta = getShellRouteMeta(pathname)

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const unread = 0

  const initials = user?.name
    ? user.name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  function close() {
    setNotifOpen(false)
    setProfileOpen(false)
  }

  return (
    <header className="sticky top-0 z-20 border-b border-surface-border bg-surface-bg/88 backdrop-blur">
      <div className="flex h-[72px] items-center gap-3 px-4 md:px-6 xl:px-8">
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-ink-muted hover:bg-surface-hover md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="mr-auto min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-ink-primary">{routeMeta.title}</p>
          <p className="hidden truncate text-xs text-ink-muted xl:block">{routeMeta.subtitle}</p>
        </div>

        <GlobalSearch />
        <ThemeSwitcher />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((value) => !value)
              setProfileOpen(false)
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
                <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
                  <p className="text-sm font-semibold text-ink-primary">Notifications</p>
                  <span className="badge badge-gray">Updates</span>
                </div>
                <div className="empty-panel m-3 px-4 py-8 text-center">
                  <Bell size={22} className="mx-auto text-ink-muted" />
                  <p className="mt-3 text-sm font-semibold text-ink-primary">No notifications yet</p>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    Booking, QA, and inventory updates will appear here when notification delivery is available.
                  </p>
                </div>
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
            className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:bg-surface-hover"
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: 'rgb(var(--brand-orange))' }}
            >
              {initials}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold leading-none text-ink-primary">{user?.name ?? 'Admin'}</p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {user?.roleLabel ?? user?.role ?? 'Administrator'}
              </p>
            </div>
            <ChevronDown size={13} className="hidden text-ink-dim md:block" />
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
