'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  LoaderCircle,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShoppingBag,
  Wrench,
} from 'lucide-react'

import { ApiError } from '@/lib/authClient'
import { getInvoiceAgingAnalytics } from '@/lib/analyticsAdminClient'
import { getJobOrderById } from '@/lib/jobOrderWorkbenchClient'
import {
  formatInvoiceOrderCurrency,
  getEcommerceInvoiceOrderApiBaseUrl,
  loadStaffEcommerceOrderSnapshot,
} from '@/lib/invoiceOrderManagementClient'
import { useUser } from '@/lib/userContext'
import {
  canStaffReadInvoiceOrderManagement,
  getStaffInvoiceOrderLoadState,
  staffInvoiceOrderActionRoutes,
  staffInvoiceOrderPaymentCopy,
  staffInvoiceOrderSurfaceRules,
} from '@/lib/api/generated/invoice-orders/staff-web-invoice-order-management'

const LOAD_STATE_LABELS = {
  invoice_order_ready: 'Ready',
  invoice_order_loading: 'Loading Live Data',
  invoice_order_loaded: 'Live Data Loaded',
  invoice_order_partial: 'Partially Loaded',
  invoice_order_empty: 'No Data Loaded Yet',
  invoice_order_forbidden_role: 'Role Blocked',
  invoice_order_unauthorized: 'Sign-In Required',
  invoice_order_runtime_unavailable: 'Runtime Unavailable',
  invoice_order_failed: 'Load Failed',
}

const formatDateTime = (value) => {
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatLabel = (value, fallback = 'Unknown') => {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return fallback
  }

  return normalizedValue
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const shortId = (value) => {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue ? normalizedValue.slice(0, 8).toUpperCase() : 'NONE'
}

function InfoPanel({ icon: Icon = Database, title, body, tone = 'info' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
      : tone === 'danger'
        ? 'border-red-500/20 bg-red-500/10 text-red-300'
        : 'border-brand-orange/15 bg-brand-orange/10 text-brand-orange'

  return (
    <div className="card flex gap-3 p-4">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-ink-primary">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{body}</p>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</p>
          <p className="mt-3 text-3xl font-black text-ink-primary">{value}</p>
          {sub ? <p className="mt-2 text-xs leading-5 text-ink-muted">{sub}</p> : null}
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-orange/15 bg-brand-orange/10 text-brand-orange">
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ value }) {
  const normalizedValue = String(value ?? '').trim()
  const cls =
    normalizedValue.includes('paid') || normalizedValue.includes('fulfilled') || normalizedValue === 'finalized'
      ? 'badge-green'
      : normalizedValue.includes('overdue') || normalizedValue.includes('blocked')
        ? 'badge-red'
        : normalizedValue.includes('pending') || normalizedValue.includes('partial')
          ? 'badge-orange'
          : 'badge-gray'

  return <span className={`badge ${cls}`}>{formatLabel(normalizedValue, 'Unknown')}</span>
}

function SectionShell({ title, description, action, children }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-surface-border bg-surface-raised/70 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-lg font-bold text-ink-primary">{title}</p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function DetailTile({ label, value, breakAll = false }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
      <p className={`mt-2 text-sm font-semibold text-ink-primary ${breakAll ? 'break-all' : ''}`}>{value}</p>
    </div>
  )
}

function RouteLedger({ routes }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {routes.map((route) => (
        <div key={`${route.method}-${route.path}`} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs font-bold text-ink-primary">
              {route.method} {route.path}
            </p>
            <span className={`badge ${route.status === 'live' ? 'badge-green' : 'badge-orange'}`}>
              {route.status}
            </span>
          </div>
          {route.notes ? <p className="mt-3 text-xs leading-5 text-ink-muted">{route.notes}</p> : null}
        </div>
      ))}
    </div>
  )
}

function PaymentEntries({ entries }) {
  if (!entries?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-border bg-surface-raised px-4 py-8 text-center">
        <ReceiptText size={22} className="mx-auto text-ink-muted" />
        <p className="mt-3 text-sm font-bold text-ink-primary">No payment entries yet</p>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          Payment-entry creation is backend-owned and remains manual tracking, not payment-gateway settlement.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
            <th className="px-4 py-3 font-semibold">Received</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Method</th>
            <th className="px-4 py-3 font-semibold">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-surface-hover">
              <td className="px-4 py-3.5 text-ink-secondary">{formatDateTime(entry.receivedAt)}</td>
              <td className="px-4 py-3.5 font-bold text-ink-primary">{entry.amountLabel}</td>
              <td className="px-4 py-3.5 text-ink-secondary">{entry.paymentMethodLabel}</td>
              <td className="px-4 py-3.5 text-ink-secondary">{entry.reference ?? 'No reference'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function InvoiceOrderManagementWorkspace() {
  const user = useUser()
  const canRead = canStaffReadInvoiceOrderManagement(user)
  const [jobOrderId, setJobOrderId] = useState('')
  const [jobOrderState, setJobOrderState] = useState({
    status: 'invoice_order_ready',
    message: '',
    jobOrder: null,
  })
  const [ecommerceOrderId, setEcommerceOrderId] = useState('')
  const [ecommerceState, setEcommerceState] = useState({
    status: 'invoice_order_ready',
    message: '',
    order: null,
    invoice: null,
    invoiceError: '',
  })
  const [agingState, setAgingState] = useState({
    status: 'invoice_order_loading',
    message: '',
    snapshot: null,
  })

  const allSurfaceRoutes = useMemo(
    () => staffInvoiceOrderSurfaceRules.flatMap((surface) => surface.routes),
    [],
  )

  const loadInvoiceAging = useCallback(async () => {
    if (!user?.accessToken || !canRead) {
      return
    }

    setAgingState((currentState) => ({
      ...currentState,
      status: 'invoice_order_loading',
      message: '',
    }))

    try {
      const snapshot = await getInvoiceAgingAnalytics(user.accessToken)

      setAgingState({
        status: getStaffInvoiceOrderLoadState({
          hasSession: true,
          canRead,
          hasData: Boolean(
            snapshot?.totals?.trackedInvoices ||
              snapshot?.agingBuckets?.length ||
              snapshot?.trackedInvoicePolicies?.length,
          ),
        }),
        message: 'Invoice-aging analytics loaded from the live read model.',
        snapshot,
      })
    } catch (error) {
      setAgingState({
        status: error instanceof ApiError && error.status === 0
          ? 'invoice_order_runtime_unavailable'
          : 'invoice_order_failed',
        message: error?.message || 'Invoice-aging analytics could not be loaded.',
        snapshot: null,
      })
    }
  }, [canRead, user?.accessToken])

  useEffect(() => {
    void loadInvoiceAging()
  }, [loadInvoiceAging])

  const handleLoadServiceInvoice = async () => {
    if (!user?.accessToken) {
      setJobOrderState({
        status: 'invoice_order_unauthorized',
        message: 'A valid staff session is required before loading service invoice state.',
        jobOrder: null,
      })
      return
    }

    setJobOrderState((currentState) => ({
      ...currentState,
      status: 'invoice_order_loading',
      message: '',
    }))

    try {
      const jobOrder = await getJobOrderById({
        jobOrderId: jobOrderId.trim(),
        accessToken: user.accessToken,
      })

      setJobOrderState({
        status: getStaffInvoiceOrderLoadState({
          hasSession: true,
          canRead,
          hasData: Boolean(jobOrder?.invoiceRecord),
        }),
        message: jobOrder?.invoiceRecord
          ? 'Service invoice-ready record loaded from the job-order owner route.'
          : 'Job order loaded, but it has not produced an invoice-ready record yet.',
        jobOrder,
      })
    } catch (error) {
      const notFound = error instanceof ApiError && error.status === 404

      setJobOrderState({
        status: notFound ? 'invoice_order_empty' : 'invoice_order_failed',
        message: error?.message || 'Service invoice state could not be loaded.',
        jobOrder: null,
      })
    }
  }

  const handleLoadEcommerceOrder = async () => {
    if (!user?.accessToken) {
      setEcommerceState({
        status: 'invoice_order_unauthorized',
        message: 'A valid staff session is required before loading ecommerce order state.',
        order: null,
        invoice: null,
        invoiceError: '',
      })
      return
    }

    setEcommerceState((currentState) => ({
      ...currentState,
      status: 'invoice_order_loading',
      message: '',
    }))

    try {
      const snapshot = await loadStaffEcommerceOrderSnapshot({
        orderId: ecommerceOrderId.trim(),
        accessToken: user.accessToken,
      })

      setEcommerceState({
        status: getStaffInvoiceOrderLoadState({
          hasSession: true,
          canRead,
          hasData: Boolean(snapshot.order || snapshot.invoice),
          partialFailure: Boolean(snapshot.invoiceError),
        }),
        message: snapshot.invoiceError
          ? 'Order loaded, but invoice detail was not available from the ecommerce invoice route.'
          : 'Order and invoice tracking loaded from ecommerce owner routes.',
        order: snapshot.order,
        invoice: snapshot.invoice,
        invoiceError: snapshot.invoiceError,
      })
    } catch (error) {
      const runtimeUnavailable = error instanceof ApiError && error.status === 0

      setEcommerceState({
        status: runtimeUnavailable ? 'invoice_order_runtime_unavailable' : 'invoice_order_failed',
        message: error?.message || 'Ecommerce order state could not be loaded.',
        order: null,
        invoice: null,
        invoiceError: '',
      })
    }
  }

  const serviceInvoice = jobOrderState.jobOrder?.invoiceRecord ?? null
  const invoiceAging = agingState.snapshot
  const agingBuckets = invoiceAging?.agingBuckets ?? []
  const trackedInvoicePolicies = invoiceAging?.trackedInvoicePolicies ?? []
  const ecommerceLoadLabel = LOAD_STATE_LABELS[ecommerceState.status] ?? 'Order Lookup'
  const jobOrderLoadLabel = LOAD_STATE_LABELS[jobOrderState.status] ?? 'Service Invoice Lookup'
  const agingLoadLabel = LOAD_STATE_LABELS[agingState.status] ?? 'Invoice Aging'

  if (!user?.accessToken) {
    return (
      <InfoPanel
        icon={ShieldAlert}
        title="Staff sign-in required"
        body="Sign in as a service adviser or super admin before opening Invoice & Order Management."
        tone="warning"
      />
    )
  }

  if (!canRead) {
    return (
      <InfoPanel
        icon={ShieldAlert}
        title="Invoice & Order Management is adviser/admin only"
        body="Technician sessions can work inside assigned job orders, but invoice/order management stays with service advisers and super admins."
        tone="warning"
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6 md:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">
              Staff Finance Surface
            </p>
            <h1 className="mt-3 text-3xl font-bold text-ink-primary">Invoice & Order Management</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              A clear web entry point for service invoice-ready job orders, ecommerce order snapshots,
              and invoice-aging analytics. This page labels owner domains carefully so staff do not confuse
              manual payment records with online gateway settlement.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="badge badge-green">Live: service invoice lookup</span>
            <span className="badge badge-green">Live: known ecommerce order lookup</span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={Wrench}
          label="Service Invoice Source"
          value="Job Orders"
          sub="Finalization and service-payment recording stay inside the job-order owner workflow."
        />
        <MetricCard
          icon={ShoppingBag}
          label="Ecommerce Source"
          value="Orders"
          sub={`Known-order reads use ${getEcommerceInvoiceOrderApiBaseUrl()}.`}
        />
        <MetricCard
          icon={BarChart3}
          label="Invoice Aging"
          value={invoiceAging?.totals?.trackedInvoices ?? 'Live'}
          sub="Reminder-rule analytics remain read-only and can lag source writes."
        />
      </div>

      <InfoPanel
        icon={ReceiptText}
        title="Payment-state boundary"
        body={staffInvoiceOrderPaymentCopy}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <SectionShell
          title="Service Invoice Lookup"
          description="Load a known job order and inspect whether the job-order owner route has produced an invoice-ready record."
          action={<span className="badge badge-gray">{jobOrderLoadLabel}</span>}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="text-xs text-ink-muted">
              Job order id
              <input
                value={jobOrderId}
                onChange={(event) => setJobOrderId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                placeholder="Paste a finalized job-order UUID"
              />
            </label>
            <button
              type="button"
              onClick={handleLoadServiceInvoice}
              disabled={jobOrderState.status === 'invoice_order_loading'}
              className="btn-primary self-end"
            >
              {jobOrderState.status === 'invoice_order_loading' ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Load Service Invoice
            </button>
          </div>

          {jobOrderState.message ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-xs ${
                serviceInvoice
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-500/25 bg-amber-500/10 text-amber-100'
              }`}
            >
              {jobOrderState.message}
            </div>
          ) : null}

          {jobOrderState.jobOrder ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <DetailTile label="Job Order" value={shortId(jobOrderState.jobOrder.id)} />
                <DetailTile label="Status" value={formatLabel(jobOrderState.jobOrder.status)} />
                <DetailTile label="Source" value={formatLabel(jobOrderState.jobOrder.sourceType)} />
              </div>

              {serviceInvoice ? (
                <div className="rounded-3xl border border-surface-border bg-surface-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                        Service Invoice-Ready Record
                      </p>
                      <p className="mt-2 text-xl font-bold text-ink-primary">{serviceInvoice.invoiceReference}</p>
                    </div>
                    <StatusBadge value={serviceInvoice.paymentStatus} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <DetailTile label="Amount Recorded" value={formatInvoiceOrderCurrency(serviceInvoice.amountPaidCents)} />
                    <DetailTile label="Payment Method" value={formatLabel(serviceInvoice.paymentMethod, 'Not recorded')} />
                    <DetailTile label="Paid At" value={formatDateTime(serviceInvoice.paidAt)} />
                    <DetailTile label="Finalized By" value={serviceInvoice.finalizedByUserId} breakAll />
                  </div>

                  <p className="mt-4 text-sm leading-6 text-ink-muted">
                    Service invoice payment can be recorded from the Job Order Workbench only after invoice-ready finalization.
                  </p>
                </div>
              ) : (
                <InfoPanel
                  icon={Clock3}
                  title="Not invoice-ready yet"
                  body="This job order has not produced an invoice-ready record. Use the Job Order Workbench to complete work evidence, QA gates, and finalization."
                  tone="warning"
                />
              )}

              <Link href="/admin/job-orders" className="btn-secondary w-fit">
                <ExternalLink size={14} />
                Open Job Order Workbench
              </Link>
            </div>
          ) : null}
        </SectionShell>

        <SectionShell
          title="Ecommerce Order / Invoice Lookup"
          description="Load a known ecommerce order id from the ecommerce owner routes. This hub is read-only until broad staff queues are added."
          action={<span className="badge badge-gray">{ecommerceLoadLabel}</span>}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="text-xs text-ink-muted">
              Ecommerce order id
              <input
                value={ecommerceOrderId}
                onChange={(event) => setEcommerceOrderId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                placeholder="Paste an ecommerce order UUID"
              />
            </label>
            <button
              type="button"
              onClick={handleLoadEcommerceOrder}
              disabled={ecommerceState.status === 'invoice_order_loading'}
              className="btn-primary self-end"
            >
              {ecommerceState.status === 'invoice_order_loading' ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Load Order
            </button>
          </div>

          {ecommerceState.message ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-xs ${
                ecommerceState.status === 'invoice_order_loaded'
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                  : ecommerceState.status === 'invoice_order_runtime_unavailable'
                    ? 'border-red-500/25 bg-red-500/10 text-red-200'
                    : 'border-amber-500/25 bg-amber-500/10 text-amber-100'
              }`}
            >
              {ecommerceState.message}
            </div>
          ) : null}

          {ecommerceState.order ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl border border-surface-border bg-surface-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                      Ecommerce Order Snapshot
                    </p>
                    <p className="mt-2 text-xl font-bold text-ink-primary">{ecommerceState.order.orderNumber}</p>
                    <p className="mt-1 text-xs text-ink-muted break-all">{ecommerceState.order.id}</p>
                  </div>
                  <StatusBadge value={ecommerceState.order.status} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <DetailTile label="Subtotal" value={ecommerceState.order.subtotalLabel} />
                  <DetailTile label="Items" value={ecommerceState.order.items.length} />
                  <DetailTile label="Created" value={formatDateTime(ecommerceState.order.createdAt)} />
                </div>
              </div>

              {ecommerceState.invoice ? (
                <div className="rounded-3xl border border-surface-border bg-surface-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                        Ecommerce Invoice Tracking
                      </p>
                      <p className="mt-2 text-xl font-bold text-ink-primary">{ecommerceState.invoice.invoiceNumber}</p>
                    </div>
                    <StatusBadge value={ecommerceState.invoice.status} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <DetailTile label="Total" value={ecommerceState.invoice.totalLabel} />
                    <DetailTile label="Amount Due" value={ecommerceState.invoice.amountDueLabel} />
                    <DetailTile label="Aging" value={ecommerceState.invoice.agingBucketLabel} />
                    <DetailTile label="Due At" value={formatDateTime(ecommerceState.invoice.dueAt)} />
                  </div>

                  <div className="mt-4">
                    <PaymentEntries entries={ecommerceState.invoice.paymentEntries} />
                  </div>
                </div>
              ) : ecommerceState.invoiceError ? (
                <InfoPanel
                  icon={AlertTriangle}
                  title="Invoice detail unavailable"
                  body={ecommerceState.invoiceError}
                  tone="warning"
                />
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-surface-border bg-surface-raised px-5 py-10 text-center">
              <ShoppingBag size={24} className="mx-auto text-ink-muted" />
              <p className="mt-3 text-sm font-bold text-ink-primary">Known-order lookup only</p>
              <p className="mt-2 text-xs leading-6 text-ink-muted">
                Paste a known ecommerce order id to load live order and invoice detail. If there is no id yet, this panel stays empty instead of showing placeholder queue data.
              </p>
            </div>
          )}
        </SectionShell>
      </div>

      <SectionShell
        title="Invoice Aging Analytics"
        description="Read-only reminder-policy analytics remain visible here and in the analytics hub, but they are not direct payment-settlement truth."
        action={
          <button
            type="button"
            onClick={() => loadInvoiceAging()}
            disabled={agingState.status === 'invoice_order_loading'}
            className="btn-secondary"
          >
            <RefreshCcw size={14} className={agingState.status === 'invoice_order_loading' ? 'animate-spin' : ''} />
            Refresh Aging
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="badge badge-gray">{agingLoadLabel}</span>
          <Link href="/admin/summaries" className="badge badge-blue">
            Open analytics hub
          </Link>
        </div>

        {agingState.message && agingState.status === 'invoice_order_failed' ? (
          <InfoPanel icon={AlertTriangle} title="Invoice-aging load failed" body={agingState.message} tone="warning" />
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            icon={ReceiptText}
            label="Tracked Invoices"
            value={invoiceAging?.totals?.trackedInvoices ?? 0}
            sub="Invoices represented in reminder analytics."
          />
          <MetricCard
            icon={Clock3}
            label="Scheduled Rules"
            value={invoiceAging?.totals?.scheduledReminderRules ?? 0}
            sub="Reminder rules still scheduled."
          />
          <MetricCard
            icon={CheckCircle2}
            label="Processed Rules"
            value={invoiceAging?.totals?.processedReminderRules ?? 0}
            sub="Rules already processed."
          />
          <MetricCard
            icon={AlertTriangle}
            label="Cancelled Rules"
            value={invoiceAging?.totals?.cancelledReminderRules ?? 0}
            sub="Rules cancelled before processing."
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">Aging Buckets</p>
            <div className="mt-4 grid gap-3">
              {agingBuckets.length ? (
                agingBuckets.map((bucket) => (
                  <div key={bucket.bucket} className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    <span className="text-sm text-ink-secondary">{bucket.label ?? formatLabel(bucket.bucket)}</span>
                    <span className="text-xl font-black text-ink-primary">{bucket.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-ink-muted">
                  No aging buckets are present in the latest analytics snapshot.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">Tracked Reminder Policies</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Latest Status</th>
                    <th className="px-4 py-3 font-semibold">Scheduled For</th>
                    <th className="px-4 py-3 font-semibold">Rule Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {trackedInvoicePolicies.length ? (
                    trackedInvoicePolicies.map((policy) => (
                      <tr key={policy.invoiceId} className="hover:bg-surface-hover">
                        <td className="px-4 py-3.5 font-semibold text-ink-primary break-all">{policy.invoiceId}</td>
                        <td className="px-4 py-3.5 text-ink-secondary">{policy.latestReminderStatus}</td>
                        <td className="px-4 py-3.5 text-ink-secondary">{policy.latestScheduledForLabel}</td>
                        <td className="px-4 py-3.5 font-bold text-ink-primary">{policy.reminderRuleIds?.length ?? 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                        No tracked reminder policies are present in the latest snapshot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell
        title="Live Route Ledger"
        description="This page stays honest about owner routes, available mutations, and the route gaps needed for a broader staff finance queue."
      >
        <div className="space-y-5">
          <RouteLedger routes={allSurfaceRoutes} />
          <div className="rounded-3xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">Mutation routes intentionally not duplicated here</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Service payment remains in the Job Order Workbench. Ecommerce order status, cancel,
              invoice payment entry, and invoice status routes are live contracts, but this hub keeps
              them read-only until a dedicated staff ecommerce queue is built.
            </p>
            <RouteLedger
              routes={[
                staffInvoiceOrderActionRoutes.serviceInvoicePayment,
                staffInvoiceOrderActionRoutes.ecommerceOrderStatus,
                staffInvoiceOrderActionRoutes.ecommerceOrderCancel,
                staffInvoiceOrderActionRoutes.ecommerceInvoicePaymentEntry,
                staffInvoiceOrderActionRoutes.ecommerceInvoiceStatus,
              ]}
            />
          </div>
        </div>
      </SectionShell>
    </div>
  )
}
