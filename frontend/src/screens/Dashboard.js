'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  ReceiptText,
  RefreshCcw,
  Users,
  Wrench,
} from 'lucide-react'

import PortalLink from '@/components/PortalLink'
import PageHeader from '@/components/ui/PageHeader'
import { getDashboardAnalytics, getOperationsAnalytics } from '@/lib/analyticsAdminClient'
import { ApiError } from '@/lib/authClient'
import { listJobOrderWorkbenchSummaries } from '@/lib/jobOrderWorkbenchClient'
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
  confirmed: { label: 'Confirmed', className: 'badge-blue' },
  assigned: { label: 'Assigned', className: 'badge-blue' },
  in_progress: { label: 'In Progress', className: 'badge-orange' },
  blocked: { label: 'Blocked', className: 'badge-red' },
  completed: { label: 'Completed', className: 'badge-green' },
  ready_for_qa: { label: 'QA Review', className: 'badge-orange' },
  finalized: { label: 'Finalized', className: 'badge-green' },
  pending_payment: { label: 'Pending Payment', className: 'badge-orange' },
}

const createInitialState = () => ({
  status: 'idle',
  dashboardAnalytics: null,
  operationsAnalytics: null,
  workbenchSummaries: [],
  errorMessage: '',
})

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(value, options = {}) {
  if (!value) {
    return 'Not available'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    ...(options.includeYear ? { year: 'numeric' } : {}),
    ...(options.includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

function getStatusInfo(status) {
  return statusMeta[status] ?? { label: 'Queued', className: 'badge-gray' }
}

function EmptyPanel({ title, body, action = null }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border bg-surface-raised/50 px-5 py-6">
      <p className="text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
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

function ShortcutCard({ item }) {
  const Icon = item.icon

  return (
    <PortalLink href={item.href} className="card flex items-start gap-4 p-5 transition hover:border-[rgba(240,124,0,0.35)] hover:bg-surface-hover">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(240,124,0,0.12)] text-[#f07c00]">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-ink-primary">{item.label}</p>
          <ArrowRight size={14} className="text-ink-muted" />
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.description}</p>
      </div>
    </PortalLink>
  )
}

function WorkbenchRow({ item }) {
  const status = getStatusInfo(item.status)
  const assignedCount = Array.isArray(item.assignedTechnicianIds) ? item.assignedTechnicianIds.length : 0

  return (
    <li className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_160px_180px_180px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-ink-primary">{item.id}</p>
          <span className={`badge ${status.className}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-sm text-ink-secondary capitalize">
          {item.sourceType?.replace(/_/g, ' ') ?? 'Job order'} work item
        </p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Work date</p>
        <p className="mt-1 text-sm text-ink-primary">{formatDate(item.workDate, { includeYear: true })}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Technicians</p>
        <p className="mt-1 text-sm text-ink-primary">{assignedCount > 0 ? assignedCount : 'Unassigned'}</p>
      </div>

      <div className="flex items-center gap-3 lg:justify-end">
        <PortalLink
          href={`/admin/job-orders?jobOrderId=${encodeURIComponent(item.id)}`}
          className="btn-primary min-h-10 px-3"
        >
          Open Job Order
        </PortalLink>
      </div>
    </li>
  )
}

export default function Dashboard() {
  const user = useUser()
  const [state, setState] = useState(createInitialState)
  const firstName = user?.name?.split(' ')[0] ?? 'Staff'
  const isTechnician = ['technician', 'head_technician'].includes(user?.role)
  const isHeadTechnician = user?.role === 'head_technician'

  const visibleAdminShortcuts = useMemo(
    () => adminShortcuts.filter((item) => !item.superAdminOnly || user?.role === 'super_admin'),
    [user?.role],
  )

  const loadDashboard = useCallback(async () => {
    if (!user?.accessToken) {
      setState({
        status: 'error',
        dashboardAnalytics: null,
        operationsAnalytics: null,
        workbenchSummaries: [],
        errorMessage: 'Sign in as staff before loading dashboard data.',
      })
      return
    }

    setState((currentState) => ({ ...currentState, status: 'loading', errorMessage: '' }))

    try {
      const workbenchPromise = listJobOrderWorkbenchSummaries({
        accessToken: user.accessToken,
        month: getCurrentMonthKey(),
      })

      if (isTechnician) {
        const workbenchSummaries = await workbenchPromise

        setState({
          status: 'ready',
          dashboardAnalytics: null,
          operationsAnalytics: null,
          workbenchSummaries,
          errorMessage: '',
        })
        return
      }

      const [dashboardAnalytics, operationsAnalytics, workbenchSummaries] = await Promise.all([
        getDashboardAnalytics(user.accessToken),
        getOperationsAnalytics(user.accessToken),
        workbenchPromise,
      ])

      setState({
        status: 'ready',
        dashboardAnalytics,
        operationsAnalytics,
        workbenchSummaries,
        errorMessage: '',
      })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : 'Unable to load the live operations dashboard right now.'

      setState({
        status: 'error',
        dashboardAnalytics: null,
        operationsAnalytics: null,
        workbenchSummaries: [],
        errorMessage: message,
      })
    }
  }, [isTechnician, user?.accessToken])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const activeJobOrders = useMemo(
    () =>
      state.workbenchSummaries
        .filter((item) => !['completed', 'cancelled', 'finalized'].includes(item.status))
        .sort((left, right) => new Date(right.updatedAt ?? 0) - new Date(left.updatedAt ?? 0)),
    [state.workbenchSummaries],
  )

  const technicianQueue = useMemo(
    () =>
      activeJobOrders.filter((item) =>
        ['assigned', 'in_progress', 'blocked', 'confirmed', 'ready_for_qa'].includes(item.status),
      ),
    [activeJobOrders],
  )

  const blockedCount = technicianQueue.filter((item) => item.status === 'blocked').length
  const readyToStartCount = technicianQueue.filter((item) => ['confirmed', 'assigned'].includes(item.status)).length
  const activeRepairs = technicianQueue.filter((item) => item.status === 'in_progress').length
  const operationsSummary = state.operationsAnalytics
  const dashboardSummary = state.dashboardAnalytics
  const bookingStatuses = operationsSummary?.bookingStatuses ?? []
  const jobOrderStatuses = operationsSummary?.jobOrderStatuses ?? []
  const serviceDemand = operationsSummary?.serviceDemand?.slice(0, 4) ?? []

  const loadingAction = (
    <button type="button" onClick={() => void loadDashboard()} className="btn-ghost" disabled={state.status === 'loading'}>
      <RefreshCcw size={14} className={state.status === 'loading' ? 'animate-spin' : ''} />
      Refresh
    </button>
  )

  if (isTechnician) {
    return (
      <div className="ops-page-shell">
        <PageHeader
          eyebrow={isHeadTechnician ? 'Head Technician Workspace' : 'Technician Workspace'}
          title={`${getGreeting()}, ${firstName}`}
          description="Review assigned work and keep repair progress current."
          actions={
            <>
              {loadingAction}
              <PortalLink href="/admin/job-orders" className="btn-primary">
                <Wrench size={14} />
                Open Workbench
              </PortalLink>
            </>
          }
        />

        <section className="ops-summary-grid">
          <StatCard label="Assigned job orders" value={technicianQueue.length} description="Live work currently in your workshop queue." />
          <StatCard label="In progress" value={activeRepairs} description="Repairs awaiting progress or completion updates." />
          <StatCard label="Ready to start" value={readyToStartCount} description="Confirmed work ready for workshop execution." />
          <StatCard label="Blocked" value={blockedCount} description="Work waiting on parts, approval, or QA resolution." />
        </section>

        {state.status === 'error' ? (
          <EmptyPanel
            title="Unable to load workshop assignments"
            body={state.errorMessage}
            action={
              <button type="button" onClick={() => void loadDashboard()} className="btn-primary">
                Try again
              </button>
            }
          />
        ) : (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <div className="table-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                <div>
                  <p className="card-title">Assigned Work</p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    This list is sourced from live job-order summaries for the current month.
                  </p>
                </div>
                <span className="badge badge-gray">{technicianQueue.length} open items</span>
              </div>

              {technicianQueue.length ? (
                <ul className="divide-y divide-surface-border">
                  {technicianQueue.slice(0, 8).map((item) => (
                    <WorkbenchRow key={item.id} item={item} />
                  ))}
                </ul>
              ) : (
                <div className="p-5">
                  <EmptyPanel
                    title="No assigned work right now"
                    body="New technician assignments will appear here once a live job order is handed off for execution."
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="card-title">Live queue status</p>
                    <p className="mt-1 text-sm leading-6 text-ink-secondary">
                      Snapshot refreshed {formatDate(operationsSummary?.refreshedAt, { includeYear: true, includeTime: true })}.
                    </p>
                  </div>
                  <span className={`badge ${blockedCount > 0 ? 'badge-red' : 'badge-green'}`}>
                    {blockedCount > 0 ? `${blockedCount} blocked` : 'Clear'}
                  </span>
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
        )}
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
          <>
            {loadingAction}
            <PortalLink href="/bookings" className="btn-primary">
              <CalendarCheck size={14} />
              Start booking flow
            </PortalLink>
          </>
        }
        meta={<span className="badge badge-gray">{user?.roleLabel ?? user?.role ?? 'Staff access'}</span>}
      />

      {state.status === 'error' ? (
        <EmptyPanel
          title="Unable to load live dashboard data"
          body={state.errorMessage}
          action={
            <button type="button" onClick={() => void loadDashboard()} className="btn-primary">
              Try again
            </button>
          }
        />
      ) : (
        <>
          <section className="ops-summary-grid">
            {(dashboardSummary?.totalSignals ?? []).map((signal) => (
              <StatCard key={signal.key} label={signal.label} value={signal.value} description={signal.note} />
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="space-y-5">
              <div className="table-surface">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                  <div>
                    <p className="card-title">Live Operations Pulse</p>
                    <p className="mt-1 text-sm leading-6 text-ink-secondary">
                      Counts and demand signals come from the rebuilt analytics snapshot.
                    </p>
                  </div>
                  <span className="badge badge-green">
                    Refreshed {dashboardSummary?.refreshedAtLabel ?? 'Not available'}
                  </span>
                </div>

                <div className="grid gap-4 px-5 py-5 lg:grid-cols-3">
                  <div className="rounded-2xl border border-surface-border bg-surface-raised/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Booking statuses</p>
                    <div className="mt-3 space-y-2">
                      {bookingStatuses.length ? bookingStatuses.slice(0, 4).map((entry) => (
                        <div key={entry.status} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-ink-secondary">{entry.label}</span>
                          <span className="font-semibold text-ink-primary">{entry.count}</span>
                        </div>
                      )) : <p className="text-sm text-ink-muted">No booking snapshot data yet.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-surface-border bg-surface-raised/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Job-order statuses</p>
                    <div className="mt-3 space-y-2">
                      {jobOrderStatuses.length ? jobOrderStatuses.slice(0, 4).map((entry) => (
                        <div key={entry.status} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-ink-secondary">{entry.label}</span>
                          <span className="font-semibold text-ink-primary">{entry.count}</span>
                        </div>
                      )) : <p className="text-sm text-ink-muted">No job-order snapshot data yet.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-surface-border bg-surface-raised/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Top services</p>
                    <div className="mt-3 space-y-2">
                      {serviceDemand.length ? serviceDemand.map((entry) => (
                        <div key={entry.serviceId ?? entry.serviceName} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-ink-secondary">{entry.serviceName}</span>
                          <span className="font-semibold text-ink-primary">{entry.bookingCount}</span>
                        </div>
                      )) : <p className="text-sm text-ink-muted">No service-demand data yet.</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="table-surface">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                  <div>
                    <p className="card-title">Active Job Orders</p>
                    <p className="mt-1 text-sm leading-6 text-ink-secondary">
                      Live workbench entries for this month. Open a record to continue intake, QA, or invoice work.
                    </p>
                  </div>
                  <span className="badge badge-gray">{activeJobOrders.length} active items</span>
                </div>

                {activeJobOrders.length ? (
                  <ul className="divide-y divide-surface-border">
                    {activeJobOrders.slice(0, 6).map((item) => (
                      <WorkbenchRow key={item.id} item={item} />
                    ))}
                  </ul>
                ) : (
                  <div className="p-5">
                    <EmptyPanel
                      title="No active job orders yet"
                      body="Once confirmed bookings move into workshop execution, the live workbench queue will appear here."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <p className="card-title">Quick links</p>
                <div className="mt-4 grid gap-3">
                  {visibleAdminShortcuts.map((item) => (
                    <ShortcutCard key={item.href} item={item} />
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <p className="card-title">Snapshot status</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-secondary">Analytics refresh</span>
                    <span className="font-semibold text-ink-primary">
                      {dashboardSummary?.refreshedAtLabel ?? 'Not available'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-secondary">Operations refresh</span>
                    <span className="font-semibold text-ink-primary">
                      {operationsSummary?.refreshedAtLabel ?? 'Not available'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-secondary">Monthly workbench entries</span>
                    <span className="font-semibold text-ink-primary">{state.workbenchSummaries.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
