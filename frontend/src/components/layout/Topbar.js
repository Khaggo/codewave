'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Search, ChevronDown, Menu, LogOut, X, Car, CalendarCheck, Package, Award } from 'lucide-react'
import { getVehicles } from '@/lib/vehicleStore'
import { getAppointments } from '@/lib/appointmentStore'
import { shopProducts } from '@/lib/mockData'

const ROUTE_TITLES = {
  '/':          'Dashboard',
  '/vehicles':  'Vehicle Records',
  '/bookings':  'Bookings',
  '/backjobs':  'Back-Jobs',
  '/timeline':  'Service Timeline',
  '/insurance': 'Insurance Inquiries',
  '/shop':      'Shop & Inventory',
  '/loyalty':   'Loyalty Management',
}

const NOTIFICATIONS = [
  { id: 1, text: 'New booking — ABC-1234 confirmed for Apr 12',  time: '2h ago', unread: true  },
  { id: 2, text: 'QRS-9012 still In-Repair — 6 hrs elapsed',     time: '5h ago', unread: true  },
  { id: 3, text: 'Low stock: Bosch Battery NS60 (7 units left)',  time: '1d ago', unread: false },
]

function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [results, setResults] = useState([])
  const wrapRef               = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    const hits = []

    // Search vehicles
    getVehicles().forEach(v => {
      if (v.plate.toLowerCase().includes(q) || v.owner.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)) {
        hits.push({ type: 'vehicle', icon: Car, label: `${v.plate} — ${v.owner}`, sub: `${v.year} ${v.model}`, href: '/vehicles' })
      }
    })

    // Search appointments
    const vehicles = getVehicles()
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]))
    getAppointments().forEach(a => {
      const v = vehicleMap[a.vehicleId]
      const searchable = [a.jobOrderId, v?.plate, v?.owner, ...a.chosenServices].filter(Boolean).join(' ').toLowerCase()
      if (searchable.includes(q)) {
        hits.push({ type: 'booking', icon: CalendarCheck, label: `${a.jobOrderId || 'Booking'} — ${v?.plate || ''}`, sub: a.chosenServices.join(', '), href: '/bookings' })
      }
    })

    // Search products
    shopProducts.forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) {
        hits.push({ type: 'product', icon: Package, label: p.name, sub: `${p.sku} · ₱${p.price.toLocaleString()}`, href: '/shop' })
      }
    })

    setResults(hits.slice(0, 8))
  }, [query])

  function navigate(href) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <div ref={wrapRef} className="relative hidden sm:block">
      <div className="flex items-center gap-2 bg-surface-raised border border-surface-border rounded-lg px-3 py-1.5 w-48 lg:w-64">
        <Search size={14} className="text-ink-muted flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (query) setOpen(true) }}
          className="bg-transparent text-sm text-ink-secondary placeholder-ink-muted outline-none w-full"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="text-ink-dim hover:text-ink-muted transition-colors">
            <X size={12} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-80 lg:w-96 bg-surface-raised border border-surface-border rounded-xl shadow-card-md z-20 overflow-hidden animate-slide-up">
            <div className="px-4 py-2.5 border-b border-surface-border">
              <p className="text-xs font-semibold text-ink-muted">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            </div>
            <ul className="max-h-72 overflow-y-auto divide-y divide-surface-border">
              {results.map((r, i) => (
                <li key={i}>
                  <button onClick={() => navigate(r.href)}
                    className="w-full px-4 py-3 text-left hover:bg-surface-hover transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ backgroundColor: 'rgba(240,124,0,0.08)' }}>
                      <r.icon size={14} style={{ color: '#f07c00' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-primary truncate">{r.label}</p>
                      <p className="text-xs text-ink-muted truncate">{r.sub}</p>
                    </div>
                    <span className="badge badge-gray text-[10px] flex-shrink-0 capitalize">{r.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {open && query && results.length === 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-80 lg:w-96 bg-surface-raised border border-surface-border rounded-xl shadow-card-md z-20 overflow-hidden animate-slide-up">
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-ink-muted">No results for &quot;<span className="text-ink-secondary font-medium">{query}</span>&quot;</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Topbar({ onMenuToggle, user, onLogout }) {
  const pathname = usePathname()
  const title    = ROUTE_TITLES[pathname] ?? 'Autocare Portal'

  const [notifOpen,   setNotifOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const unread = NOTIFICATIONS.filter(n => n.unread).length

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  function close() { setNotifOpen(false); setProfileOpen(false) }

  return (
    <header className="sticky top-0 z-20 bg-surface-card border-b border-surface-border">
      <div className="flex items-center gap-3 px-4 h-14">

        <button onClick={onMenuToggle} className="md:hidden p-1.5 rounded-lg text-ink-muted hover:bg-surface-hover">
          <Menu size={20} />
        </button>

        <h1 className="text-sm font-bold text-ink-primary mr-auto truncate tracking-tight">{title}</h1>

        {/* Global Search */}
        <GlobalSearch />

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setNotifOpen(v => !v); setProfileOpen(false) }}
            className="relative p-2 rounded-lg text-ink-muted hover:bg-surface-hover hover:text-ink-secondary transition-colors">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#f07c00' }} />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={close} />
              <div className="absolute right-0 mt-1 w-80 bg-surface-raised border border-surface-border rounded-xl shadow-card-md z-20 overflow-hidden animate-slide-up">
                <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-primary">Notifications</p>
                  {unread > 0 && <span className="badge badge-orange">{unread} new</span>}
                </div>
                <ul className="divide-y divide-surface-border max-h-64 overflow-y-auto">
                  {NOTIFICATIONS.map(n => (
                    <li key={n.id} className={`px-4 py-3 text-sm ${n.unread ? 'bg-surface-hover' : ''}`}>
                      <p className={n.unread ? 'text-ink-primary font-medium' : 'text-ink-secondary'}>{n.text}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{n.time}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Admin profile */}
        <div className="relative">
          <button onClick={() => { setProfileOpen(v => !v); setNotifOpen(false) }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover transition-colors">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                 style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}>
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-ink-primary leading-none">{user?.name ?? 'Admin'}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#f07c00' }}>{user?.roleLabel ?? user?.role ?? 'Administrator'}</p>
            </div>
            <ChevronDown size={13} className="text-ink-dim hidden md:block" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={close} />
              <div className="absolute right-0 mt-1 w-52 bg-surface-raised border border-surface-border rounded-xl shadow-card-md z-20 overflow-hidden animate-slide-up">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-sm font-semibold text-ink-primary">{user?.name ?? 'Admin'}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: '#f07c00' }}>{user?.roleLabel ?? user?.role}</p>
                  <p className="text-xs text-ink-muted mt-0.5 truncate">{user?.email}</p>
                </div>
                <button onClick={() => { close(); onLogout?.() }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
