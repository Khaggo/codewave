'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  FileClock,
  History,
  LoaderCircle,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'

import { useToast } from '@/components/Toast.jsx'
import PageHeader from '@/components/ui/PageHeader'
import { useUser } from '@/lib/userContext'
import {
  loadAdminAnalyticsSnapshot,
  refreshAdminAnalyticsSnapshot,
} from '@/lib/analyticsAdminClient'
import {
  adminAnalyticsTabs,
  analyticsDerivedStateLabel,
  analyticsFreshnessExpectation,
  canStaffReadAnalytics,
  createAdminAnalyticsSnapshot,
  getAdminAnalyticsLoadState,
  getAnalyticsFreshnessTone,
  getLoadedAdminAnalyticsSectionCount,
} from '@/lib/api/generated/analytics/staff-web-dashboard'
import { buildPartialErrorMessage, getVisibleAnalyticsTabs } from './adminAnalyticsView.mjs'

const TAB_ICONS = {
  overview: BarChart3,
  operations: Activity,
  backJobs: Wrench,
  loyalty: Award,
  invoiceAging: ReceiptText,
  auditTrail: History,
}

const FRESHNESS_META = {
  fresh: { label: 'Fresh Snapshot', badge: 'badge-green' },
  watch: { label: 'Check Freshness', badge: 'badge-orange' },
  stale: { label: 'Stale Snapshot', badge: 'badge-red' },
  unknown: { label: 'Snapshot Pending', badge: 'badge-gray' },
}

const SNAPSHOT_STATUS_META = {
  refreshing: { label: 'Refreshing Snapshot', badge: 'badge-blue' },
  stale: { label: 'Snapshot Stale', badge: 'badge-red' },
  rebuilt: { label: 'Live Snapshot Rebuilt', badge: 'badge-green' },
  partial: { label: 'Read Succeeded With Section Failures', badge: 'badge-orange' },
  pending: { label: 'Snapshot Pending', badge: 'badge-gray' },
}

const LOAD_STATE_LABELS = {
  analytics_ready: 'Waiting For Load',
  analytics_loading: 'Loading Live Read Models',
  analytics_loaded: 'Live Analytics Ready',
  analytics_partial: 'Partially Loaded',
  analytics_empty: 'Live Snapshot Empty',
  analytics_forbidden_role: 'Role Blocked',
  analytics_unauthorized: 'Sign-In Required',
  analytics_failed: 'Live Load Failed',
}

const formatNumber = (value) => Number(value ?? 0).toLocaleString('en-PH')

const formatShortDateTime = (value) => {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InfoPanel({ title, body, tone = 'info' }) {
  const Icon = tone === 'warning' ? AlertTriangle : Database
  const toneClassName =
    tone === 'warning'
      ? 'status-message status-message-warning'
      : 'status-message status-message-success'

  return (
    <div className={`${toneClassName} flex gap-3`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-raised">
        <Icon size={18} className={tone === 'warning' ? 'text-amber-400' : 'text-ink-muted'} />
      </div>
      <div>
        <p className="text-sm font-bold text-ink-primary">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ink-secondary">{body}</p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
          <p className="mt-2 text-3xl font-black text-ink-primary tabular-nums">{value}</p>
          {sub ? <p className="mt-2 text-xs leading-5 text-ink-muted">{sub}</p> : null}
        </div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(240,124,0,0.12)', color: '#f07c00' }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function StatusStrip({ items, fallback }) {
  if (!items?.length) {
    return <p className="text-sm text-ink-muted">{fallback}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={`${item.label}-${item.count}`} className="badge badge-blue">
          {item.label}: {formatNumber(item.count)}
        </span>
      ))}
    </div>
  )
}

function SectionShell({
  title,
  description,
  loading,
  errorMessage,
  hasData,
  emptyMessage,
  children,
}) {
  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border bg-surface-raised/70">
        <p className="text-lg font-bold text-ink-primary">{title}</p>
        <p className="text-sm text-ink-muted mt-1">{description}</p>
      </div>
      <div className="p-5">
        {loading && !hasData ? (
          <div className="empty-panel py-10">
            <LoaderCircle size={26} className="mx-auto mb-3 animate-spin text-brand-orange" />
            <p className="text-sm font-bold text-ink-primary">Loading Live Data</p>
            <p className="text-xs text-ink-muted mt-2">
              This section is waiting for the current analytics snapshot.
            </p>
          </div>
        ) : null}

        {!loading && errorMessage ? (
          <InfoPanel title={`${title} unavailable`} body={errorMessage} tone="warning" />
        ) : null}

        {!loading && !errorMessage && !hasData ? (
          <div className="empty-panel py-10">
            <Sparkles size={24} className="mx-auto mb-3 text-ink-muted" />
            <p className="text-sm font-bold text-ink-primary">No Derived Signals Yet</p>
            <p className="text-xs text-ink-muted mt-2 max-w-xl mx-auto">{emptyMessage}</p>
          </div>
        ) : null}

        {!loading && !errorMessage && hasData ? children : null}
      </div>
    </section>
  )
}

function DataTable({ headers, rows, emptyLabel }) {
  return (
    <div className="table-scroll">
      <table className="data-table min-w-[720px]">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows
          ) : (
            <tr>
              <td colSpan={headers.length} className="text-center text-ink-muted">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function AuditTrailTimeline({ entries }) {
  if (!entries?.length) {
    return <p className="text-sm text-ink-muted">No audit entries are present in the latest snapshot.</p>
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <article
          key={`${entry.sourceId}-${entry.occurredAt}`}
          className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                {entry.auditTypeLabel}
              </p>
              <h3 className="mt-2 text-base font-bold text-ink-primary">{entry.summary}</h3>
              <p className="mt-2 text-sm text-ink-muted">
                {entry.actionLabel} · {entry.occurredAtLabel}
              </p>
            </div>
            <span className="badge badge-blue">{entry.actorRoleLabel ?? 'System Event'}</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-surface-border px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Actor</p>
              <p className="mt-1 text-sm text-ink-primary break-all">{entry.actorLabel}</p>
            </div>
            <div className="rounded-xl border border-surface-border px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Target</p>
              <p className="mt-1 text-sm text-ink-primary break-all">{entry.targetLabel}</p>
            </div>
            <div className="rounded-xl border border-surface-border px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Source Domain</p>
              <p className="mt-1 text-sm text-ink-primary break-all">{entry.sourceDomain}</p>
            </div>
          </div>

          {entry.reason ? (
            <div className="mt-4 rounded-xl border border-surface-border bg-surface-card px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Reason</p>
              <p className="mt-1 text-sm text-ink-secondary">{entry.reason}</p>
            </div>
          ) : null}

          {entry.relatedCount > 0 ? (
            <p className="mt-4 text-xs text-ink-muted">
              Related entities tracked in snapshot: {formatNumber(entry.relatedCount)}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export default function AdminAnalyticsWorkspace() {
  const user = useUser()
  const { toast } = useToast()
  const [tab, setTab] = useState('overview')
  const [requestState, setRequestState] = useState('idle')
  const [snapshot, setSnapshot] = useState(() => createAdminAnalyticsSnapshot())
  const [errors, setErrors] = useState({})

  const canReadAnalytics = canStaffReadAnalytics(user?.role)
  const loadedSectionCount = useMemo(
    () => getLoadedAdminAnalyticsSectionCount(snapshot),
    [snapshot],
  )

  const derivedLoadState = useMemo(() => {
    if (!canReadAnalytics) {
      return 'analytics_forbidden_role'
    }

    if (!user?.accessToken) {
      return 'analytics_unauthorized'
    }

    if (requestState === 'loading' && loadedSectionCount === 0) {
      return 'analytics_loading'
    }

    return getAdminAnalyticsLoadState(snapshot, errors)
  }, [canReadAnalytics, errors, loadedSectionCount, requestState, snapshot, user?.accessToken])

  const refreshMoments = useMemo(
    () =>
      Object.values(snapshot)
        .map((section) => section?.refreshedAt)
        .filter(Boolean)
        .sort((left, right) => String(right).localeCompare(String(left))),
    [snapshot],
  )

  const latestRefresh = refreshMoments[0] ?? null
  const oldestRefresh = refreshMoments[refreshMoments.length - 1] ?? null
  const freshnessTone = getAnalyticsFreshnessTone(oldestRefresh)
  const freshnessMeta = FRESHNESS_META[freshnessTone]
  const partialErrorEntries = useMemo(
    () => Object.entries(errors).filter(([, value]) => Boolean(value)),
    [errors],
  )
  const visibleTabs = useMemo(
    () => getVisibleAnalyticsTabs(adminAnalyticsTabs),
    [],
  )
  const isBusy = requestState === 'loading' || requestState === 'refreshing'
  const snapshotStatusMeta = useMemo(() => {
    if (requestState === 'refreshing') {
      return SNAPSHOT_STATUS_META.refreshing
    }

    if (partialErrorEntries.length > 0) {
      return SNAPSHOT_STATUS_META.partial
    }

    if (freshnessTone === 'stale') {
      return SNAPSHOT_STATUS_META.stale
    }

    if (latestRefresh) {
      return SNAPSHOT_STATUS_META.rebuilt
    }

    return SNAPSHOT_STATUS_META.pending
  }, [freshnessTone, latestRefresh, partialErrorEntries.length, requestState])

  const loadAnalytics = useCallback(
    async ({ showToast = false, refreshSnapshot = false } = {}) => {
      if (!canReadAnalytics || !user?.accessToken) {
        return
      }

      setRequestState((currentState) =>
        currentState === 'idle' ? 'loading' : 'refreshing',
      )

      try {
        let refreshResult = null

        if (refreshSnapshot) {
          refreshResult = await refreshAdminAnalyticsSnapshot({
            accessToken: user.accessToken,
          })
        }

        const { snapshot: nextSnapshot, errors: nextErrors } =
          await loadAdminAnalyticsSnapshot({
            accessToken: user.accessToken,
          })

        setSnapshot(nextSnapshot)
        setErrors(nextErrors)
        setRequestState('ready')

        if (showToast) {
          const nextLoadState = getAdminAnalyticsLoadState(nextSnapshot, nextErrors)
          const loadedCount = getLoadedAdminAnalyticsSectionCount(nextSnapshot)

          toast({
            type:
              nextLoadState === 'analytics_failed'
                ? 'error'
                : nextLoadState === 'analytics_partial'
                  ? 'info'
                  : 'success',
            title:
              nextLoadState === 'analytics_partial'
                ? 'Analytics Partially Refreshed'
                : nextLoadState === 'analytics_failed'
                  ? 'Analytics Refresh Failed'
                  : refreshSnapshot
                    ? 'Live Snapshot Rebuilt'
                    : 'Analytics Refreshed',
            message:
              nextLoadState === 'analytics_failed'
                ? 'No analytics sections could be refreshed from the live backend.'
                : refreshSnapshot
                  ? `${loadedCount} analytics section${loadedCount === 1 ? '' : 's'} rebuilt from live source data.`
                  : `${loadedCount} analytics section${loadedCount === 1 ? '' : 's'} refreshed from the live backend.`,
            detail:
              refreshSnapshot && refreshResult?.refreshJob?.completedAt
                ? `Snapshot rebuild completed at ${new Date(refreshResult.refreshJob.completedAt).toLocaleString('en-PH')}.`
                : undefined,
          })
        }
      } catch (error) {
        setRequestState('ready')
        setErrors({
          dashboard:
            error instanceof Error
              ? error.message
              : 'Admin analytics could not be loaded.',
        })

        if (showToast) {
          toast({
            type: 'error',
            title: 'Analytics Refresh Failed',
            message:
              error instanceof Error
                ? error.message
                : 'Admin analytics could not be loaded.',
          })
        }
      }
    },
    [canReadAnalytics, toast, user?.accessToken],
  )

  useEffect(() => {
    if (canReadAnalytics && user?.accessToken) {
      void loadAnalytics()
    }
  }, [canReadAnalytics, loadAnalytics, user?.accessToken])

  const overviewCards = useMemo(() => {
    const cards = snapshot.dashboard?.totalSignals ?? []

    return [
      ...cards.slice(0, 5).map((signal) => ({
        icon: BarChart3,
        label: signal.label,
        value: formatNumber(signal.value),
        sub: signal.note,
      })),
      snapshot.loyalty
        ? {
            icon: Award,
            label: 'Loyalty Accounts',
            value: formatNumber(snapshot.loyalty.totals.accountCount),
            sub: 'Loyalty accounts in the latest snapshot.',
          }
        : null,
      snapshot.auditTrail
        ? {
            icon: ShieldCheck,
            label: 'Sensitive Actions',
            value: formatNumber(snapshot.auditTrail.totals.totalSensitiveActions),
            sub: 'Audit events from staff actions, overrides, and releases.',
          }
        : null,
    ].filter(Boolean)
  }, [snapshot.auditTrail, snapshot.dashboard, snapshot.loyalty])

  const dashboard = snapshot.dashboard ?? {
    salesSignals: [],
    insuranceSignals: [],
    serviceDemandPreview: [],
    peakHoursPreview: [],
  }
  const operations = snapshot.operations ?? {
    bookingStatuses: [],
    jobOrderStatuses: [],
    peakHours: [],
    serviceDemand: [],
    serviceAdviserLoad: [],
  }
  const backJobs = snapshot.backJobs ?? {
    statuses: [],
    severities: [],
    repeatSources: [],
  }
  const loyalty = snapshot.loyalty ?? {
    transactionTypes: [],
    topRewards: [],
  }
  const invoiceAging = snapshot.invoiceAging ?? {
    agingBuckets: [],
    trackedInvoicePolicies: [],
  }
  const auditTrail = snapshot.auditTrail ?? {
    entries: [],
  }

  if (!canReadAnalytics) {
    return (
      <section className="empty-panel text-left">
        <AlertTriangle size={24} className="text-brand-orange" />
        <h1 className="mt-3 text-2xl font-black text-ink-primary">Admin analytics is adviser and admin only</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
          Sign in as a service adviser or super admin to view the protected analytics dashboard.
        </p>
      </section>
    )
  }

  if (!user?.accessToken) {
    return (
      <section className="empty-panel text-left">
        <AlertTriangle size={24} className="text-brand-orange" />
        <h1 className="mt-3 text-2xl font-black text-ink-primary">Staff session required</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
          Restore a valid staff session before loading the live admin analytics snapshot.
        </p>
      </section>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Operational Read Models"
        title="Admin Analytics"
        description="Inspect read-only analytics snapshots across operations and support domains."
        actions={
          <button
            type="button"
            onClick={() => loadAnalytics({ showToast: true, refreshSnapshot: true })}
            disabled={isBusy}
            className="btn-ghost"
          >
            <RefreshCcw size={14} className={isBusy ? 'animate-spin' : ''} />
            Refresh Live Data
          </button>
        }
        meta={
          <>
            <span className="badge badge-blue">{analyticsDerivedStateLabel}</span>
            <span className={`badge ${freshnessMeta.badge}`}>{freshnessMeta.label}</span>
            <span className={`badge ${snapshotStatusMeta.badge}`}>{snapshotStatusMeta.label}</span>
            <span className="badge badge-gray">{LOAD_STATE_LABELS[derivedLoadState]}</span>
          </>
        }
      />

      <section className="ops-summary-grid">
        <StatCard
          icon={Database}
          label="Loaded Sections"
          value={`${loadedSectionCount}/6`}
          sub="Dashboard, operations, back-jobs, loyalty, aging, and audit."
        />
        <StatCard
          icon={Clock3}
          label="Latest Refresh"
          value={latestRefresh ? formatShortDateTime(latestRefresh) : 'Pending'}
          sub="Most recent analytics snapshot timestamp."
        />
        <StatCard
          icon={FileClock}
          label="Oldest Section"
          value={oldestRefresh ? formatShortDateTime(oldestRefresh) : 'Pending'}
          sub="Use this to spot stale sections."
        />
      </section>

      <InfoPanel
        title="Derived-state reminder"
        body={analyticsFreshnessExpectation}
      />

      {partialErrorEntries.length > 0 ? (
        <InfoPanel
          tone="warning"
          title="Some analytics sections did not load cleanly"
          body={buildPartialErrorMessage(partialErrorEntries)}
        />
      ) : null}

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex w-max min-w-full flex-nowrap items-center gap-1 rounded-xl border border-surface-border bg-surface-card p-1">
          {visibleTabs.map((item) => {
            const Icon = TAB_ICONS[item.key]
            const active = item.key === tab

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`inline-flex h-11 min-w-[164px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? 'text-white shadow-card-sm'
                    : 'text-ink-muted hover:bg-surface-hover hover:text-ink-secondary'
                }`}
                style={active ? { background: '#f07c00' } : {}}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {tab === 'overview' ? (
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-3">
            {overviewCards.map((card) => (
              <StatCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                sub={card.sub}
              />
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionShell
              title="Sales Signals"
              description="Review derived sales signals from the latest snapshot."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.dashboard}
              hasData={Boolean(snapshot.dashboard)}
              emptyMessage="Sales-oriented snapshot signals will appear here once invoice-ready records exist."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {dashboard.salesSignals.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                    <p className="mt-2 text-2xl font-black text-ink-primary">{item.value}</p>
                  </div>
                ))}
              </div>
            </SectionShell>

            <SectionShell
              title="Insurance Snapshot"
              description="Review insurance workload from the latest snapshot."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.dashboard}
              hasData={Boolean(snapshot.dashboard)}
              emptyMessage="Insurance inquiry totals will appear once the analytics snapshot sees insurance activity."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {dashboard.insuranceSignals.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                    <p className="mt-2 text-2xl font-black text-ink-primary tabular-nums">
                      {formatNumber(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </SectionShell>
          </div>

          <SectionShell
            title="Demand Preview"
            description="Review service demand from the latest dashboard snapshot."
            loading={derivedLoadState === 'analytics_loading'}
            errorMessage={errors.dashboard}
            hasData={Boolean(snapshot.dashboard?.serviceDemandPreview?.length)}
            emptyMessage="Service-demand previews will appear after bookings accumulate in the derived snapshot."
          >
            <DataTable
              headers={['Service', 'Bookings', 'Share', 'Trace Booking IDs']}
              emptyLabel="No service-demand rows are present in the latest dashboard snapshot."
              rows={dashboard.serviceDemandPreview.map((entry) => (
                <tr key={entry.serviceId} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-ink-primary">{entry.serviceName}</p>
                    <p className="text-xs text-ink-muted">{entry.serviceId}</p>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-ink-primary">{formatNumber(entry.bookingCount)}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{entry.bookingSharePercent}%</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{formatNumber(entry.sourceBookingCount)}</td>
                </tr>
              ))}
            />
          </SectionShell>

          <SectionShell
            title="Peak-Hour Preview"
            description="Review slot pressure from the latest dashboard snapshot."
            loading={derivedLoadState === 'analytics_loading'}
            errorMessage={errors.dashboard}
            hasData={Boolean(snapshot.dashboard?.peakHoursPreview?.length)}
            emptyMessage="Peak-hour visibility will appear once the snapshot sees bookings mapped to time slots."
          >
            <DataTable
              headers={['Time Slot', 'Window', 'Bookings', 'Average Fill']}
              emptyLabel="No peak-hour rows are present in the latest dashboard snapshot."
              rows={dashboard.peakHoursPreview.map((entry) => (
                <tr key={entry.timeSlotId} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-ink-primary">{entry.label}</p>
                    <p className="text-xs text-ink-muted">{entry.timeSlotId}</p>
                  </td>
                  <td className="px-4 py-3.5 text-ink-secondary">{entry.timeWindowLabel}</td>
                  <td className="px-4 py-3.5 font-bold text-ink-primary">{formatNumber(entry.bookingCount)}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{entry.fillPercentLabel}</td>
                </tr>
              ))}
            />
          </SectionShell>
        </div>
      ) : null}

      {tab === 'operations' ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SectionShell
              title="Booking Status Mix"
              description="Review booking-state counts from the operations snapshot."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.operations}
              hasData={Boolean(snapshot.operations?.bookingStatuses?.length)}
              emptyMessage="Booking status counts will appear once bookings feed the operations analytics snapshot."
            >
              <StatusStrip
                items={operations.bookingStatuses}
                fallback="No booking statuses are present in the latest snapshot."
              />
            </SectionShell>

            <SectionShell
              title="Job Order Status Mix"
              description="Review job-order counts from the operations snapshot."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.operations}
              hasData={Boolean(snapshot.operations?.jobOrderStatuses?.length)}
              emptyMessage="Job-order statuses will appear once job orders feed the operations snapshot."
            >
              <StatusStrip
                items={operations.jobOrderStatuses}
                fallback="No job-order statuses are present in the latest snapshot."
              />
            </SectionShell>
          </div>

          <SectionShell
            title="Peak-Hour Pressure"
            description="Review operational slot pressure."
            loading={derivedLoadState === 'analytics_loading'}
            errorMessage={errors.operations}
            hasData={Boolean(snapshot.operations?.peakHours?.length)}
            emptyMessage="Slot pressure will show here once booking demand hits the analytics refresh pipeline."
          >
            <DataTable
              headers={['Slot', 'Window', 'Bookings', 'Average Fill']}
              emptyLabel="No operational slot rows are present in the latest snapshot."
              rows={operations.peakHours.map((entry) => (
                <tr key={entry.timeSlotId} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-ink-primary">{entry.label}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{entry.timeWindowLabel}</td>
                  <td className="px-4 py-3.5 font-bold text-ink-primary">{formatNumber(entry.bookingCount)}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{entry.fillPercentLabel}</td>
                </tr>
              ))}
            />
          </SectionShell>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionShell
              title="Service Demand"
              description="Review service demand from the operations snapshot."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.operations}
              hasData={Boolean(snapshot.operations?.serviceDemand?.length)}
              emptyMessage="Service demand rows will appear after booking traffic accumulates in the snapshot."
            >
              <DataTable
                headers={['Service', 'Bookings', 'Last Booked', 'Trace Booking IDs']}
                emptyLabel="No service-demand rows are present in the operations snapshot."
              rows={operations.serviceDemand.map((entry) => (
                  <tr key={entry.serviceId} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-ink-primary">{entry.serviceName}</td>
                    <td className="px-4 py-3.5 font-bold text-ink-primary">{formatNumber(entry.bookingCount)}</td>
                    <td className="px-4 py-3.5 text-ink-secondary">{entry.lastBookedAtLabel}</td>
                    <td className="px-4 py-3.5 text-ink-secondary">{formatNumber(entry.sourceBookingIds.length)}</td>
                  </tr>
                ))}
              />
            </SectionShell>

            <SectionShell
              title="Service Adviser Load"
              description="Review adviser workload from the operations snapshot."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.operations}
              hasData={Boolean(snapshot.operations?.serviceAdviserLoad?.length)}
              emptyMessage="Adviser workload will appear when job-order ownership is present in the snapshot."
            >
              <DataTable
                headers={['Staff', 'Staff Code', 'Job Orders', 'Finalized']}
                emptyLabel="No service-adviser load rows are present in the latest snapshot."
              rows={operations.serviceAdviserLoad.map((entry) => (
                  <tr key={entry.serviceAdviserUserId} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3.5 text-ink-secondary break-all">{entry.serviceAdviserUserId}</td>
                    <td className="px-4 py-3.5 font-semibold text-ink-primary">{entry.serviceAdviserCode}</td>
                    <td className="px-4 py-3.5 font-bold text-ink-primary">{formatNumber(entry.jobOrderCount)}</td>
                    <td className="px-4 py-3.5 text-ink-secondary">{formatNumber(entry.finalizedCount)}</td>
                  </tr>
                ))}
              />
            </SectionShell>
          </div>
        </div>
      ) : null}

      {tab === 'backJobs' ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Wrench}
              label="Total Back-Jobs"
              value={formatNumber(snapshot.backJobs?.totals?.totalBackJobs)}
              sub="Back-job cases in the latest snapshot."
            />
            <StatCard
              icon={AlertTriangle}
              label="Open Back-Jobs"
              value={formatNumber(snapshot.backJobs?.totals?.openBackJobs)}
              sub="Open rework issues in the latest snapshot."
            />
            <StatCard
              icon={CheckCircle2}
              label="Resolved"
              value={formatNumber(snapshot.backJobs?.totals?.resolvedBackJobs)}
              sub="Back-job cases already resolved."
            />
            <StatCard
              icon={ShieldCheck}
              label="Validated Findings"
              value={formatNumber(snapshot.backJobs?.totals?.validatedFindings)}
              sub="Validated findings on back-job reviews."
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionShell
              title="Status Distribution"
              description="Review current back-job lifecycle states."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.backJobs}
              hasData={Boolean(snapshot.backJobs?.statuses?.length)}
              emptyMessage="Status distribution will appear when back-job cases flow into analytics."
            >
              <StatusStrip
                items={backJobs.statuses}
                fallback="No back-job statuses are present in the latest snapshot."
              />
            </SectionShell>

            <SectionShell
              title="Severity Distribution"
              description="Review severity for validated back-job findings."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.backJobs}
              hasData={Boolean(snapshot.backJobs?.severities?.length)}
              emptyMessage="Severity distribution will appear when back-job findings exist in analytics."
            >
              <StatusStrip
                items={backJobs.severities}
                fallback="No back-job severities are present in the latest snapshot."
              />
            </SectionShell>
          </div>

          <SectionShell
            title="Repeat Original Sources"
            description="Review which job orders are driving repeated rework."
            loading={derivedLoadState === 'analytics_loading'}
            errorMessage={errors.backJobs}
            hasData={Boolean(snapshot.backJobs?.repeatSources?.length)}
            emptyMessage="Repeat-source signals will appear once multiple back-jobs tie back to the same original work."
          >
            <DataTable
              headers={['Original Job Order', 'Back-Jobs', 'Unresolved', 'Trace Back-Job IDs']}
              emptyLabel="No repeat-source rows are present in the latest back-job snapshot."
              rows={backJobs.repeatSources.map((entry) => (
                <tr key={entry.originalJobOrderId} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-ink-primary break-all">
                    {entry.originalJobOrderId}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-ink-primary">{formatNumber(entry.backJobCount)}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{formatNumber(entry.unresolvedCount)}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{formatNumber(entry.sourceBackJobIds.length)}</td>
                </tr>
              ))}
            />
          </SectionShell>
        </div>
      ) : null}

      {tab === 'loyalty' ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={Users}
              label="Accounts"
              value={formatNumber(snapshot.loyalty?.totals?.accountCount)}
              sub="Customer accounts in loyalty."
            />
            <StatCard
              icon={Award}
              label="Balance"
              value={formatNumber(snapshot.loyalty?.totals?.totalPointsBalance)}
              sub="Total point balance across loyalty accounts."
            />
            <StatCard
              icon={TrendingUp}
              label="Earned"
              value={formatNumber(snapshot.loyalty?.totals?.totalPointsEarned)}
              sub="Total points earned in the snapshot."
            />
            <StatCard
              icon={ReceiptText}
              label="Redeemed"
              value={formatNumber(snapshot.loyalty?.totals?.totalPointsRedeemed)}
              sub="Total points redeemed in tracked rewards."
            />
            <StatCard
              icon={Sparkles}
              label="Redemptions"
              value={formatNumber(snapshot.loyalty?.totals?.redemptionCount)}
              sub="Completed reward redemptions in analytics."
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SectionShell
              title="Transaction Mix"
              description="Review loyalty activity from the latest analytics snapshot."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.loyalty}
              hasData={Boolean(snapshot.loyalty?.transactionTypes?.length)}
              emptyMessage="Loyalty transaction mix will appear when points activity exists in the snapshot."
            >
              <DataTable
                headers={['Type', 'Count', 'Net Points Delta']}
                emptyLabel="No loyalty transaction rows are present in the latest snapshot."
              rows={loyalty.transactionTypes.map((entry) => (
                  <tr key={entry.transactionType} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-ink-primary">{entry.label}</td>
                    <td className="px-4 py-3.5 text-ink-secondary">{formatNumber(entry.count)}</td>
                    <td
                      className="px-4 py-3.5 font-bold"
                      style={{ color: entry.tone === 'positive' ? '#22c55e' : '#f97316' }}
                    >
                      {formatNumber(entry.netPointsDelta)}
                    </td>
                  </tr>
                ))}
              />
            </SectionShell>

            <SectionShell
              title="Top Rewards"
              description="Review top rewards from the loyalty snapshot."
              loading={derivedLoadState === 'analytics_loading'}
              errorMessage={errors.loyalty}
              hasData={Boolean(snapshot.loyalty?.topRewards?.length)}
              emptyMessage="Top reward usage will appear when customer redemptions exist in analytics."
            >
              <DataTable
                headers={['Reward', 'Status', 'Redemptions', 'Trace IDs']}
                emptyLabel="No reward-usage rows are present in the latest snapshot."
              rows={loyalty.topRewards.map((entry) => (
                  <tr key={entry.rewardId} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink-primary">{entry.rewardName}</p>
                      <p className="text-xs text-ink-muted">{entry.rewardId}</p>
                    </td>
                    <td className="px-4 py-3.5 text-ink-secondary">{entry.rewardStatus}</td>
                    <td className="px-4 py-3.5 font-bold text-ink-primary">{formatNumber(entry.redemptionCount)}</td>
                    <td className="px-4 py-3.5 text-ink-secondary">{formatNumber(entry.sourceRedemptionIds.length)}</td>
                  </tr>
                ))}
              />
            </SectionShell>
          </div>
        </div>
      ) : null}

      {tab === 'invoiceAging' ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={ReceiptText}
              label="Tracked Invoices"
              value={formatNumber(snapshot.invoiceAging?.totals?.trackedInvoices)}
              sub="Invoices visible in reminder analytics."
            />
            <StatCard
              icon={CalendarClock}
              label="Scheduled Rules"
              value={formatNumber(snapshot.invoiceAging?.totals?.scheduledReminderRules)}
              sub="Reminder rules currently scheduled."
            />
            <StatCard
              icon={History}
              label="Processed Rules"
              value={formatNumber(snapshot.invoiceAging?.totals?.processedReminderRules)}
              sub="Reminder rules already processed."
            />
            <StatCard
              icon={AlertTriangle}
              label="Cancelled Rules"
              value={formatNumber(snapshot.invoiceAging?.totals?.cancelledReminderRules)}
              sub="Reminder rules cancelled before processing."
            />
          </div>

          <SectionShell
            title="Aging Buckets"
            description="Review invoice aging from the latest analytics snapshot."
            loading={derivedLoadState === 'analytics_loading'}
            errorMessage={errors.invoiceAging}
            hasData={Boolean(snapshot.invoiceAging?.agingBuckets?.length)}
            emptyMessage="Aging buckets will appear when tracked invoices enter the reminder-driven analytics read model."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {invoiceAging.agingBuckets.map((entry) => (
                <div key={entry.bucket} className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{entry.label}</p>
                  <p className="mt-2 text-3xl font-black text-ink-primary">{formatNumber(entry.count)}</p>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            title="Tracked Reminder Policies"
            description="Review reminder-policy visibility for tracked invoices."
            loading={derivedLoadState === 'analytics_loading'}
            errorMessage={errors.invoiceAging}
            hasData={Boolean(snapshot.invoiceAging?.trackedInvoicePolicies?.length)}
            emptyMessage="Tracked invoice reminder-policy rows will appear once reminder analytics exist."
          >
            <DataTable
              headers={['Invoice', 'Latest Reminder Status', 'Scheduled For', 'Rule IDs']}
              emptyLabel="No tracked reminder-policy rows are present in the latest snapshot."
              rows={invoiceAging.trackedInvoicePolicies.map((entry) => (
                <tr key={entry.invoiceId} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-ink-primary break-all">{entry.invoiceId}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{entry.latestReminderStatus}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{entry.latestScheduledForLabel}</td>
                  <td className="px-4 py-3.5 text-ink-secondary">{formatNumber(entry.reminderRuleIds.length)}</td>
                </tr>
              ))}
            />
          </SectionShell>
        </div>
      ) : null}

      {tab === 'auditTrail' ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={ShieldCheck}
              label="Sensitive Actions"
              value={formatNumber(snapshot.auditTrail?.totals?.totalSensitiveActions)}
              sub="Sensitive audit events in the latest snapshot."
            />
            <StatCard
              icon={Users}
              label="Staff/Admin Actions"
              value={formatNumber(snapshot.auditTrail?.totals?.staffAdminActions)}
              sub="Sensitive staff and admin actions."
            />
            <StatCard
              icon={AlertTriangle}
              label="QA Overrides"
              value={formatNumber(snapshot.auditTrail?.totals?.qualityGateOverrides)}
              sub="Manual QA override events in analytics."
            />
            <StatCard
              icon={CheckCircle2}
              label="Release Decisions"
              value={formatNumber(snapshot.auditTrail?.totals?.releaseDecisions)}
              sub="Release and finalization audit records."
            />
          </div>

          <SectionShell
            title="Audit Timeline"
            description="Review the audit trail from the latest analytics snapshot."
            loading={derivedLoadState === 'analytics_loading'}
            errorMessage={errors.auditTrail}
            hasData={Boolean(snapshot.auditTrail?.entries?.length)}
            emptyMessage="Audit entries will appear once sensitive actions are captured in the analytics snapshot."
          >
            <AuditTrailTimeline entries={auditTrail.entries} />
          </SectionShell>
        </div>
      ) : null}

    </div>
  )
}
