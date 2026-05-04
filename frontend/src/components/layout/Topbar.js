'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Bell, ChevronDown, LogOut, Menu, Search, X } from 'lucide-react'
import PortalLink from '@/components/PortalLink'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import { isEcommerceEnabled } from '@/lib/runtimeFlags'

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/vehicles': 'Vehicle Records',
  '/bookings': 'Bookings',
  '/backjobs': 'Back-Jobs',
  '/timeline': 'Service Timeline',
  '/insurance': 'Insurance Inquiries',
  '/shop': 'Shop & Inventory',
  '/loyalty': 'Loyalty Management',
  '/admin/customers': 'Customers & Vehicles',
  '/admin/users': 'User Administration',
  '/admin/job-orders': 'Job Order Workbench',
  '/admin/intake-inspections': 'Intake Inspections',
  '/admin/qa-audit': 'QA Audit',
  '/admin/invoices': 'Invoice & Orders',
  '/admin/catalog': 'Catalog Administration',
  '/admin/inventory': 'Inventory',
  '/admin/summaries': 'Analytics',
}

const SEARCH_DESTINATIONS = [
  { label: 'Dashboard', sub: 'Staff overview and live operations shortcuts', href: '/' },
  { label: 'Bookings', sub: 'Daily schedule, queue, status updates, rescheduling', href: '/bookings' },
  { label: 'Customers & Vehicles', sub: 'Customer profile and vehicle records', href: '/admin/customers' },
  { label: 'Job Order Workbench', sub: 'Create job orders, progress, photos, finalization, payment', href: '/admin/job-orders' },
  { label: 'Intake Inspections', sub: 'Vehicle-scoped inspection capture and history', href: '/admin/intake-inspections' },
  { label: 'QA Audit', sub: 'Load quality gates and record super-admin overrides', href: '/admin/qa-audit' },
  { label: 'Invoice & Orders', sub: 'Known job-order invoices and ecommerce order lookup', href: '/admin/invoices' },
  { label: 'User Administration', sub: 'Create staff, mechanics, technicians, and admin accounts', href: '/admin/users' },
  { label: 'Catalog Administration', sub: 'Manage services and catalog visibility', href: '/admin/catalog' },
  { label: 'Inventory', sub: 'Stock visibility and inventory alerts', href: '/admin/inventory' },
  { label: 'Analytics', sub: 'Operational summaries and dashboard metrics', href: '/admin/summaries' },
]

function GlobalSearch() {
  const ecommerceEnabled = isEcommerceEnabled()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const wrapRef = useRef(null)

  useEffect(() => {
    function handler(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const destinations = SEARCH_DESTINATIONS.filter((destination) =>
    ecommerceEnabled ? true : !['/admin/catalog', '/admin/inventory'].includes(destination.href),
  )

  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      setResults([])
      return
    }

    setResults(
      destinations.filter((destination) =>
        [destination.label, destination.sub, destination.href]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      ).slice(0, 8),
    )
  }, [destinations, query])

  function handleNavigate() {
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={wrapRef} className="relative hidden sm:block">
      <div className="flex w-48 items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 lg:w-72">
        <Search size={14} className="flex-shrink-0 text-ink-muted" />
        <input
          type="text"
          placeholder="Search pages..."
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
              setResults([])
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
          <div className="absolute right-0 z-20 mt-1 w-80 overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-card-md animate-slide-up lg:w-96">
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
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: 'rgba(240,124,0,0.08)' }}
                      >
                        <ArrowRight size={14} style={{ color: '#f07c00' }} />
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
              <div className="px-4 py-8 text-center">
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
  const title = ROUTE_TITLES[pathname] ?? 'Autocare Portal'

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
    <header className="sticky top-0 z-20 border-b border-surface-border bg-surface-card">
      <div className="flex h-16 items-center gap-3 px-4">
        <button onClick={onMenuToggle} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-hover md:hidden">
          <Menu size={20} />
        </button>

        <h1 className="mr-auto truncate text-sm font-bold tracking-tight text-ink-primary">{title}</h1>

        <ThemeSwitcher />
        <GlobalSearch />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((value) => !value)
              setProfileOpen(false)
            }}
            className="relative rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink-secondary"
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: '#f07c00' }} />
            ) : null}
          </button>

          {notifOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={close} />
              <div className="absolute right-0 z-20 mt-1 w-80 overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-card-md animate-slide-up">
                <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
                  <p className="text-sm font-semibold text-ink-primary">Notifications</p>
                  <span className="badge badge-gray">Live feed</span>
                </div>
                <div className="px-4 py-8 text-center">
                  <Bell size={22} className="mx-auto text-ink-muted" />
                  <p className="mt-3 text-sm font-semibold text-ink-primary">No live staff notifications yet</p>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    Booking, QA, and inventory notices will appear here once the backend feed is connected to this header.
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
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover"
          >
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}
            >
              {initials}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold leading-none text-ink-primary">{user?.name ?? 'Admin'}</p>
              <p className="mt-0.5 text-[10px] font-semibold" style={{ color: '#f07c00' }}>
                {user?.roleLabel ?? user?.role ?? 'Administrator'}
              </p>
            </div>
            <ChevronDown size={13} className="hidden text-ink-dim md:block" />
          </button>

          {profileOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={close} />
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-card-md animate-slide-up">
                <div className="border-b border-surface-border px-4 py-3">
                  <p className="text-sm font-semibold text-ink-primary">{user?.name ?? 'Admin'}</p>
                  <p className="mt-0.5 text-xs font-semibold" style={{ color: '#f07c00' }}>
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
