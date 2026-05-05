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
  '/timeline': ClipboardList,
  '/insurance': ShieldCheck,
  '/loyalty': Award,
  '/shop': ShoppingBag,
  '/admin/services': Wrench,
  '/admin/catalog': Boxes,
  '/admin/inventory': ShoppingBag,
  '/admin/users': Users,
  '/admin/appointments': CalendarCheck,
  '/admin/summaries': BarChart3,
  '/settings': Cog,
}

const LABEL_BY_KEY = {
  bookings: '1. Booking Schedule',
  'digital-intake-inspections': '2. Intake Inspection',
  'job-orders-admin': '3. Job Orders',
  'qa-audit': '4. QA Audit',
  'invoice-order-management': '5. Invoices & Orders',
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
        fixed top-0 left-0 h-screen z-30 flex flex-col
        bg-surface-card border-r border-surface-border
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[60px]' : 'w-56'}
      `}
    >
      <div
        className={`flex h-16 items-center gap-3 border-b border-surface-border
                       ${collapsed ? 'px-2 justify-center' : 'px-4'}`}
      >
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg,#f07c00,#c9951a)' }}
        >
          <Cog size={21} className="text-white" />
        </div>
        {!collapsed ? (
          <div className="overflow-hidden leading-none">
            <p className="text-base font-extrabold text-ink-primary tracking-tight whitespace-nowrap">CRUISERS CRIB</p>
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
                  <PortalLink
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
                  </PortalLink>
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
