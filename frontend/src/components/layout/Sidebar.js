'use client'

import PortalLink from '@/components/PortalLink'
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
  CarFront,
} from 'lucide-react'

import { useUser } from '@/lib/userContext'
import {
  staffPortalNavigationRules,
  getStaffPortalNavigationForRole,
  isStaffPortalRole,
} from '@/lib/api/generated/auth/staff-web-session'
import { isEcommerceEnabled } from '@/lib/runtimeFlags'

const GROUP_ORDER = ['Overview', 'Front Desk Flow', 'Customer Records', 'Catalog & Stock', 'Admin']

const ICON_BY_PATH = {
  '/': LayoutDashboard,
  '/vehicles': CarFront,
  '/bookings': CalendarCheck,
  '/admin/intake-inspections': FileSearch,
  '/admin/job-orders': ClipboardList,
  '/admin/qa-audit': ClipboardCheck,
  '/admin/invoices': ReceiptText,
  '/admin/customers': Users,
  '/backjobs': Wrench,
  '/insurance': ShieldCheck,
  '/loyalty': Award,
  '/shop': ShoppingBag,
  '/admin/services': Wrench,
  '/admin/catalog': Boxes,
  '/admin/inventory': ShoppingBag,
  '/admin/users': Users,
  '/admin/summaries': BarChart3,
  '/settings': Cog,
}

const LABEL_BY_KEY = {
  bookings: 'Booking Schedule',
  'digital-intake-inspections': 'Intake Inspection',
  'job-orders-admin': 'Job Orders',
  'qa-audit': 'QA Audit',
  'invoice-order-management': 'Invoices & Orders',
  'summary-review': 'Analytics & Summaries',
  'user-admin': 'Staff Accounts',
}

export default function Sidebar({ collapsed, onToggle }) {
  const pathname = usePathname()
  const user = useUser()
  const ecommerceEnabled = isEcommerceEnabled()
  const visiblePaths = new Set(
    getStaffPortalNavigationForRole(user?.role).map((entry) => entry.href),
  )
  const ecommerceBlockedPaths = new Set(['/admin/catalog', '/admin/inventory'])

  const visibleEntries = isStaffPortalRole(user?.role)
    ? staffPortalNavigationRules.filter(
        (entry) => visiblePaths.has(entry.href) && (ecommerceEnabled || !ecommerceBlockedPaths.has(entry.href)),
      )
    : []

  const visibleSections = GROUP_ORDER.map((group) => {
    const items = visibleEntries
      .filter((entry) => entry.group === group)
      .map((entry) => ({
        href: entry.href,
        label: LABEL_BY_KEY[entry.key] ?? entry.label,
        icon: ICON_BY_PATH[entry.href] ?? Cog,
      }))

    return {
      group: group === 'Overview' ? null : group,
      items,
    }
  }).filter((section) => section.items.length > 0)

  return (
    <aside
      className={`
        flex h-screen w-full flex-col
        border-r border-surface-border bg-surface-card/95 backdrop-blur
        transition-all duration-200 ease-in-out
      `}
    >
      <div
        className={`flex h-[72px] items-center gap-3 border-b border-surface-border ${collapsed ? 'justify-center px-3' : 'px-5'}`}
      >
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-surface-raised text-brand-orange"
        >
          <Cog size={21} />
        </div>
        {!collapsed ? (
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.22em] text-brand-orange">Cruisers Crib</p>
            <p className="mt-1 truncate text-sm font-semibold tracking-tight text-ink-primary">
              Auto Care Center
            </p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.group ?? '_overview'}>
            {section.group && !collapsed ? (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-dim">
                {section.group}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <PortalLink
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={`
                      flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-150
                      ${collapsed ? 'justify-center' : ''}
                      ${active ? 'text-ink-primary' : 'text-ink-muted hover:bg-surface-hover/70 hover:text-ink-primary'}
                    `}
                    style={
                      active
                        ? {
                            background:
                              'linear-gradient(90deg, rgb(var(--brand-orange) / 0.14), rgb(var(--brand-orange) / 0.03))',
                            color: 'rgb(var(--ink-primary))',
                            border: '1px solid rgb(var(--brand-orange) / 0.14)',
                          }
                        : {}
                    }
                  >
                    <Icon size={18} className={`flex-shrink-0 ${active ? 'text-brand-orange' : ''}`} />
                    {!collapsed ? <span className="min-w-0 leading-5">{label}</span> : null}
                    {!collapsed && active ? (
                      <span className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-brand-orange" />
                    ) : null}
                  </PortalLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-surface-border px-3 pb-4 pt-3">
        <button
          onClick={onToggle}
          className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-medium
            text-ink-dim transition-all duration-150 hover:bg-surface-hover hover:text-ink-secondary
            ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? (
            <ChevronRight size={15} />
          ) : (
            <>
              <ChevronLeft size={15} />
              <span>Collapse navigation</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
