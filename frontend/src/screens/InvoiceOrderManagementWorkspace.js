'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Clock3,
  LoaderCircle,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShoppingBag,
  Wrench,
} from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import { ApiError, listAdminCustomers } from '@/lib/authClient'
import { getInvoiceAgingAnalytics } from '@/lib/analyticsAdminClient'
import { getJobOrderInvoiceLookup, listJobOrderWorkbenchSummaries } from '@/lib/jobOrderWorkbenchClient'
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

function InfoPanel({ icon: Icon = AlertTriangle, title, body, tone = 'info' }) {
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

function PaymentEntries({ entries }) {
  if (!entries?.length) {
    return (
      <div className="empty-panel">
        <ReceiptText size={22} className="mx-auto text-ink-muted" />
        <p className="mt-3 text-sm font-semibold text-ink-primary">No payment entries yet</p>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          Payment entries appear here after the selected invoice has recorded follow-through.
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
  const [activeMode, setActiveMode] = useState('service')
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
        message: 'Completion history loaded from the latest invoice-aging snapshot.',
        snapshot,
      })
    } catch (error) {
      setAgingState({
        status:
          error instanceof ApiError && error.status === 0
            ? 'invoice_order_runtime_unavailable'
            : 'invoice_order_failed',
        message: error?.message || 'Completion history could not be loaded.',
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
      const jobOrder = await getJobOrderInvoiceLookup({
        jobOrderId: jobOrderId.trim(),
        accessToken: user.accessToken,
      })
      const invoiceRecord = jobOrder?.invoiceRecord ?? jobOrder?.invoice_record ?? null

      setJobOrderState({
        status: getStaffInvoiceOrderLoadState({
          hasSession: true,
          canRead,
          hasData: Boolean(invoiceRecord),
        }),
        message: invoiceRecord
          ? 'Service record loaded for invoice follow-through.'
          : jobOrder
            ? 'Job order loaded, but no invoice-ready record is attached yet.'
            : 'Service invoice snapshot is unavailable for the selected job order.',
        jobOrder: jobOrder
          ? {
              ...jobOrder,
              invoiceRecord,
            }
          : null,
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
          ? 'Order loaded, but invoice detail is still unavailable.'
          : 'Order and invoice detail loaded.',
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
  const ecommerceLoadLabel = LOAD_STATE_LABELS[ecommerceState.status] ?? 'Order Lookup'
  const jobOrderLoadLabel = LOAD_STATE_LABELS[jobOrderState.status] ?? 'Service Invoice Lookup'
  const agingLoadLabel = LOAD_STATE_LABELS[agingState.status] ?? 'Invoice Aging'

  const queueCards = useMemo(
    () => [
      {
        key: 'service',
        icon: Wrench,
        label: 'Service invoice-ready',
        status: jobOrderLoadLabel,
        body: serviceInvoice
          ? `${serviceInvoice.invoiceReference} is ready for payment follow-through.`
          : jobOrderState.message || 'Load a finalized job order to review its invoice-ready record.',
      },
      {
        key: 'order',
        icon: ShoppingBag,
        label: 'Order completion',
        status: ecommerceLoadLabel,
        body: ecommerceOrder
          ? `${ecommerceOrder.orderNumber} is available for invoice and payment review.`
          : ecommerceState.message || 'Load a customer order to inspect invoice and payment detail.',
      },
      {
        key: 'history',
        icon: Clock3,
        label: 'Completion history',
        status: agingLoadLabel,
        body: invoiceAging?.totals?.trackedInvoices
          ? `${invoiceAging.totals.trackedInvoices} tracked invoices are visible in the latest aging snapshot.`
          : agingState.message || 'Refresh aging data when you need queue context for older records.',
      },
    ],
    [
      agingLoadLabel,
      agingState.message,
      ecommerceLoadLabel,
      ecommerceOrder,
      ecommerceState.message,
      invoiceAging?.totals?.trackedInvoices,
      jobOrderLoadLabel,
      jobOrderState.message,
      serviceInvoice,
    ],
  )
  const hasLookupData = activeMode === 'service' ? Boolean(jobOrderState.jobOrder) : Boolean(ecommerceOrder || ecommerceInvoice)

  if (!user?.accessToken) {
    return (
      <InfoPanel
        icon={ShieldAlert}
        title="Staff sign-in required"
        body="Sign in as a service adviser or super admin before opening Invoices & Orders."
        tone="warning"
      />
    )
  }

  if (!canRead) {
    return (
      <InfoPanel
        icon={ShieldAlert}
        title="Invoices & Orders is adviser/admin only"
        body="Technician sessions can work inside assigned job orders, but invoice/order management stays with service advisers and super admins."
        tone="warning"
      />
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Financial Operations"
        title="Invoices & Orders"
        description="Review invoice-ready work, payment entries, and completion records."
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
        <div className="space-y-4">
          <div>
            <p className="card-title">Lookup</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              Choose a billing mode first, then load one record at a time.
            </p>
          </div>

          <div className="booking-segmented-control w-full max-w-[420px]">
            <button
              type="button"
              onClick={() => setActiveMode('service')}
              className={`booking-tab-button ${activeMode === 'service' ? 'booking-tab-button-active' : ''}`}
            >
              Service Invoices
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('order')}
              className={`booking-tab-button ${activeMode === 'order' ? 'booking-tab-button-active' : ''}`}
            >
              Order Invoices
            </button>
          </div>

          {activeMode === 'service' ? (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <label>
                <span className="label">Service record</span>
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
                Load Service
              </button>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto]">
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
                  <option value="">Choose customer for order lookup</option>
                  {customerOptions.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.displayName} / {customer.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Order record</span>
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
          )}
        </div>
      </section>

      <section className="space-y-5">
        <div className="ops-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="card-title">Lookup State</p>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Keep one live summary in view while you work through invoice detail and payment history.
              </p>
            </div>
            <span className="badge badge-gray">{agingLoadLabel}</span>
          </div>

          {hasLookupData ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              {queueCards.map((card) => {
                const Icon = card.icon

                return (
                  <div key={card.key} className="rounded-2xl border border-surface-border bg-surface-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">{card.label}</p>
                        <p className="mt-2 text-sm font-semibold text-ink-primary">{card.status}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
                        <Icon size={18} />
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-secondary">{card.body}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {queueCards.map((card) => (
                <span key={card.key} className="badge badge-gray">
                  {card.label}: {card.status}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="ops-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="card-title">Invoice Detail</p>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Review the selected invoice snapshot without leaving this billing workspace.
              </p>
            </div>
            <span className="badge badge-gray">
              {serviceInvoice ? 'Service invoice ready' : ecommerceInvoice ? 'Order invoice ready' : 'Awaiting invoice'}
            </span>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">Service invoice</p>
                  <p className="mt-2 text-xl font-bold text-ink-primary">{serviceInvoice?.invoiceReference ?? 'Not loaded'}</p>
                </div>
                <StatusBadge value={serviceInvoice?.paymentStatus ?? 'awaiting invoice'} />
              </div>
              {serviceInvoice ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <DetailTile label="Total" value={formatInvoiceOrderCurrency(serviceInvoice.totalAmountCents)} />
                  <DetailTile label="Amount recorded" value={formatInvoiceOrderCurrency(serviceInvoice.amountPaidCents)} />
                  <DetailTile label="Receipt" value={serviceInvoice.officialReceiptReference ?? 'Generated on finalization'} />
                  <DetailTile label="PDF delivery" value={getInvoicePdfStateLabel(serviceInvoice)} />
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  Load a finalized job order to review the service invoice-ready record.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">Order invoice</p>
                  <p className="mt-2 text-xl font-bold text-ink-primary">{ecommerceInvoice?.invoiceNumber ?? 'Not loaded'}</p>
                </div>
                <StatusBadge value={ecommerceInvoice?.status ?? 'awaiting invoice'} />
              </div>
              {ecommerceInvoice ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <DetailTile label="Total" value={ecommerceInvoice.totalLabel} />
                  <DetailTile label="Amount due" value={ecommerceInvoice.amountDueLabel} />
                  <DetailTile label="Aging" value={ecommerceInvoice.agingBucketLabel} />
                  <DetailTile label="Due at" value={formatDateTime(ecommerceInvoice.dueAt)} />
                </div>
              ) : ecommerceState.invoiceError ? (
                <div className="mt-3">
                  <InfoPanel
                    icon={AlertTriangle}
                    title="Invoice detail unavailable"
                    body={ecommerceState.invoiceError}
                    tone="warning"
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  Load an ecommerce order to inspect the linked invoice detail.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="ops-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="card-title">Payment Entries</p>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Review payment entries for the selected invoice context.
              </p>
            </div>
            <span className="badge badge-gray">
              {ecommerceInvoice ? `${paymentEntries.length} ecommerce entr${paymentEntries.length === 1 ? 'y' : 'ies'}` : 'Invoice detail only'}
            </span>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-4">
              <div className="ops-panel-muted">
                <p className="text-sm font-bold text-ink-primary">Payment boundary</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{staffInvoiceOrderPaymentCopy}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <PaymentEntries entries={paymentEntries} />
            </div>
          </div>
        </div>

        <div className="ops-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="card-title">Aging & Reminder History</p>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Review aging and reminder history.
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

          {agingState.message ? (
            <div className={`mt-4 ${getLoadMessageToneClass(agingState.status)}`}>
              {agingState.message}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-[0.84fr_1.16fr]">
            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <p className="text-sm font-bold text-ink-primary">Aging buckets</p>
              <div className="mt-4 grid gap-3">
                {agingBuckets.length ? (
                  agingBuckets.map((bucket) => (
                    <div key={bucket.bucket} className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                      <span className="text-sm text-ink-secondary">{bucket.label ?? formatLabel(bucket.bucket)}</span>
                      <span className="text-xl font-black text-ink-primary">{bucket.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-ink-muted">
                    No aging buckets are visible in the latest snapshot.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <p className="text-sm font-bold text-ink-primary">Tracked reminder policies</p>
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
                          No reminder policies are visible in the latest snapshot.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
