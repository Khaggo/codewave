'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
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

import PageHeader from '@/components/ui/PageHeader'
import PortalLink from '@/components/PortalLink'
import { ApiError, listAdminCustomers } from '@/lib/authClient'
import { getInvoiceAgingAnalytics } from '@/lib/analyticsAdminClient'
import { getJobOrderById, listJobOrderWorkbenchSummaries } from '@/lib/jobOrderWorkbenchClient'
import {
  formatInvoiceOrderCurrency,
  listStaffEcommerceOrdersByUserId,
  loadStaffEcommerceOrderSnapshot,
} from '@/lib/invoiceOrderManagementClient'
import { useUser } from '@/lib/userContext'
import {
  canStaffReadInvoiceOrderManagement,
  getStaffInvoiceOrderLoadState,
  staffInvoiceOrderPaymentCopy,
} from '@/lib/api/generated/invoice-orders/staff-web-invoice-order-management'
import {
  getInvoicePdfStateLabel,
  getLoadMessageTone,
  shortId,
} from './invoiceOrderManagementView.mjs'

const LOAD_STATE_LABELS = {
  invoice_order_ready: 'Ready',
  invoice_order_loading: 'Loading Live Data',
  invoice_order_loaded: 'Live Data Loaded',
  invoice_order_partial: 'Partially Loaded',
  invoice_order_empty: 'No Data Loaded Yet',
  invoice_order_forbidden_role: 'Role Blocked',
  invoice_order_unauthorized: 'Sign-In Required',
  invoice_order_runtime_unavailable: 'Runtime Unavailable',
  invoice_order_failed: 'Unavailable',
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

const getLoadMessageToneClass = (status) =>
  getLoadMessageTone(status) === 'success'
    ? 'status-message status-message-success'
    : getLoadMessageTone(status) === 'danger'
      ? 'status-message status-message-danger'
      : 'status-message status-message-warning'

function InfoPanel({ icon: Icon = Database, title, body, tone = 'info' }) {
  const panelTone =
    tone === 'danger'
      ? 'status-message status-message-danger'
      : tone === 'warning'
        ? 'status-message status-message-warning'
        : 'status-message status-message-warning'

  return (
    <div className={`flex gap-3 ${panelTone}`}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-primary">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ink-secondary">{body}</p>
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
          <p className="mt-3 text-3xl font-semibold text-ink-primary">{value}</p>
          {sub ? <p className="mt-2 text-xs leading-5 text-ink-secondary">{sub}</p> : null}
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ value }) {
  const normalizedValue = String(value ?? '').trim()
  const normalizedKey = normalizedValue.toLowerCase()
  const cls =
    normalizedKey.includes('overdue') ||
    normalizedKey.includes('blocked') ||
    normalizedKey.includes('failed') ||
    normalizedKey.includes('cancelled') ||
    normalizedKey.includes('canceled')
        ? 'badge-red'
        : normalizedKey.includes('unpaid') ||
            normalizedKey.includes('pending') ||
            normalizedKey.includes('partial') ||
            normalizedKey.includes('due') ||
            normalizedKey.includes('processing')
          ? 'badge-orange'
          : normalizedKey.includes('paid') ||
              normalizedKey.includes('fulfilled') ||
              normalizedKey === 'finalized' ||
              normalizedKey.includes('settled') ||
              normalizedKey.includes('completed')
            ? 'badge-green'
            : 'badge-gray'

  return <span className={`badge ${cls}`}>{formatLabel(normalizedValue, 'Unknown')}</span>
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
            <p className="text-sm font-bold text-ink-primary">{route.label}</p>
            <span className={`badge ${route.status === 'live' ? 'badge-green' : 'badge-orange'}`}>
              {route.status === 'live' ? 'Ready' : 'Planned'}
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
      <div className="empty-panel">
        <ReceiptText size={22} className="mx-auto text-ink-muted" />
        <p className="mt-3 text-sm font-semibold text-ink-primary">No payment entries yet</p>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          Payment-entry creation is backend-owned and remains manual tracking, not payment-gateway settlement.
        </p>
      </div>
    )
  }

  return (
    <div className="table-scroll">
      <table className="data-table min-w-[720px]">
        <thead>
          <tr>
            <th>Received</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="text-ink-secondary">{formatDateTime(entry.receivedAt)}</td>
              <td className="font-semibold text-ink-primary">{entry.amountLabel}</td>
              <td className="text-ink-secondary">{entry.paymentMethodLabel}</td>
              <td className="text-ink-secondary">{entry.reference ?? 'No reference'}</td>
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
  const [jobOrderOptions, setJobOrderOptions] = useState([])
  const [customerOptions, setCustomerOptions] = useState([])
  const [selectedCustomerUserId, setSelectedCustomerUserId] = useState('')
  const [ecommerceOrderOptions, setEcommerceOrderOptions] = useState([])
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

  useEffect(() => {
    if (!user?.accessToken || !canRead) {
      setJobOrderOptions([])
      setCustomerOptions([])
      return
    }

    void Promise.all([
      listJobOrderWorkbenchSummaries({
        accessToken: user.accessToken,
        month: new Date().toISOString().slice(0, 7),
        scope: 'history',
      }),
      listAdminCustomers(user.accessToken),
    ])
      .then(([jobOrders, customers]) => {
        setJobOrderOptions(jobOrders.filter((jobOrder) => ['finalized', 'cancelled'].includes(jobOrder.status)))
        setCustomerOptions(customers)
      })
      .catch(() => {
        setJobOrderOptions([])
        setCustomerOptions([])
      })
  }, [canRead, user?.accessToken])

  useEffect(() => {
    if (!user?.accessToken || !selectedCustomerUserId || !canRead) {
      setEcommerceOrderOptions([])
      return
    }

    void listStaffEcommerceOrdersByUserId({
      customerUserId: selectedCustomerUserId,
      accessToken: user.accessToken,
    })
      .then((orders) => setEcommerceOrderOptions(orders))
      .catch(() => setEcommerceOrderOptions([]))
  }, [canRead, selectedCustomerUserId, user?.accessToken])

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
          ? 'Service invoice-ready record loaded from the finalized job order.'
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
          ? 'Order loaded, but invoice detail was not available yet.'
          : 'Order and invoice tracking loaded.',
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
  const ecommerceOrder = ecommerceState.order ?? null
  const ecommerceInvoice = ecommerceState.invoice ?? null
  const paymentEntries = ecommerceInvoice?.paymentEntries ?? []
  const hasFinanceDetail = Boolean(jobOrderState.jobOrder || ecommerceOrder || serviceInvoice || ecommerceInvoice)
  const ecommerceLoadLabel = LOAD_STATE_LABELS[ecommerceState.status] ?? 'Order Lookup'
  const jobOrderLoadLabel = LOAD_STATE_LABELS[jobOrderState.status] ?? 'Service Invoice Lookup'
  const agingLoadLabel = LOAD_STATE_LABELS[agingState.status] ?? 'Invoice Aging'
  const serviceInvoiceSummaryValue =
    jobOrderState.status === 'invoice_order_loading'
      ? 'Loading Service Record'
      : serviceInvoice
        ? 'Invoice Ready'
        : jobOrderState.jobOrder
          ? 'No Invoice Record'
          : 'Awaiting Lookup'
  const servicePaymentStateValue = serviceInvoice?.paymentStatus
    ? formatLabel(serviceInvoice.paymentStatus)
    : serviceInvoice
      ? 'Unrecorded'
      : 'Awaiting Service Invoice'
  const ecommerceOrderStateValue =
    ecommerceState.status === 'invoice_order_loading'
      ? 'Loading Order'
      : ecommerceOrder?.status
        ? formatLabel(ecommerceOrder.status)
        : ecommerceState.status === 'invoice_order_partial'
          ? 'Invoice Pending'
          : ecommerceState.status === 'invoice_order_runtime_unavailable'
            ? 'Runtime Offline'
            : ecommerceState.status === 'invoice_order_failed'
              ? 'Unavailable'
              : 'Awaiting Order'

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
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Financial Operations"
        title="Invoice & Order Management"
        description="Review service invoices, ecommerce orders, and aging analytics from one workspace."
        actions={(
          <button
            type="button"
            onClick={loadInvoiceAging}
            disabled={agingState.status === 'invoice_order_loading'}
            className="ops-action-secondary min-w-[148px] self-start disabled:cursor-not-allowed disabled:opacity-60 xl:self-auto"
          >
            <RefreshCcw size={14} className={agingState.status === 'invoice_order_loading' ? 'animate-spin' : undefined} />
            Refresh
          </button>
        )}
      />

      <section className="ops-control-strip">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label>
            <span className="label">Job order</span>
            <select
              value={jobOrderId}
              onChange={(event) => setJobOrderId(event.target.value)}
              className="select"
            >
              <option value="">Choose a finalized job order</option>
              {jobOrderOptions.map((jobOrder) => (
                <option key={jobOrder.id} value={jobOrder.id}>
                  JO-{jobOrder.id.slice(0, 8).toUpperCase()} / {formatLabel(jobOrder.status)} / {jobOrder.workDate ?? 'No date'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleLoadServiceInvoice}
            disabled={jobOrderState.status === 'invoice_order_loading'}
            className="ops-action-primary xl:min-w-[148px] xl:self-end"
          >
            {jobOrderState.status === 'invoice_order_loading' ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Load Job Order
          </button>
          <label>
            <span className="label">Customer</span>
            <select
              value={selectedCustomerUserId}
              onChange={(event) => {
                setSelectedCustomerUserId(event.target.value)
                setEcommerceOrderId('')
              }}
              className="select"
            >
              <option value="">Choose customer for ecommerce orders</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName} / {customer.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Ecommerce order</span>
            <select
              value={ecommerceOrderId}
              onChange={(event) => setEcommerceOrderId(event.target.value)}
              className="select"
            >
              <option value="">{selectedCustomerUserId ? 'Choose ecommerce order' : 'Choose customer first'}</option>
              {ecommerceOrderOptions.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} / {formatLabel(order.status)} / {order.invoice?.statusLabel ?? 'No invoice'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleLoadEcommerceOrder}
            disabled={ecommerceState.status === 'invoice_order_loading'}
            className="ops-action-primary xl:min-w-[148px] xl:self-end"
          >
            {ecommerceState.status === 'invoice_order_loading' ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Load Order
          </button>
        </div>
      </section>

      <section className="ops-summary-grid">
        <MetricCard
          icon={Database}
          label="Service Invoice State"
          value={serviceInvoiceSummaryValue}
          sub={serviceInvoice ? serviceInvoice.invoiceReference : `Service: ${jobOrderLoadLabel}`}
        />
        <MetricCard
          icon={BarChart3}
          label="Aging Snapshot"
          value={invoiceAging?.totals?.trackedInvoices ?? 0}
          sub={`${agingBuckets.length} buckets • ${trackedInvoicePolicies.length} reminder policies`}
        />
        <MetricCard
          icon={ReceiptText}
          label="Service Payment State"
          value={servicePaymentStateValue}
          sub={
            serviceInvoice
              ? `${formatInvoiceOrderCurrency(serviceInvoice.totalAmountCents)} due after ${formatInvoiceOrderCurrency(serviceInvoice.reservationFeeDeductionCents)} reservation deduction`
              : 'Service payment stays in the Job Order Workbench.'
          }
        />
        <MetricCard
          icon={PackageCheck}
          label="Ecommerce Order State"
          value={ecommerceOrderStateValue}
          sub={
            ecommerceOrder
              ? ecommerceOrder.orderNumber
              : `Orders: ${ecommerceLoadLabel}`
          }
        />
      </section>

      <section className="space-y-5">
        {(serviceInvoice || ecommerceInvoice || ecommerceOrder) ? (
          <div className="ops-panel">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="card-title">Financial Snapshot</p>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Review aging, payment guidance, and live billing lookups before detail review.
              </p>
            </div>
            <span className="badge badge-gray">{agingLoadLabel}</span>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <div className="ops-panel-muted">
                <p className="text-sm font-bold text-ink-primary">Payment-state boundary</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{staffInvoiceOrderPaymentCopy}</p>
              </div>

              {agingState.message ? (
                <div className={getLoadMessageToneClass(agingState.status)}>
                  {agingState.message}
                </div>
              ) : null}

              <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                <p className="text-sm font-bold text-ink-primary">Aging Buckets</p>
                <div className="mt-4 grid gap-3">
                  {agingBuckets.length ? (
                    agingBuckets.map((bucket) => (
                      <div key={bucket.bucket} className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3">
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
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink-primary">Tracked Reminder Policies</p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    Reminder analytics remain read-only here and may lag owner workflow writes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadInvoiceAging()}
                  disabled={agingState.status === 'invoice_order_loading'}
                  className="ops-action-secondary sm:min-w-[148px]"
                >
                  <RefreshCcw size={14} className={agingState.status === 'invoice_order_loading' ? 'animate-spin' : undefined} />
                  Refresh Aging
                </button>
              </div>
              <div className="mt-4 table-scroll">
                <table className="data-table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Latest Status</th>
                      <th>Scheduled For</th>
                      <th>Rule Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedInvoicePolicies.length ? (
                      trackedInvoicePolicies.map((policy) => (
                        <tr key={policy.invoiceId}>
                          <td className="break-all font-semibold text-ink-primary">{policy.invoiceId}</td>
                          <td className="text-ink-secondary">{policy.latestReminderStatus}</td>
                          <td className="text-ink-secondary">{policy.latestScheduledForLabel}</td>
                          <td className="font-semibold text-ink-primary">{policy.reminderRuleIds?.length ?? 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-ink-muted">
                          No tracked reminder policies are present in the latest snapshot.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </div>
        ) : null}

        {hasFinanceDetail ? (
          <div className="grid gap-5 xl:grid-cols-2">
          <div className="ops-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="card-title">Job Order Billing Detail</p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  Inspect loaded job orders for invoice and payment status.
                </p>
              </div>
              <span className="badge badge-gray">{jobOrderLoadLabel}</span>
            </div>

            {jobOrderState.message ? (
              <div className={`mt-4 ${getLoadMessageToneClass(jobOrderState.status)}`}>
                {jobOrderState.message}
              </div>
            ) : null}

            {jobOrderState.jobOrder ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <DetailTile label="Job Order" value={`JO-${shortId(jobOrderState.jobOrder.id)}`} />
                  <DetailTile label="Status" value={formatLabel(jobOrderState.jobOrder.status)} />
                  <DetailTile label="Source" value={formatLabel(jobOrderState.jobOrder.sourceType)} />
                </div>

                {serviceInvoice ? (
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
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
                      <DetailTile label="Subtotal Before Deduction" value={formatInvoiceOrderCurrency(serviceInvoice.subtotalAmountCents)} />
                      <DetailTile
                        label="Reservation Fee Deduction"
                        value={formatInvoiceOrderCurrency(serviceInvoice.reservationFeeDeductionCents)}
                      />
                      <DetailTile label="Invoice Total" value={formatInvoiceOrderCurrency(serviceInvoice.totalAmountCents)} />
                      <DetailTile label="Amount Recorded" value={formatInvoiceOrderCurrency(serviceInvoice.amountPaidCents)} />
                      <DetailTile label="Payment Method" value={formatLabel(serviceInvoice.paymentMethod, 'Not recorded')} />
                      <DetailTile label="Paid At" value={formatDateTime(serviceInvoice.paidAt)} />
                      <DetailTile label="Official Receipt" value={serviceInvoice.officialReceiptReference ?? 'Generated on finalization'} />
                      <DetailTile label="Finalized By" value={serviceInvoice.finalizedByUserId} breakAll />
                      <DetailTile label="PDF Delivery" value={getInvoicePdfStateLabel(serviceInvoice)} />
                    </div>

                    {serviceInvoice.summary ? (
                      <div className="mt-4 rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Invoice summary</p>
                        <p className="mt-2 text-sm leading-6 text-ink-secondary">{serviceInvoice.summary}</p>
                      </div>
                    ) : null}

                    {serviceInvoice.pdfEmailError ? (
                      <div className="mt-4 status-message status-message-warning">
                        PDF delivery issue: {serviceInvoice.pdfEmailError}
                      </div>
                    ) : null}

                    <p className="mt-4 text-sm leading-6 text-ink-muted">
                      Service invoice payment stays owned by the Job Order Workbench. This finance surface is read-only and now reflects the reservation-fee deduction, official receipt, and PDF/email trail from finalization.
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

                <PortalLink href="/admin/job-orders" className="btn-ghost w-fit">
                  <ExternalLink size={14} />
                  Open Job Order Workbench
                </PortalLink>
              </div>
            ) : null}
          </div>

          <div className="ops-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="card-title">Ecommerce Order Detail</p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  Inspect loaded ecommerce orders and invoice details.
                </p>
              </div>
              <span className="badge badge-gray">{ecommerceLoadLabel}</span>
            </div>

            {ecommerceState.message ? (
              <div className={`mt-4 ${getLoadMessageToneClass(ecommerceState.status)}`}>
                {ecommerceState.message}
              </div>
            ) : null}

            {ecommerceOrder ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                        Ecommerce Order Snapshot
                      </p>
                      <p className="mt-2 text-xl font-bold text-ink-primary">{ecommerceOrder.orderNumber}</p>
                      <p className="mt-1 break-all text-xs text-ink-muted">{ecommerceOrder.id}</p>
                    </div>
                    <StatusBadge value={ecommerceOrder.status} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <DetailTile label="Subtotal" value={ecommerceOrder.subtotalLabel} />
                    <DetailTile label="Items" value={ecommerceOrder.items?.length ?? 0} />
                    <DetailTile label="Created" value={formatDateTime(ecommerceOrder.createdAt)} />
                  </div>
                </div>

                {ecommerceInvoice ? (
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                          Ecommerce Invoice Tracking
                        </p>
                        <p className="mt-2 text-xl font-bold text-ink-primary">{ecommerceInvoice.invoiceNumber}</p>
                      </div>
                      <StatusBadge value={ecommerceInvoice.status} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DetailTile label="Total" value={ecommerceInvoice.totalLabel} />
                      <DetailTile label="Amount Due" value={ecommerceInvoice.amountDueLabel} />
                      <DetailTile label="Aging" value={ecommerceInvoice.agingBucketLabel} />
                      <DetailTile label="Due At" value={formatDateTime(ecommerceInvoice.dueAt)} />
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
            ) : null}
          </div>
          </div>
        ) : (
          <InfoPanel
            icon={ReceiptText}
            title="Load a finalized job order or known ecommerce order"
            body="This page now stays focused on real billing detail only. Load a finalized job order or a known ecommerce order from the control strip to inspect records here."
          />
        )}

        <div className="ops-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="card-title">Payment Entries</p>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Review payment entries for the loaded invoice context.
              </p>
            </div>
            <span className="badge badge-gray">
              {ecommerceInvoice ? `${paymentEntries.length} ecommerce entr${paymentEntries.length === 1 ? 'y' : 'ies'}` : 'Ecommerce invoice only'}
            </span>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-4">
              <div className="ops-panel-muted">
                <p className="text-sm font-bold text-ink-primary">Service payment record</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {serviceInvoice
                    ? `${formatInvoiceOrderCurrency(serviceInvoice.amountPaidCents)} recorded against ${formatInvoiceOrderCurrency(serviceInvoice.totalAmountCents)} total after a ${formatInvoiceOrderCurrency(serviceInvoice.reservationFeeDeductionCents)} reservation-fee deduction. OR ${serviceInvoice.officialReceiptReference} is ${serviceInvoice.pdfEmailSentAt ? 'already emailed to the customer.' : 'still waiting for PDF/email delivery.'}`
                    : 'Service payment recording still happens in the Job Order Workbench after finalization.'}
                </p>
              </div>

              <div className="ops-panel-muted">
                <p className="text-sm font-bold text-ink-primary">Ecommerce invoice coverage</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {ecommerceState.invoiceError
                    ? ecommerceState.invoiceError
                    : ecommerceInvoice
                      ? `Invoice ${ecommerceInvoice.invoiceNumber} is visible here with ${paymentEntries.length} tracked payment entr${paymentEntries.length === 1 ? 'y' : 'ies'}.`
                      : 'Load a known ecommerce order to inspect invoice payment-entry history.'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <PaymentEntries entries={paymentEntries} />
            </div>
          </div>
        </div>

      </section>
    </div>
  )
}
