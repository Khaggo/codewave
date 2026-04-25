'use client'

import Link from 'next/link'
import {
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  FileSearch,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'

import { useUser } from '@/lib/userContext'

const workflowSteps = [
  {
    href: '/bookings',
    label: '1. Booking Schedule',
    description: 'Review customer booking requests, daily slots, queue state, and staff booking actions.',
    icon: CalendarCheck,
    status: 'Live backend',
  },
  {
    href: '/admin/intake-inspections',
    label: '2. Intake Inspection',
    description: 'Capture vehicle condition and load vehicle-scoped inspection history before service work.',
    icon: FileSearch,
    status: 'Known vehicle required',
  },
  {
    href: '/admin/job-orders',
    label: '3. Job Orders',
    description: 'Create job orders from confirmed bookings, add progress, photos, finalization, and payment records.',
    icon: Wrench,
    status: 'Live backend',
  },
  {
    href: '/admin/qa-audit',
    label: '4. QA Audit',
    description: 'Load quality gates, review findings, and record super-admin overrides when needed.',
    icon: ShieldCheck,
    status: 'Known job order required',
  },
  {
    href: '/admin/invoices',
    label: '5. Invoices & Orders',
    description: 'Lookup service invoice-ready job orders and known ecommerce order or invoice records.',
    icon: ReceiptText,
    status: 'Known record required',
  },
]

const adminShortcuts = [
  {
    href: '/admin/users',
    label: 'Staff Accounts',
    description: 'Create staff, mechanic, technician, and admin accounts with generated IDs and emails.',
    icon: Users,
    superAdminOnly: true,
  },
  {
    href: '/admin/catalog',
    label: 'Catalog Admin',
    description: 'Publish services and ecommerce catalog items for customer discovery.',
    icon: PackageSearch,
  },
  {
    href: '/admin/inventory',
    label: 'Inventory Admin',
    description: 'Review stock visibility and inventory records without demo-only placeholder alerts.',
    icon: PackageSearch,
  },
  {
    href: '/admin/summaries',
    label: 'Analytics',
    description: 'Open the analytics workspace for backend-backed operational summaries.',
    icon: BarChart3,
  },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function RouteCard({ item }) {
  const Icon = item.icon

  return (
    <Link href={item.href} className="card group p-5 transition-colors hover:border-brand-orange/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
          <Icon size={19} />
        </div>
        {item.status ? <span className="badge badge-gray">{item.status}</span> : null}
      </div>
      <h2 className="mt-5 text-lg font-black text-ink-primary">{item.label}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.description}</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
        Open workspace
      </p>
    </Link>
  )
}

function EmptyStateCard({ title, body }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border bg-surface-raised p-5">
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
    </div>
  )
}

export default function Dashboard() {
  const user = useUser()
  const firstName = user?.name?.split(' ')[0] ?? 'Admin'
  const visibleAdminShortcuts = adminShortcuts.filter((item) => !item.superAdminOnly || user?.role === 'super_admin')

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6 md:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-orange">
            Staff Portal
          </p>
          <h1 className="mt-3 text-3xl font-black text-ink-primary">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-secondary">
            This dashboard is now a live workflow launchpad. Demo-only revenue charts, stock warnings, and fake queues were removed so each card opens a real staff/admin surface.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xl font-black text-ink-primary">Recommended Demo Flow</p>
            <p className="mt-1 text-sm text-ink-muted">
              Follow this order when presenting booking to release.
            </p>
          </div>
          <Link href="/bookings" className="btn-primary">
            <CalendarCheck size={15} />
            Start With Bookings
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          {workflowSteps.map((item) => (
            <RouteCard key={item.href} item={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="card-title">Admin Shortcuts</p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                These pages are available according to your staff role guardrails.
              </p>
            </div>
            <span className="badge badge-gray">{user?.roleLabel ?? user?.role ?? 'Staff'}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {visibleAdminShortcuts.map((item) => (
              <RouteCard key={item.href} item={item} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <EmptyStateCard
            title="No fake notification feed"
            body="Header notifications intentionally show an empty state until the staff notification feed is connected."
          />
          <EmptyStateCard
            title="No demo-only finance cards"
            body="Invoice and order queues now require known live records instead of placeholder staff queues or export controls."
          />
          <EmptyStateCard
            title="No placeholder analytics on this landing page"
            body="Use Analytics for backend-backed summaries; this page focuses on clear navigation and demo flow."
          />
        </div>
      </section>
    </div>
  )
}
