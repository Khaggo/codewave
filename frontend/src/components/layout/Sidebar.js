'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Car, CalendarCheck, ShieldCheck,
  ShoppingBag, Award, History, ChevronLeft, ChevronRight, Cog, Wrench,
} from 'lucide-react'

const NAV = [
  {
    group: null,
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Operations',
    items: [
      { href: '/vehicles',  label: 'Vehicle Records',  icon: Car },
      { href: '/bookings',  label: 'Bookings',         icon: CalendarCheck },
      { href: '/backjobs',  label: 'Back-Jobs',        icon: Wrench },
      { href: '/timeline',  label: 'Service Timeline', icon: History },
    ],
  },
  {
    group: 'Services',
    items: [
      { href: '/insurance', label: 'Insurance',         icon: ShieldCheck },
      { href: '/shop',      label: 'Inventory',         icon: ShoppingBag },
    ],
  },
  {
    group: 'Customer',
    items: [
      { href: '/loyalty',   label: 'Loyalty Management', icon: Award },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle }) {
  const pathname = usePathname()

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-30 flex flex-col
        bg-surface-card border-r border-surface-border
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[60px]' : 'w-56'}
      `}
    >
      {/* ── Brand ──────────────────────────────────── */}
      <div className={`flex items-center gap-2.5 border-b border-surface-border
                       ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}>
          <Cog size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden leading-none">
            <p className="text-sm font-extrabold text-ink-primary tracking-tight whitespace-nowrap">CRUISERS CRIB</p>
            <p className="text-[9px] font-medium text-ink-muted tracking-widest uppercase whitespace-nowrap mt-0.5">Auto Care Center</p>
          </div>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(section => (
          <div key={section.group ?? '_overview'}>
            {section.group && !collapsed && (
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-dim">
                {section.group}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${collapsed ? 'justify-center' : ''}
                      ${active
                        ? 'text-ink-primary'
                        : 'text-ink-muted hover:bg-surface-hover hover:text-ink-secondary'
                      }
                    `}
                    style={active ? {
                      backgroundColor: 'rgba(240,124,0,0.08)',
                      color: '#f07c00',
                    } : {}}
                  >
                    <Icon size={17} className="flex-shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                    {!collapsed && active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: '#f07c00' }} />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Collapse toggle ─────────────────────────── */}
      <div className="px-2 pb-3">
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg
            text-ink-dim hover:bg-surface-hover hover:text-ink-secondary
            transition-all duration-150 text-xs font-medium
            ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
