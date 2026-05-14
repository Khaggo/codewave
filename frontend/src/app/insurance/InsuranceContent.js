'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileClock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useUser } from '@/lib/userContext'
import { ApiError } from '@/lib/authClient'
import {
  getInsuranceInquiryById,
  listInsuranceInquiries,
  updateInsuranceInquiryStatus,
} from '@/lib/insuranceStaffClient'
import {
  getAllowedInsuranceStatusTargets,
  insuranceReviewStaffRoles,
} from '@/lib/api/generated/insurance/staff-web-insurance'
import {
  buildInsuranceTableRow,
  formatStatusLabel,
  getInsuranceDetailTabs,
  getNextInsuranceWorkspaceViewState,
  getInsuranceSummaryCards,
} from './insuranceView.mjs'

const INQUIRY_STATUS_OPTIONS = [
  'submitted',
  'needs_documents',
  'under_review',
  'for_approval',
  'approved',
  'payment_pending',
  'active',
  'for_renewal',
  'closed',
  'rejected',
  'cancelled',
]

const DOCUMENT_STATUS_OPTIONS = ['incomplete', 'under_verification', 'complete', 'rejected']
const PAYMENT_STATUS_OPTIONS = ['not_required', 'unpaid', 'proof_submitted', 'verifying', 'paid', 'overdue']
const RENEWAL_STATUS_OPTIONS = [
  'not_applicable',
  'upcoming',
  'quoted',
  'awaiting_customer',
  'renewed',
  'expired',
]

const POSITIVE_BADGE_VALUES = new Set(['approved', 'active', 'complete', 'paid', 'renewed'])
const WARNING_BADGE_VALUES = new Set([
  'submitted',
  'needs_documents',
  'payment_pending',
  'for_renewal',
  'incomplete',
  'proof_submitted',
  'unpaid',
  'overdue',
  'upcoming',
  'quoted',
  'awaiting_customer',
  'expired',
])
const INFO_BADGE_VALUES = new Set(['under_review', 'for_approval', 'under_verification', 'verifying'])

const SUMMARY_CARD_ICONS = {
  'New Inquiries': ClipboardList,
  'Payment Pending': Wallet,
  'For Renewal': CalendarClock,
  'Needs Documents': FileClock,
}

const DEFAULT_FILTERS = {
  status: 'all',
  paymentStatus: 'all',
  renewalStatus: 'all',
  search: '',
}

const DEFAULT_UPDATE_DRAFT = {
  status: 'submitted',
  documentStatus: 'incomplete',
  paymentStatus: 'not_required',
  renewalStatus: 'not_applicable',
  paymentDueAt: '',
  policyExpiryAt: '',
  renewalDueAt: '',
  assignedStaffId: '',
  reviewNotes: '',
}

const normalizeFilterValue = (value) => (value && value !== 'all' ? value : undefined)

const getBadgeClassName = (value) => {
  if (POSITIVE_BADGE_VALUES.has(value)) return 'badge-green'
  if (WARNING_BADGE_VALUES.has(value)) return 'badge-orange'
  if (INFO_BADGE_VALUES.has(value)) return 'badge-blue'
  return 'badge-gray'
}

const formatDateTime = (value) => {
  if (!value) return 'Not available'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDateOnly = (value) => {
  if (!value) return 'Not set'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not set'
  }

  return parsedDate.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getTimelineItems = (inquiry) => [
  {
    key: 'submitted',
    label: 'Submitted',
    complete: Boolean(inquiry?.createdAt),
    note: inquiry?.subject || 'Customer intake created',
  },
  {
    key: 'review',
    label: 'Review',
    complete: ['under_review', 'for_approval', 'approved', 'payment_pending', 'active', 'for_renewal', 'closed'].includes(
      inquiry?.status,
    ),
    note: formatStatusLabel(inquiry?.documentStatus || 'incomplete'),
  },
  {
    key: 'payment',
    label: 'Payment',
    complete: ['proof_submitted', 'verifying', 'paid'].includes(inquiry?.paymentStatus),
    note: formatStatusLabel(inquiry?.paymentStatus || 'not_required'),
  },
  {
    key: 'renewal',
    label: 'Renewal',
    complete: ['upcoming', 'quoted', 'awaiting_customer', 'renewed', 'expired'].includes(inquiry?.renewalStatus),
    note: formatStatusLabel(inquiry?.renewalStatus || 'not_applicable'),
  },
]

function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="mt-1 text-2xl font-black text-ink-primary">{value}</p>
          {sub ? <p className="mt-1 text-[11px] text-ink-muted">{sub}</p> : null}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(240, 124, 0, 0.14)', color: '#f07c00' }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function BlockingState({ title, copy }) {
  return (
    <div className="empty-panel px-5 py-10 text-center">
      <ShieldAlert size={34} className="mx-auto mb-3" style={{ color: '#f07c00' }} />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-xs text-ink-muted">{copy}</p>
    </div>
  )
}

function WorkflowBadge({ value, children }) {
  const label = children ?? formatStatusLabel(value)
  return <span className={`badge ${getBadgeClassName(value)}`}>{label}</span>
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="mt-1 text-sm text-ink-primary whitespace-pre-wrap">{value || 'Not set'}</p>
    </div>
  )
}

function EmptyPanel({ title, copy }) {
  return (
    <div className="empty-panel px-4 py-10 text-center">
      <AlertTriangle size={28} className="mx-auto mb-3 text-ink-dim" />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mt-2 text-xs text-ink-muted">{copy}</p>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, includeAll = true, disabled = false }) {
  return (
    <label className="label">
      {label}
      <select value={value} onChange={onChange} className="select" disabled={disabled}>
        {includeAll ? <option value="all">All</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {formatStatusLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function InsuranceDetailTabContent({ inquiry, tabKey }) {
  if (!inquiry) {
    return (
      <EmptyPanel
        title="No case selected"
        copy="Choose a case from the insurance table to review its workflow tabs and edit the phase-1 fields."
      />
    )
  }

  if (tabKey === 'overview') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailField label="Customer" value={inquiry.customerDisplayName} />
        <DetailField label="Vehicle" value={inquiry.vehicleLabel} />
        <DetailField label="Subject" value={inquiry.subject} />
        <DetailField label="Purpose" value={formatStatusLabel(inquiry.purpose)} />
        <DetailField label="Inquiry Type" value={formatStatusLabel(inquiry.inquiryType)} />
        <DetailField label="Assigned Staff" value={inquiry.assignedStaffId} />
        <DetailField label="Provider Name" value={inquiry.providerName} />
        <DetailField label="Policy Number" value={inquiry.policyNumber} />
        <DetailField label="Created" value={formatDateTime(inquiry.createdAt)} />
        <DetailField label="Last Updated" value={formatDateTime(inquiry.updatedAt)} />
        <div className="md:col-span-2">
          <DetailField label="Description" value={inquiry.description} />
        </div>
        <div className="md:col-span-2">
          <DetailField label="Review Notes" value={inquiry.reviewNotes || inquiry.notes} />
        </div>
      </div>
    )
  }

  if (tabKey === 'documents') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink-primary">Document review status</p>
            <WorkflowBadge value={inquiry.documentStatus} />
            <span className="badge badge-gray">{inquiry.documentCount} file(s)</span>
          </div>
        </div>
        {inquiry.documents?.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {inquiry.documents.map((document) => (
              <div
                key={document.id ?? `${document.fileName}-${document.fileUrl}`}
                className="rounded-xl border border-surface-border bg-surface-card px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink-primary">{document.fileName}</p>
                    <p className="mt-1 break-all text-xs text-ink-muted">{document.fileUrl}</p>
                  </div>
                  <WorkflowBadge value={document.documentTypeLabel || document.documentType}>
                    {document.documentTypeLabel || formatStatusLabel(document.documentType)}
                  </WorkflowBadge>
                </div>
                {document.notes ? <p className="mt-3 text-xs leading-5 text-ink-secondary">{document.notes}</p> : null}
                <p className="mt-3 text-[11px] text-ink-muted">Uploaded {formatDateTime(document.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="No uploaded documents yet"
            copy="This case has not received any phase-1 insurance attachments from customer or staff uploads."
          />
        )}
      </div>
    )
  }

  if (tabKey === 'timeline') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {getTimelineItems(inquiry).map((item) => (
          <div key={item.key} className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink-primary">{item.label}</p>
              <span className={`badge ${item.complete ? 'badge-green' : 'badge-gray'}`}>
                {item.complete ? 'Tracked' : 'Waiting'}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-muted">{item.note}</p>
          </div>
        ))}
      </div>
    )
  }

  if (tabKey === 'payment') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailField label="Payment Status" value={formatStatusLabel(inquiry.paymentStatus)} />
        <DetailField label="Payment Due" value={formatDateOnly(inquiry.paymentDueAt)} />
        <div className="md:col-span-2">
          <DetailField label="Payment Notes" value={inquiry.reviewNotes || inquiry.notes} />
        </div>
      </div>
    )
  }

  if (tabKey === 'renewal') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailField label="Renewal Status" value={formatStatusLabel(inquiry.renewalStatus)} />
        <DetailField label="Policy Expiry" value={formatDateOnly(inquiry.policyExpiryAt)} />
        <DetailField label="Renewal Due" value={formatDateOnly(inquiry.renewalDueAt)} />
        <DetailField label="Assigned Staff" value={inquiry.assignedStaffId} />
      </div>
    )
  }

  return inquiry.activities?.length ? (
    <div className="space-y-3">
      {inquiry.activities.map((activityItem) => (
        <div
          key={activityItem.id ?? `${activityItem.action}-${activityItem.createdAt}`}
          className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-ink-dim" />
              <p className="text-sm font-semibold text-ink-primary">{formatStatusLabel(activityItem.action)}</p>
            </div>
            <p className="text-[11px] text-ink-muted">{formatDateTime(activityItem.createdAt)}</p>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Actor: {activityItem.actorUserId || 'System'}{activityItem.documentType ? ` | ${formatStatusLabel(activityItem.documentType)}` : ''}
          </p>
          {activityItem.notes ? <p className="mt-2 text-sm text-ink-secondary">{activityItem.notes}</p> : null}
        </div>
      ))}
    </div>
  ) : (
    <EmptyPanel
      title="No activity recorded yet"
      copy="Activity entries will appear here as staff or customer actions land on the case."
    />
  )
}

export default function InsuranceContent() {
  const user = useUser()
  const role = user?.role ?? null
  const canReviewInsurance = insuranceReviewStaffRoles.includes(role)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [inquiries, setInquiries] = useState([])
  const [selectedInquiryId, setSelectedInquiryId] = useState('')
  const [activeDetailTab, setActiveDetailTab] = useState('overview')
  const [listState, setListState] = useState('idle')
  const [listMessage, setListMessage] = useState('')
  const [detailState, setDetailState] = useState('idle')
  const [detailMessage, setDetailMessage] = useState('')
  const [updateState, setUpdateState] = useState('status_update_ready')
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateDraft, setUpdateDraft] = useState(DEFAULT_UPDATE_DRAFT)
  const [reloadTick, setReloadTick] = useState(0)
  const previousSelectedInquiryIdRef = useRef('')
  const workspaceStateRef = useRef({
    activeDetailTab: 'overview',
    detailMessage: '',
    detailState: 'idle',
    updateDraft: DEFAULT_UPDATE_DRAFT,
    updateMessage: '',
    updateState: 'status_update_ready',
  })

  workspaceStateRef.current = {
    activeDetailTab,
    detailMessage,
    detailState,
    updateDraft,
    updateMessage,
    updateState,
  }

  const detailTabs = useMemo(() => getInsuranceDetailTabs(), [])

  useEffect(() => {
    if (!user?.accessToken || !canReviewInsurance) {
      setInquiries([])
      setListState('idle')
      return
    }

    let ignore = false

    const loadInquiries = async () => {
      setListState('loading')
      setListMessage('')

      try {
        const records = await listInsuranceInquiries({
          accessToken: user.accessToken,
          status: normalizeFilterValue(filters.status),
          paymentStatus: normalizeFilterValue(filters.paymentStatus),
          renewalStatus: normalizeFilterValue(filters.renewalStatus),
        })

        if (ignore) return

        setInquiries(records)
        setListState('loaded')
      } catch (error) {
        if (ignore) return

        setListState('load_failed')
        setListMessage(error?.message || 'Insurance cases could not be loaded.')
      }
    }

    void loadInquiries()

    return () => {
      ignore = true
    }
  }, [canReviewInsurance, filters.paymentStatus, filters.renewalStatus, filters.status, reloadTick, user?.accessToken])

  const filteredInquiries = useMemo(() => {
    const searchNeedle = filters.search.trim().toLowerCase()

    if (!searchNeedle) {
      return inquiries
    }

    return inquiries.filter((inquiry) =>
      [
        inquiry.id,
        inquiry.customerDisplayName,
        inquiry.vehicleLabel,
        inquiry.subject,
        inquiry.purpose,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchNeedle)),
    )
  }, [filters.search, inquiries])

  useEffect(() => {
    if (!inquiries.length) {
      setSelectedInquiryId('')
      return
    }

    if (!inquiries.some((inquiry) => inquiry.id === selectedInquiryId)) {
      setSelectedInquiryId(inquiries[0].id)
    }
  }, [inquiries, selectedInquiryId])

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? null,
    [inquiries, selectedInquiryId],
  )

  const nextStatuses = useMemo(
    () => getAllowedInsuranceStatusTargets(selectedInquiry?.status ?? 'closed'),
    [selectedInquiry?.status],
  )

  useEffect(() => {
    if (!selectedInquiry) {
      previousSelectedInquiryIdRef.current = ''
      if (!inquiries.length) {
        setActiveDetailTab(detailTabs[0]?.key ?? 'overview')
        setDetailState('idle')
        setDetailMessage('')
        setUpdateDraft(DEFAULT_UPDATE_DRAFT)
        setUpdateState('status_update_ready')
        setUpdateMessage('')
      }
      return
    }

    const nextViewState = getNextInsuranceWorkspaceViewState({
      currentActiveDetailTab: workspaceStateRef.current.activeDetailTab,
      currentDetailMessage: workspaceStateRef.current.detailMessage,
      currentDetailState: workspaceStateRef.current.detailState,
      currentUpdateDraft: workspaceStateRef.current.updateDraft,
      currentUpdateMessage: workspaceStateRef.current.updateMessage,
      currentUpdateState: workspaceStateRef.current.updateState,
      detailTabs,
      nextInquiry: selectedInquiry,
      nextStatuses,
      previousInquiryId: previousSelectedInquiryIdRef.current,
    })

    previousSelectedInquiryIdRef.current = selectedInquiry.id
    setActiveDetailTab(nextViewState.activeDetailTab)
    setDetailState(nextViewState.detailState)
    setDetailMessage(nextViewState.detailMessage)
    setUpdateDraft(nextViewState.updateDraft)
    setUpdateState(nextViewState.updateState)
    setUpdateMessage(nextViewState.updateMessage)
  }, [detailTabs, inquiries.length, nextStatuses, selectedInquiry])

  const summaryCards = useMemo(
    () => getInsuranceSummaryCards({ inquiries }),
    [inquiries],
  )

  const tableRows = useMemo(
    () => filteredInquiries.map((inquiry) => buildInsuranceTableRow(inquiry)),
    [filteredInquiries],
  )

  const handleFilterChange = (field) => (event) => {
    const nextValue = event.target.value

    setFilters((current) => ({
      ...current,
      [field]: nextValue,
    }))
  }

  const handleRefreshDetail = async () => {
    if (!selectedInquiry?.id || !user?.accessToken) {
      return
    }

    setDetailState('loading')
    setDetailMessage('')

    try {
      const liveInquiry = await getInsuranceInquiryById({
        inquiryId: selectedInquiry.id,
        accessToken: user.accessToken,
      })

      setInquiries((currentInquiries) =>
        currentInquiries.map((inquiry) => (inquiry.id === liveInquiry.id ? liveInquiry : inquiry)),
      )
      setDetailState('detail_loaded')
      setDetailMessage('Live insurance detail refreshed from the backend.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setDetailState('inquiry_not_found')
      } else if (error instanceof ApiError && error.status === 403) {
        setDetailState('forbidden_role')
      } else {
        setDetailState('load_failed')
      }

      setDetailMessage(error?.message || 'Insurance inquiry detail could not be refreshed.')
    }
  }

  const handleSaveStatus = async () => {
    if (!selectedInquiry?.id) {
      setUpdateState('inquiry_not_found')
      setUpdateMessage('Select a live insurance case before saving workflow changes.')
      return
    }

    if (!user?.accessToken) {
      setUpdateState('update_failed')
      setUpdateMessage('A valid staff session is required before saving workflow changes.')
      return
    }

    setUpdateState('status_update_submitting')
    setUpdateMessage('')

    try {
      const updatedInquiry = await updateInsuranceInquiryStatus({
        inquiryId: selectedInquiry.id,
        status: updateDraft.status,
        documentStatus: updateDraft.documentStatus,
        paymentStatus: updateDraft.paymentStatus,
        renewalStatus: updateDraft.renewalStatus,
        paymentDueAt: updateDraft.paymentDueAt,
        policyExpiryAt: updateDraft.policyExpiryAt,
        renewalDueAt: updateDraft.renewalDueAt,
        assignedStaffId: updateDraft.assignedStaffId,
        reviewNotes: updateDraft.reviewNotes,
        accessToken: user.accessToken,
      })

      setInquiries((currentInquiries) =>
        currentInquiries.map((inquiry) => (inquiry.id === updatedInquiry.id ? updatedInquiry : inquiry)),
      )
      setUpdateState('status_update_saved')
      setUpdateMessage(`Insurance workflow updated to ${formatStatusLabel(updatedInquiry.status)}.`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setUpdateState('inquiry_not_found')
      } else if (error instanceof ApiError && error.status === 403) {
        setUpdateState('forbidden_role')
      } else if (error instanceof ApiError && error.status === 409) {
        setUpdateState('invalid_transition')
      } else {
        setUpdateState('update_failed')
      }

      setUpdateMessage(error?.message || 'Insurance workflow could not be updated.')
    }
  }

  if (!canReviewInsurance) {
    return (
      <div className="space-y-5">
        <BlockingState
          title="Insurance review is adviser/admin only"
          copy="This workspace is reserved for service advisers and super admins. The page also blocks direct navigation for non-authorized roles."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Insurance Review Workspace"
        title="Live Staff Insurance Queue"
        description="Phase-1 insurance cases now load from the staff list contract, with workflow summary cards, queue filters, detail tabs, and follow-up updates in one workspace."
        meta={
          <>
            <span className="badge badge-green">Staff list ready</span>
            <span className="badge badge-orange">Payment follow-up ready</span>
            <span className="badge badge-green">Renewal review ready</span>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = SUMMARY_CARD_ICONS[card.label] ?? ClipboardList
          return <SummaryTile key={card.label} icon={Icon} {...card} />
        })}
      </div>

      <div className="card p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="card-title">Queue Filters</p>
            <p className="mt-1 text-xs text-ink-muted">
              Status filters call the live staff list route. Search narrows the visible table without another request.
            </p>
          </div>
          <button onClick={() => setReloadTick((current) => current + 1)} className="btn-secondary">
            <RefreshCw size={14} />
            Refresh Queue
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="label xl:col-span-1">
            Search
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
              <input
                value={filters.search}
                onChange={handleFilterChange('search')}
                className="input pl-9"
                placeholder="Case id, customer, vehicle, or purpose"
              />
            </div>
          </label>
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={handleFilterChange('status')}
            options={INQUIRY_STATUS_OPTIONS}
          />
          <FilterSelect
            label="Payment"
            value={filters.paymentStatus}
            onChange={handleFilterChange('paymentStatus')}
            options={PAYMENT_STATUS_OPTIONS}
          />
          <FilterSelect
            label="Renewal"
            value={filters.renewalStatus}
            onChange={handleFilterChange('renewalStatus')}
            options={RENEWAL_STATUS_OPTIONS}
          />
        </div>

        {listMessage ? <div className="status-message status-message-danger mt-4">{listMessage}</div> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="table-surface">
          <div className="flex flex-col gap-2 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="card-title">Insurance Case List</p>
              <p className="mt-1 text-xs text-ink-muted">
                Customer, vehicle, and workflow tags stay visible in the main review table.
              </p>
            </div>
            <span className={`badge ${filteredInquiries.length ? 'badge-orange' : 'badge-gray'}`}>
              {filteredInquiries.length} visible case{filteredInquiries.length === 1 ? '' : 's'}
            </span>
          </div>

          {listState === 'loading' ? (
            <div className="px-4 py-8 text-sm text-ink-muted">Loading live insurance cases...</div>
          ) : filteredInquiries.length ? (
            <div className="table-scroll">
              <table className="data-table min-w-[920px]">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Documents</th>
                    <th>Payment</th>
                    <th>Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => {
                    const inquiry = filteredInquiries[index]
                    const isSelected = inquiry.id === selectedInquiryId

                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedInquiryId(inquiry.id)}
                        className={isSelected ? 'bg-[#f07c00]/10' : undefined}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="space-y-1">
                            <p className="font-semibold text-ink-primary">{row.customer}</p>
                            <p className="text-xs text-ink-muted">{inquiry.subject || inquiry.id}</p>
                          </div>
                        </td>
                        <td>{row.vehicle}</td>
                        <td>
                          <WorkflowBadge value={inquiry.status}>{row.status}</WorkflowBadge>
                        </td>
                        <td>
                          <WorkflowBadge value={inquiry.documentStatus}>{row.documentStatus}</WorkflowBadge>
                        </td>
                        <td>
                          <WorkflowBadge value={inquiry.paymentStatus}>{row.paymentStatus}</WorkflowBadge>
                        </td>
                        <td>
                          <WorkflowBadge value={inquiry.renewalStatus}>
                            {row.renewalStatus || formatStatusLabel(inquiry.renewalStatus)}
                          </WorkflowBadge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              title="No cases match the current filters"
              copy="Adjust the live status filters or broaden search to bring cases back into view."
            />
          )}
        </section>

        <div className="space-y-5">
          <div className="card p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="card-title">Case Detail</p>
                <p className="mt-1 text-xs text-ink-muted">
                  The detail workspace is split into helper-driven tabs so overview, documents, payment, renewal, and activity stay predictable.
                </p>
              </div>
              <button
                onClick={handleRefreshDetail}
                disabled={!selectedInquiry || detailState === 'loading'}
                className="btn-secondary"
              >
                {detailState === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh Detail
              </button>
            </div>

            {detailMessage ? (
              <div
                className={`mt-4 ${
                  detailState === 'detail_loaded'
                    ? 'status-message status-message-success'
                    : detailState === 'forbidden_role'
                      ? 'status-message status-message-warning'
                      : 'status-message status-message-danger'
                }`}
              >
                {detailMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {detailTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDetailTab(tab.key)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    activeDetailTab === tab.key
                      ? 'border-[#f07c00] bg-[#f07c00]/10 text-[#a65600]'
                      : 'border-surface-border bg-surface-card text-ink-secondary hover:border-[#f07c00]/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <InsuranceDetailTabContent inquiry={selectedInquiry} tabKey={activeDetailTab} />
            </div>
          </div>

          <div className="card p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="card-title">Workflow Update</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Phase-1 fields stay editable here so staff can move status, document review, payment, and renewal follow-up together.
                </p>
              </div>
              <span className={`badge ${nextStatuses.length ? 'badge-green' : 'badge-gray'}`}>
                {nextStatuses.length ? `${nextStatuses.length} valid next state${nextStatuses.length === 1 ? '' : 's'}` : 'No valid transition'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="label">
                Next Status
                <select
                  value={updateDraft.status}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, status: event.target.value }))
                  }
                  className="select"
                  disabled={!selectedInquiry || !nextStatuses.length}
                >
                  {nextStatuses.length ? (
                    nextStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))
                  ) : (
                    <option value={selectedInquiry?.status ?? 'closed'}>
                      {selectedInquiry ? 'No valid transition available' : 'Select a case first'}
                    </option>
                  )}
                </select>
              </label>

              <FilterSelect
                label="Document Status"
                value={updateDraft.documentStatus}
                onChange={(event) =>
                  setUpdateDraft((current) => ({ ...current, documentStatus: event.target.value }))
                }
                options={DOCUMENT_STATUS_OPTIONS}
                includeAll={false}
                disabled={!selectedInquiry}
              />

              <FilterSelect
                label="Payment Status"
                value={updateDraft.paymentStatus}
                onChange={(event) =>
                  setUpdateDraft((current) => ({ ...current, paymentStatus: event.target.value }))
                }
                options={PAYMENT_STATUS_OPTIONS}
                includeAll={false}
                disabled={!selectedInquiry}
              />

              <FilterSelect
                label="Renewal Status"
                value={updateDraft.renewalStatus}
                onChange={(event) =>
                  setUpdateDraft((current) => ({ ...current, renewalStatus: event.target.value }))
                }
                options={RENEWAL_STATUS_OPTIONS}
                includeAll={false}
                disabled={!selectedInquiry}
              />

              <label className="label">
                Payment Due
                <input
                  type="date"
                  value={updateDraft.paymentDueAt}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, paymentDueAt: event.target.value }))
                  }
                  className="input"
                />
              </label>

              <label className="label">
                Policy Expiry
                <input
                  type="date"
                  value={updateDraft.policyExpiryAt}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, policyExpiryAt: event.target.value }))
                  }
                  className="input"
                />
              </label>

              <label className="label">
                Renewal Due
                <input
                  type="date"
                  value={updateDraft.renewalDueAt}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, renewalDueAt: event.target.value }))
                  }
                  className="input"
                />
              </label>

              <label className="label">
                Assigned Staff Id
                <input
                  value={updateDraft.assignedStaffId}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, assignedStaffId: event.target.value }))
                  }
                  className="input"
                  placeholder="service-adviser-id"
                />
              </label>

              <label className="label md:col-span-2">
                Review Notes
                <textarea
                  value={updateDraft.reviewNotes}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, reviewNotes: event.target.value }))
                  }
                  rows={4}
                  className="input min-h-[120px] resize-y"
                  placeholder="Capture staff notes for the next workflow step."
                />
              </label>
            </div>

            {updateMessage ? (
              <div
                className={`mt-4 ${
                  updateState === 'status_update_saved'
                    ? 'status-message status-message-success'
                    : updateState === 'forbidden_role'
                      ? 'status-message status-message-warning'
                      : 'status-message status-message-danger'
                }`}
              >
                {updateMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleSaveStatus}
                disabled={!selectedInquiry || !nextStatuses.length || updateState === 'status_update_submitting'}
                className="btn-primary"
              >
                {updateState === 'status_update_submitting' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                Save Workflow Update
              </button>
              <span className="badge badge-gray">Status, workflow tags, assignee, due dates, and notes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
