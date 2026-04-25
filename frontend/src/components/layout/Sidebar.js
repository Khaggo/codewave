'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  LayoutDashboard,
  CalendarCheck,
  ShieldCheck,
  ShoppingBag,
  Award,
  ChevronLeft,
  ChevronRight,
  Cog,
  Wrench,
  Users,
  ClipboardCheck,
  ClipboardList,
  Boxes,
  FileSearch,
  ReceiptText,
} from 'lucide-react'

import { useUser } from '@/lib/userContext'
import {
  getStaffPortalNavigationForRole,
  isStaffPortalRole,
} from '@/lib/api/generated/auth/staff-web-session'

const NAV = [
  {
    group: null,
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Front Desk Flow',
    items: [
      { href: '/bookings', label: '1. Booking Schedule', icon: CalendarCheck },
      { href: '/admin/intake-inspections', label: '2. Intake Inspection', icon: FileSearch },
      { href: '/admin/job-orders', label: '3. Job Orders', icon: ClipboardList },
      { href: '/admin/qa-audit', label: '4. QA Audit', icon: ClipboardCheck },
      { href: '/admin/invoices', label: '5. Invoices & Orders', icon: ReceiptText },
    ],
  },
  {
    group: 'Customer Records',
    items: [
      { href: '/backjobs', label: 'Back-Jobs', icon: Wrench },
      { href: '/insurance', label: 'Insurance', icon: ShieldCheck },
      { href: '/loyalty', label: 'Loyalty Management', icon: Award },
    ],
  },
  {
    group: 'Catalog & Stock',
    items: [
      { href: '/admin/catalog', label: 'Catalog Admin', icon: Boxes },
      { href: '/admin/inventory', label: 'Inventory Admin', icon: ShoppingBag },
    ],
  },
  {
    group: 'Admin',
    items: [
      { href: '/admin/users', label: 'Staff Accounts', icon: Users },
      { href: '/admin/appointments', label: 'Appointments Admin', icon: CalendarCheck },
      { href: '/admin/summaries', label: 'Analytics & Summaries', icon: BarChart3 },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle }) {
  const pathname = usePathname()
  const user = useUser()
  const visiblePaths = new Set(
    getStaffPortalNavigationForRole(user?.role).map((entry) => entry.href),
  )

  const visibleSections = NAV.map((section) => ({
    ...section,
    items: section.items.filter(({ href }) =>
      isStaffPortalRole(user?.role) ? visiblePaths.has(href) : false,
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen z-30 flex flex-col
        bg-surface-card border-r border-surface-border
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[60px]' : 'w-56'}
      `}
    >
      <div
        className={`flex items-center gap-2.5 border-b border-surface-border
                       ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'}`}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}
        >
          <Cog size={16} className="text-white" />
        </div>
        {!collapsed ? (
          <div className="overflow-hidden leading-none">
            <p className="text-sm font-extrabold text-ink-primary tracking-tight whitespace-nowrap">CRUISERS CRIB</p>
            <p className="text-[9px] font-medium text-ink-muted tracking-widest uppercase whitespace-nowrap mt-0.5">
              Auto Care Center
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.group ?? '_overview'}>
            {section.group && !collapsed ? (
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-dim">
                {section.group}
              </p>
            ) : null}
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
                      ${active ? 'text-ink-primary' : 'text-ink-muted hover:bg-surface-hover hover:text-ink-secondary'}
                    `}
                    style={
                      active
                        ? {
                            backgroundColor: 'rgb(var(--brand-orange) / 0.08)',
                            color: 'rgb(var(--brand-orange))',
                          }
                        : {}
                    }
                  >
                    <Icon size={17} className="flex-shrink-0" />
                    {!collapsed ? <span className="truncate">{label}</span> : null}
                    {!collapsed && active ? (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 bg-brand-orange" />
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

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
