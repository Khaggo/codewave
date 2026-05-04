'use client'

import PortalLink from '@/components/PortalLink'
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'

import { jobOrders, timelineEvents, vehicles } from '@/lib/mockData'
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

const technicianStatusMeta = {
  confirmed: { label: 'Ready to start', badge: 'badge-blue' },
  assigned: { label: 'Assigned', badge: 'badge-blue' },
  in_progress: { label: 'In progress', badge: 'badge-orange' },
  blocked: { label: 'Blocked', badge: 'badge-red' },
  completed: { label: 'Completed', badge: 'badge-green' },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTechnicianStatus(status) {
  return (
    technicianStatusMeta[status]?.label ??
    String(status ?? '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )
}

function RouteCard({ item }) {
  const Icon = item.icon

  return (
    <PortalLink href={item.href} className="card group p-5 transition-colors hover:border-brand-orange/50">
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
    </PortalLink>
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

function TechnicianSummaryCard({ icon: Icon, label, value, copy }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-ink-primary">{value}</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{copy}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function TechnicianTaskCard({ task }) {
  const meta = technicianStatusMeta[task.status] ?? technicianStatusMeta.confirmed

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">{task.id}</p>
          <h3 className="mt-2 text-lg font-black text-ink-primary">{task.vehicleLabel}</h3>
          <p className="mt-1 text-sm text-ink-secondary">{task.owner}</p>
        </div>
        <span className={`badge ${meta.badge}`}>{meta.label}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Work order</p>
          <p className="mt-1 text-sm text-ink-primary">{task.serviceSummary}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Shop</p>
          <p className="mt-1 text-sm text-ink-primary">{task.shopName}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Last update</p>
          <p className="mt-1 text-sm text-ink-primary">{task.latestUpdate}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PortalLink href={`/admin/job-orders?jobOrderId=${encodeURIComponent(task.id)}`} className="ops-action-primary">
          <Wrench size={14} />
          Open Job Order
        </PortalLink>
        <PortalLink href={`/admin/intake-inspections?vehicleId=${encodeURIComponent(task.vehicleId)}`} className="ops-action-secondary">
          <ClipboardCheck size={14} />
          Inspection History
        </PortalLink>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user = useUser()
  const firstName = user?.name?.split(' ')[0] ?? 'Admin'
  const visibleAdminShortcuts = adminShortcuts.filter((item) => !item.superAdminOnly || user?.role === 'super_admin')
  const isTechnician = user?.role === 'technician'

  const technicianQueue = jobOrders
    .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
    .map((item) => {
      const vehicle = vehicles.find((entry) => entry.id === item.vehicleId)
      const relatedEvents = timelineEvents.filter((entry) => entry.jobOrderId === item.id)
      const latestEvent = relatedEvents[0]

      return {
        ...item,
        owner: vehicle?.owner ?? 'Customer record unavailable',
        vehicleLabel: vehicle ? `${vehicle.model} • ${vehicle.plate}` : item.vehicleId,
        serviceSummary: item.services.join(', '),
        latestUpdate: latestEvent?.description ?? 'Waiting for first workshop update',
      }
    })
    .sort((left, right) => {
      const rank = { in_progress: 0, assigned: 1, confirmed: 2, blocked: 3 }
      return (rank[left.status] ?? 99) - (rank[right.status] ?? 99)
    })

  const inProgressCount = technicianQueue.filter((item) => item.status === 'in_progress').length
  const readyToStartCount = technicianQueue.filter((item) => item.status === 'confirmed' || item.status === 'assigned').length
  const needsUpdateCount = technicianQueue.filter((item) => item.status !== 'completed').length
  const blockedCount = technicianQueue.filter((item) => item.status === 'blocked').length

  if (isTechnician) {
    return (
      <div className="ops-page-shell">
        <section className="ops-page-header">
          <div className="space-y-2">
            <p className="ops-page-kicker">Technician Workspace</p>
            <h1 className="ops-page-title">
              {getGreeting()}, {firstName}
            </h1>
            <p className="ops-page-copy">
              Review your assigned job orders, open the next vehicle in your queue, and keep progress,
              evidence, and intake history updated from one focused work surface.
            </p>
          </div>
          <PortalLink href="/admin/job-orders" className="ops-action-primary min-w-[160px] self-start xl:self-auto">
            <Wrench size={14} />
            Open Workbench
          </PortalLink>
        </section>

        <section className="ops-summary-grid">
          <TechnicianSummaryCard
            icon={Wrench}
            label="Assigned job orders"
            value={technicianQueue.length}
            copy="Live work currently in your technician queue."
          />
          <TechnicianSummaryCard
            icon={AlertTriangle}
            label="In progress"
            value={inProgressCount}
            copy="Jobs that already need execution updates or completion evidence."
          />
          <TechnicianSummaryCard
            icon={ClipboardCheck}
            label="Needs update"
            value={needsUpdateCount}
            copy="Assigned work that should keep progress notes and photos current."
          />
          <TechnicianSummaryCard
            icon={CheckCircle2}
            label="Ready to start"
            value={readyToStartCount}
            copy="Confirmed jobs waiting for workshop execution."
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="ops-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="card-title">My Assigned Job Orders</p>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  Open a job order to add technician progress, attach evidence, or continue vehicle work.
                </p>
              </div>
              <span className="badge badge-gray">{technicianQueue.length} active tasks</span>
            </div>

            <div className="mt-5 space-y-4">
              {technicianQueue.length ? (
                technicianQueue.map((task) => <TechnicianTaskCard key={task.id} task={task} />)
              ) : (
                <div className="rounded-2xl border border-surface-border bg-surface-card px-5 py-10 text-center">
                  <CheckCircle2 size={28} className="mx-auto text-emerald-400" />
                  <p className="mt-3 text-sm font-bold text-ink-primary">No assigned work in queue</p>
                  <p className="mt-2 text-sm text-ink-muted">
                    Your technician dashboard is clear right now. New assigned job orders will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="ops-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="card-title">Today&apos;s Focus</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    The dashboard stays centered on technician execution instead of admin routing.
                  </p>
                </div>
                <span className={`badge ${blockedCount > 0 ? 'badge-red' : 'badge-green'}`}>
                  {blockedCount > 0 ? `${blockedCount} blocked` : 'No blocked jobs'}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Start with active work</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    Prioritize job orders already marked in progress so the service adviser sees fresh workshop updates.
                  </p>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Use intake history before repair</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    Open the linked inspection history when you need prior condition notes before continuing work.
                  </p>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Attach evidence early</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    Photo evidence and progress notes make QA and release review smoother once the repair is done.
                  </p>
                </div>
              </div>
            </div>

            <div className="ops-panel">
              <div>
                <p className="card-title">Technician Tools</p>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  Jump straight into the two work surfaces technicians use most during execution.
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <PortalLink href="/admin/intake-inspections" className="rounded-2xl border border-surface-border bg-surface-card p-4 transition-colors hover:border-brand-orange/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink-primary">Intake Inspection</p>
                      <p className="mt-2 text-sm leading-6 text-ink-secondary">
                        Review vehicle condition history and capture new findings tied to a known vehicle.
                      </p>
                    </div>
                    <ClipboardCheck size={18} className="text-brand-orange" />
                  </div>
                </PortalLink>
                <PortalLink href="/admin/job-orders" className="rounded-2xl border border-surface-border bg-surface-card p-4 transition-colors hover:border-brand-orange/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink-primary">Job Order Workbench</p>
                      <p className="mt-2 text-sm leading-6 text-ink-secondary">
                        Load a known job order, record progress, change status, and upload photo evidence.
                      </p>
                    </div>
                    <Wrench size={18} className="text-brand-orange" />
                  </div>
                </PortalLink>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

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
          <PortalLink href="/bookings" className="btn-primary">
            <CalendarCheck size={15} />
            Start With Bookings
          </PortalLink>
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
