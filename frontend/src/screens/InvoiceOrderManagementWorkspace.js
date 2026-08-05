'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  LoaderCircle,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldAlert,
} from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import ServiceLifecycleHeader from '@/components/ServiceLifecycleHeader'
import { ApiError } from '@/lib/authClient'
import { getInvoiceAgingAnalytics } from '@/lib/analyticsAdminClient'
import {
  getJobOrderInvoiceLookup,
  listJobOrderWorkbenchSummaries,
} from '@/lib/jobOrderWorkbenchClient'
import { useUser } from '@/lib/userContext'
import { getJobOrderReference, safeBusinessReference } from '@/lib/businessReferenceDisplay.mjs'
import {
  getInvoicePdfStateLabel,
  getLoadMessageTone,
} from './invoiceOrderManagementView.mjs'
import { WORKSPACE_INFORMATION_ARCHITECTURE } from './workspaceInformationArchitecture.mjs'

const READ_ROLES = new Set(['service_adviser', 'super_admin'])

const LOAD_STATE_LABELS = {
  ready: 'Ready',
  loading: 'Loading',
  loaded: 'Loaded',
  empty: 'No invoice',
  failed: 'Unavailable',
}

const formatCurrency = (amountCents) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((Number(amountCents) || 0) / 100)

const formatLabel = (value, fallback = 'Unknown') => {
  const normalizedValue = String(value ?? '').trim()
  if (!normalizedValue) return fallback

  return normalizedValue
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const formatJobOrderReference = (jobOrder) => getJobOrderReference(jobOrder)

const getLoadMessageToneClass = (status) =>
  getLoadMessageTone(status === 'loaded' ? 'invoice_order_loaded' : status === 'failed' ? 'invoice_order_failed' : 'invoice_order_empty') === 'success'
    ? 'status-message status-message-success'
    : status === 'failed'
      ? 'status-message status-message-danger'
      : 'status-message status-message-warning'

function InfoPanel({ icon: Icon = AlertTriangle, title, body }) {
  return (
    <div className="status-message status-message-warning flex gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-primary">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ink-secondary">{body}</p>
      </div>
    </div>
  )
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-ink-primary">{value}</p>
    </div>
  )
}

export default function InvoiceOrderManagementWorkspace() {
  const user = useUser()
  const canRead = READ_ROLES.has(user?.role)
  const [jobOrderId, setJobOrderId] = useState('')
  const [search, setSearch] = useState('')
  const [jobOrderOptions, setJobOrderOptions] = useState([])
  const [invoiceState, setInvoiceState] = useState({
    status: 'ready',
    message: '',
    jobOrder: null,
  })
  const [agingState, setAgingState] = useState({
    status: 'loading',
    message: '',
    snapshot: null,
  })
  const autoLoadedIdRef = useRef('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const routeJobOrderId = new URLSearchParams(window.location.search).get('jobOrderId')
    if (routeJobOrderId) setJobOrderId(routeJobOrderId)
  }, [])

  const loadAging = useCallback(async () => {
    if (!user?.accessToken || !canRead) return

    setAgingState((current) => ({ ...current, status: 'loading', message: '' }))
    try {
      const snapshot = await getInvoiceAgingAnalytics(user.accessToken)
      setAgingState({
        status: 'loaded',
        message: 'Invoice aging refreshed.',
        snapshot,
      })
    } catch (error) {
      setAgingState({
        status: 'failed',
        message: error?.message || 'Invoice aging could not be loaded.',
        snapshot: null,
      })
    }
  }, [canRead, user?.accessToken])

  useEffect(() => {
    void loadAging()
  }, [loadAging])

  useEffect(() => {
    if (!user?.accessToken || !canRead) {
      setJobOrderOptions([])
      return
    }

    void listJobOrderWorkbenchSummaries({
      accessToken: user.accessToken,
      scope: 'history',
      limit: 50,
    })
      .then((jobOrders) => {
        setJobOrderOptions(
          jobOrders.filter((jobOrder) => ['finalized', 'cancelled'].includes(jobOrder.status)),
        )
      })
      .catch(() => setJobOrderOptions([]))
  }, [canRead, user?.accessToken])

  const loadInvoice = useCallback(async () => {
    if (!user?.accessToken || !jobOrderId.trim()) {
      setInvoiceState({
        status: 'empty',
        message: 'Choose a finalized Job Order first.',
        jobOrder: null,
      })
      return
    }

    setInvoiceState((current) => ({ ...current, status: 'loading', message: '' }))
    try {
      const jobOrder = await getJobOrderInvoiceLookup({
        jobOrderId: jobOrderId.trim(),
        accessToken: user.accessToken,
      })
      const invoiceRecord = jobOrder?.invoiceRecord ?? jobOrder?.invoice_record ?? null

      setInvoiceState({
        status: invoiceRecord ? 'loaded' : 'empty',
        message: invoiceRecord
          ? 'Service invoice loaded.'
          : 'This Job Order has not produced an invoice yet.',
        jobOrder: jobOrder ? { ...jobOrder, invoiceRecord } : null,
      })
    } catch (error) {
      setInvoiceState({
        status: error instanceof ApiError && error.status === 404 ? 'empty' : 'failed',
        message: error?.message || 'Service invoice could not be loaded.',
        jobOrder: null,
      })
    }
  }, [jobOrderId, user?.accessToken])

  useEffect(() => {
    if (!jobOrderId || !user?.accessToken || !canRead || autoLoadedIdRef.current === jobOrderId) {
      return
    }
    autoLoadedIdRef.current = jobOrderId
    void loadInvoice()
  }, [canRead, jobOrderId, loadInvoice, user?.accessToken])

  const filteredJobOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return jobOrderOptions

    return jobOrderOptions.filter((jobOrder) =>
      `${formatJobOrderReference(jobOrder)} ${formatLabel(jobOrder.status)} ${jobOrder.workDate ?? ''}`
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [jobOrderOptions, search])

  if (!user?.accessToken) {
    return (
      <InfoPanel
        icon={ShieldAlert}
        title="Staff sign-in required"
        body="Sign in as a service adviser or super admin before opening service invoices."
      />
    )
  }

  if (!canRead) {
    return (
      <InfoPanel
        icon={ShieldAlert}
        title="Service invoices are adviser/admin only"
        body="Invoice and payment records remain available only to service advisers and super admins."
      />
    )
  }

  const jobOrder = invoiceState.jobOrder
  const invoice = jobOrder?.invoiceRecord ?? null
  const agingBuckets = agingState.snapshot?.agingBuckets ?? []
  const trackedPolicies = agingState.snapshot?.trackedInvoicePolicies ?? []

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Financial Operations"
        title="Service Invoices"
        description={WORKSPACE_INFORMATION_ARCHITECTURE.invoices.description}
        actions={(
          <button
            type="button"
            onClick={loadAging}
            disabled={agingState.status === 'loading'}
            className="ops-action-secondary min-w-[132px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw size={14} className={agingState.status === 'loading' ? 'animate-spin' : undefined} />
            Refresh
          </button>
        )}
      />

      <ServiceLifecycleHeader
        currentStep={invoice?.paymentStatus === 'paid' ? 'complete' : 'payment'}
        reference={jobOrder ? formatJobOrderReference(jobOrder) : 'Select a service invoice'}
        customer={jobOrder?.customerDisplayName ?? jobOrder?.customerName}
        vehicle={jobOrder?.vehicleDisplayName ?? jobOrder?.plateNumber}
        status={invoice ? formatLabel(invoice.paymentStatus) : 'Awaiting selection'}
        owner="Service Adviser"
        blocker={jobOrder && !invoice ? 'Finalize the Job Order before payment can continue.' : null}
        nextAction={invoice ? 'Review the invoice and continue payment work from its Job Order.' : 'Choose a finalized service record.'}
        actionLabel={jobOrder?.id ? 'Open job workspace' : null}
        actionHref={jobOrder?.id ? `/admin/job-orders/${encodeURIComponent(jobOrder.id)}` : null}
      />

      <section className="ops-control-strip space-y-4">
        <div>
          <p className="card-title">Find Service Invoice</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Search finalized Job Orders and load one invoice at a time.
          </p>
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <label>
            <span className="label">Search invoices</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input"
              placeholder="Booking, Job Order, or work date"
            />
          </label>
          <button
            type="button"
            onClick={loadInvoice}
            disabled={invoiceState.status === 'loading' || !jobOrderId}
            className="ops-action-primary xl:min-w-[148px] xl:self-end"
          >
            {invoiceState.status === 'loading' ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />}
            Load Invoice
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobOrders.slice(0, 12).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setJobOrderId(option.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                jobOrderId === option.id
                  ? 'border-brand-orange bg-brand-orange/10'
                  : 'border-surface-border bg-surface-card hover:border-brand-orange/40'
              }`}
            >
              <p className="text-sm font-semibold text-ink-primary">{formatJobOrderReference(option)}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {formatLabel(option.status)} / {option.workDate ?? 'No work date'}
              </p>
            </button>
          ))}
        </div>
        {!filteredJobOrders.length ? (
          <div className="empty-panel">
            <p className="text-sm font-semibold text-ink-primary">No service invoices match</p>
            <p className="mt-2 text-sm text-ink-secondary">Clear the search or refresh the workspace.</p>
          </div>
        ) : null}
      </section>

      <section className="ops-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="card-title">Invoice Detail</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Finalized service billing and payment status.</p>
          </div>
          <span className="badge badge-gray">{LOAD_STATE_LABELS[invoiceState.status]}</span>
        </div>

        {invoiceState.message ? (
          <div className={`mt-4 ${getLoadMessageToneClass(invoiceState.status)}`}>{invoiceState.message}</div>
        ) : null}

        {invoice ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">Service invoice</p>
                <p className="mt-2 text-xl font-bold text-ink-primary">{invoice.invoiceReference}</p>
              </div>
              <span className={`badge ${invoice.paymentStatus === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                {formatLabel(invoice.paymentStatus)}
              </span>
            </div>
            <div className="rounded-lg border border-brand-orange/20 bg-brand-orange/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">Invoice total</p>
              <p className="mt-2 text-2xl font-black text-ink-primary">{formatCurrency(invoice.totalAmountCents)}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailTile label="Subtotal" value={formatCurrency(invoice.subtotalAmountCents)} />
              <DetailTile label="Reservation fee deduction" value={formatCurrency(invoice.reservationFeeDeductionCents)} />
              <DetailTile label="Amount recorded" value={formatCurrency(invoice.amountPaidCents)} />
              <DetailTile label="Payment method" value={formatLabel(invoice.paymentMethod, 'Not recorded')} />
              <DetailTile label="Official receipt" value={invoice.officialReceiptReference ?? 'Generated on finalization'} />
              <DetailTile label="PDF delivery" value={getInvoicePdfStateLabel(invoice)} />
            </div>
          </div>
        ) : (
          <div className="empty-panel mt-4">
            <ReceiptText size={22} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-semibold text-ink-primary">No invoice loaded</p>
          </div>
        )}
      </section>

      <section className="ops-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="card-title">Aging & Reminder History</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">Service invoice aging and reminder policies.</p>
          </div>
          <span className="badge badge-gray">{LOAD_STATE_LABELS[agingState.status]}</span>
        </div>
        {agingState.message ? (
          <div className={`mt-4 ${getLoadMessageToneClass(agingState.status)}`}>{agingState.message}</div>
        ) : null}
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-3">
            {agingBuckets.length ? agingBuckets.map((bucket) => (
              <div key={bucket.bucket} className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface-card px-4 py-3">
                <span className="text-sm text-ink-secondary">{bucket.label ?? formatLabel(bucket.bucket)}</span>
                <span className="text-xl font-black text-ink-primary">{bucket.count}</span>
              </div>
            )) : <p className="text-sm text-ink-muted">No aging buckets are currently visible.</p>}
          </div>
          <div className="table-scroll">
            <table className="data-table min-w-[620px]">
              <thead>
                <tr><th>Invoice</th><th>Latest Status</th><th>Scheduled For</th><th>Rules</th></tr>
              </thead>
              <tbody>
                {trackedPolicies.length ? trackedPolicies.map((policy) => (
                  <tr key={policy.invoiceId}>
                    <td className="break-all font-semibold text-ink-primary">
                      {safeBusinessReference(policy.invoiceReference ?? policy.invoiceId)}
                    </td>
                    <td className="text-ink-secondary">{policy.latestReminderStatus}</td>
                    <td className="text-ink-secondary">{policy.latestScheduledForLabel}</td>
                    <td className="font-semibold text-ink-primary">{policy.reminderRuleIds?.length ?? 0}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="text-center text-ink-muted">No reminder policies are currently visible.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
