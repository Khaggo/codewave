'use client'

import PortalLink from '@/components/PortalLink'
import PageHeader from '@/components/ui/PageHeader'
import {
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  ReceiptText,
  Users,
  Wrench,
} from 'lucide-react'

import { appointments, jobOrders, timelineEvents, vehicles } from '@/lib/mockData'
import { useUser } from '@/lib/userContext'

const adminShortcuts = [
  {
    href: '/admin/users',
    label: 'Staff Accounts',
    description: 'Provision and manage staff access.',
    icon: Users,
    superAdminOnly: true,
  },
  {
    href: '/admin/services',
    label: 'Service Management',
    description: 'Maintain bookable service offerings.',
    icon: Wrench,
  },
  {
    href: '/admin/catalog',
    label: 'Catalog Admin',
    description: 'Manage visible product listings.',
    icon: ClipboardList,
  },
  {
    href: '/admin/inventory',
    label: 'Inventory Admin',
    description: 'Review stock health and inventory records.',
    icon: ClipboardCheck,
  },
  {
    href: '/admin/summaries',
    label: 'Analytics',
    description: 'Open reporting and operational summaries.',
    icon: ReceiptText,
  },
]

const statusMeta = {
  confirmed: { label: 'Ready', className: 'badge-blue' },
  assigned: { label: 'Assigned', className: 'badge-blue' },
  in_progress: { label: 'In progress', className: 'badge-orange' },
  blocked: { label: 'Blocked', className: 'badge-red' },
  completed: { label: 'Completed', className: 'badge-green' },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(value) {
  if (!value) {
    return 'No date available'
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  })
}

function getVehicleRecord(vehicleId) {
  return vehicles.find((item) => item.id === vehicleId)
}

function getStatusInfo(status) {
  return statusMeta[status] ?? { label: 'Queued', className: 'badge-gray' }
}

function StatCard({ label, value, description }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink-primary">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{description}</p>
    </div>
  )
}

function WorkRow({ item }) {
  const status = getStatusInfo(item.status)

  return (
    <li className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.1fr)_180px_180px_160px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ink-primary">{item.vehicleLabel}</p>
          <span className={`badge ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-sm text-ink-secondary">{item.owner}</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{item.serviceSummary}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Assigned</p>
        <p className="mt-1 text-sm text-ink-primary">{item.technician || 'Awaiting assignment'}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Target date</p>
        <p className="mt-1 text-sm text-ink-primary">{formatDate(item.date)}</p>
      </div>

      <div className="flex items-center gap-3 lg:justify-end">
        <PortalLink href={`/admin/job-orders?jobOrderId=${encodeURIComponent(item.id)}`} className="btn-ghost min-h-10 px-3">
          Open
        </PortalLink>
      </div>
    </li>
  )
}

function ActivityItem({ event }) {
  const vehicle = getVehicleRecord(event.vehicleId)

  return (
    <li className="rounded-2xl border border-surface-border bg-surface-raised/60 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-ink-primary">{vehicle?.model ?? 'Vehicle record'}</p>
        <span className="text-xs text-ink-muted">• {formatDate(event.date)}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{event.description}</p>
      <p className="mt-2 text-xs text-ink-muted">
        {event.technicianName ? `Updated by ${event.technicianName}` : 'Recorded by operations staff'}
      </p>
    </li>
  )
}

function EmptyPanel({ title, body }) {
  return (
    <div className="empty-panel">
      <p className="text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{body}</p>
    </div>
  )
}

function AdminShortcutTile({ item }) {
  const Icon = item.icon

  return (
    <PortalLink
      href={item.href}
      className="flex items-start gap-3 rounded-2xl border border-surface-border bg-surface-card px-4 py-4 transition-all duration-150 hover:border-brand-orange/25 hover:bg-surface-hover/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-brand-orange">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-primary">{item.label}</p>
        <p className="mt-1 text-sm leading-6 text-ink-secondary">{item.description}</p>
      </div>
    </PortalLink>
  )
}

function TechnicianQueueRow({ item }) {
  const status = getStatusInfo(item.status)

  return (
    <li className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_160px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ink-primary">{item.vehicleLabel}</p>
          <span className={`badge ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-sm text-ink-secondary">{item.owner}</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{item.serviceSummary}</p>
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Latest update</p>
        <p className="mt-1 text-sm text-ink-primary">{item.latestUpdate}</p>
      </div>

      <div className="flex items-center gap-3 lg:justify-end">
        <PortalLink href={`/admin/job-orders?jobOrderId=${encodeURIComponent(item.id)}`} className="btn-primary min-h-10 px-3">
          Open Job Order
        </PortalLink>
      </div>
    </li>
  )
}

export default function Dashboard() {
  const user = useUser()
  const firstName = user?.name?.split(' ')[0] ?? 'Staff'
  const isTechnician = user?.role === 'technician'

  const visibleAdminShortcuts = adminShortcuts.filter((item) => !item.superAdminOnly || user?.role === 'super_admin')

  const activeJobOrders = jobOrders
    .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
    .map((item) => {
      const vehicle = getVehicleRecord(item.vehicleId)
      const relatedEvents = timelineEvents.filter((entry) => entry.jobOrderId === item.id)

      return {
        ...item,
        owner: vehicle?.owner ?? 'Customer record unavailable',
        vehicleLabel: vehicle ? `${vehicle.model} • ${vehicle.plate}` : item.vehicleId,
        serviceSummary: item.services.join(', '),
        latestUpdate: relatedEvents[0]?.description ?? 'No execution update recorded yet',
      }
    })
    .sort((left, right) => {
      const rank = { in_progress: 0, assigned: 1, confirmed: 2, blocked: 3 }
      return (rank[left.status] ?? 99) - (rank[right.status] ?? 99)
    })

  const technicianQueue = activeJobOrders
  const pendingBookings = appointments.filter((item) => ['pending', 'confirmed'].includes(item.status)).length
  const activeRepairs = activeJobOrders.filter((item) => item.status === 'in_progress').length
  const intakeReady = appointments.filter((item) => item.serviceStage === 'intake' || item.status === 'confirmed').length
  const completedToday = timelineEvents.filter((item) => item.type === 'service' && item.category === 'verified').length
  const recentActivity = [...timelineEvents]
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .slice(0, 4)
  const blockedCount = technicianQueue.filter((item) => item.status === 'blocked').length
  const readyToStartCount = technicianQueue.filter((item) => ['confirmed', 'assigned'].includes(item.status)).length

  if (isTechnician) {
    return (
      <div className="ops-page-shell">
        <PageHeader
          eyebrow="Technician Workspace"
          title={`${getGreeting()}, ${firstName}`}
          description="Review assigned work and keep repair progress current."
          actions={
            <>
              <PortalLink href="/admin/intake-inspections" className="btn-ghost">
                <ClipboardCheck size={14} />
                Inspection History
              </PortalLink>
              <PortalLink href="/admin/job-orders" className="btn-primary">
                <Wrench size={14} />
                Open Workbench
              </PortalLink>
            </>
          }
        />

        <section className="ops-summary-grid">
          <StatCard
            label="Assigned job orders"
            value={technicianQueue.length}
            description="Work currently assigned to your queue."
          />
          <StatCard
            label="In progress"
            value={activeRepairs}
            description="Repairs awaiting progress or completion updates."
          />
          <StatCard
            label="Ready to start"
            value={readyToStartCount}
            description="Confirmed work ready for workshop execution."
          />
          <StatCard
            label="Blocked"
            value={blockedCount}
            description="Work waiting on parts, approval, or review."
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <div className="table-surface">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
              <div>
                <p className="card-title">Assigned Work</p>
                <p className="mt-1 text-sm leading-6 text-ink-secondary">
                  Open a job order to update progress or review intake history.
                </p>
              </div>
              <span className="badge badge-gray">{technicianQueue.length} open items</span>
            </div>

            {technicianQueue.length ? (
              <ul className="divide-y divide-surface-border">
                {technicianQueue.map((item) => (
                  <TechnicianQueueRow key={item.id} item={item} />
                ))}
              </ul>
            ) : (
              <div className="p-5">
                <EmptyPanel
                  title="No assigned work right now"
                  body="New technician assignments will appear here once a job order is handed off for execution."
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="card-title">Today&apos;s Focus</p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    Keep workshop updates current for the rest of the staff.
                  </p>
                </div>
                <span className={`badge ${blockedCount > 0 ? 'badge-red' : 'badge-green'}`}>
                  {blockedCount > 0 ? `${blockedCount} blocked` : 'Clear'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-surface-border bg-surface-raised/60 px-4 py-4">
                  <p className="text-sm font-semibold text-ink-primary">Prioritize active repairs</p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    Update in-progress work first so the front desk sees the latest workshop status.
                  </p>
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-raised/60 px-4 py-4">
                  <p className="text-sm font-semibold text-ink-primary">Review intake before repair</p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    Use intake history whenever condition notes or prior findings affect the repair.
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <p className="card-title">Quick links</p>
              <div className="mt-4 grid gap-3">
                <PortalLink href="/admin/intake-inspections" className="btn-ghost justify-between">
                  <span className="inline-flex items-center gap-2">
                    <ClipboardCheck size={14} />
                    Intake Inspection
                  </span>
                  <ArrowRight size={14} />
                </PortalLink>
                <PortalLink href="/admin/job-orders" className="btn-ghost justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Wrench size={14} />
                    Job Order Workbench
                  </span>
                  <ArrowRight size={14} />
                </PortalLink>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations Dashboard"
        title={`${getGreeting()}, ${firstName}`}
        description="Manage booking, intake, job-order, QA, and finance work from one workspace."
        actions={
          <PortalLink href="/bookings" className="btn-primary">
            <CalendarCheck size={14} />
            Start booking flow
          </PortalLink>
        }
        meta={<span className="badge badge-gray">{user?.roleLabel ?? user?.role ?? 'Staff access'}</span>}
      />

      <section className="ops-summary-grid">
        <StatCard
          label="Pending bookings"
          value={pendingBookings}
          description="Reservations that still need payment review, approval, or schedule confirmation."
        />
        <StatCard
          label="Active job orders"
          value={activeJobOrders.length}
          description="Open workshop work that has not yet been fully completed."
        />
        <StatCard
          label="Intake ready"
          value={intakeReady}
          description="Vehicles ready for inspection or service handoff review."
        />
        <StatCard
          label="Completed updates"
          value={completedToday}
          description="Recent verified service updates already logged in the system."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="table-surface">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
            <div>
              <p className="card-title">Pending Work</p>
              <p className="mt-1 text-sm leading-6 text-ink-secondary">
                Follow the active workshop load first, then move confirmed work into the next service step.
              </p>
            </div>
            <PortalLink href="/admin/job-orders" className="btn-ghost min-h-10 px-3">
              Open job orders
            </PortalLink>
          </div>

          {activeJobOrders.length ? (
            <ul className="divide-y divide-surface-border">
              {activeJobOrders.map((item) => (
                <WorkRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <EmptyPanel
                title="No pending work"
                body="When bookings move into active execution, open work items will appear here for quick follow-up."
              />
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="card-title">Recent Activity</p>
                <p className="mt-1 text-sm leading-6 text-ink-secondary">
                  The latest recorded work across service, inspection, and administrative updates.
                </p>
              </div>
              <span className="badge badge-gray">{recentActivity.length} updates</span>
            </div>

            {recentActivity.length ? (
              <ul className="mt-4 space-y-3">
                {recentActivity.map((event) => (
                  <ActivityItem key={event.id} event={event} />
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyPanel
                  title="No recent activity yet"
                  body="Activity updates will appear here once staff records new booking, inspection, or workshop events."
                />
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="card-title">Admin Shortcuts</p>
                <p className="mt-1 text-sm leading-6 text-ink-secondary">
                  Frequently used management workspaces for operations and administrative setup.
                </p>
              </div>
              <span className="badge badge-gray">{visibleAdminShortcuts.length} available</span>
            </div>

            <div className="mt-4 grid gap-3">
              {visibleAdminShortcuts.map((item) => (
                <AdminShortcutTile key={item.href} item={item} />
              ))}
            </div>
          </div>

          {activeJobOrders.length === 0 ? (
            <EmptyPanel
              title="Operations queue is clear"
              body="Use the booking schedule to review new reservations or open another workspace from the shortcuts above."
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}
